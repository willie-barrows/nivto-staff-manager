package com.nivto.timeclock.sync.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.nivto.timeclock.data.TimeClockDatabase
import com.nivto.timeclock.data.entity.Employee
import com.nivto.timeclock.sync.api.RetrofitClient
import com.nivto.timeclock.sync.api.SyncApiService
import com.nivto.timeclock.sync.data.SyncQueueItem
import com.nivto.timeclock.sync.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Repository for sync operations between Android and Windows desktop
 * Manages offline queue, sync status, and API communication
 */
class SyncRepository(
    private val context: Context,
    private val database: TimeClockDatabase,
    private val pairingRepository: PairingRepository,
    private val retrofitClient: RetrofitClient
) {
    
    private val syncQueueDao = database.syncQueueDao()
    private val employeeDao = database.employeeDao()
    
    companion object {
        private const val TAG = "SyncRepository"
        private const val MAX_BATCH_SIZE = 50
        private const val MAX_RETRY_ATTEMPTS = 3
    }
    
    /**
     * Check if device has WiFi connectivity
     */
    fun isWifiConnected(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }
    
    /**
     * Check if sync is available (paired + WiFi connected)
     */
    fun isSyncAvailable(): Boolean {
        return pairingRepository.isPaired() && isWifiConnected()
    }
    
    /**
     * Check license status from Windows desktop
     * Returns license info or null if check fails
     */
    suspend fun checkLicenseStatus(): LicenseInfo? = withContext(Dispatchers.IO) {
        try {
            val apiService = retrofitClient.getApiService() ?: return@withContext null
            val response = apiService.getLicenseStatus()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val license = response.body()?.license
                Log.d(TAG, "License status: ${license?.message} (${license?.daysRemaining} days remaining)")
                return@withContext license
            } else {
                Log.w(TAG, "Failed to check license: ${response.code()}")
                return@withContext null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking license", e)
            return@withContext null
        }
    }
    
    /**Sync employees from Windows desktop to local database
     * Returns number of employees synced, or -1 on error
     */
    suspend fun syncEmployees(): Int = withContext(Dispatchers.IO) {
        try {
            val apiService = retrofitClient.getApiService() ?: return@withContext -1
            val response = apiService.getEmployees()
            
            if (response.isSuccessful && response.body() != null) {
                val employeesResponse = response.body()!!.employees
                
                if (employeesResponse.isEmpty()) {
                    Log.w(TAG, "No employees received from server")
                    return@withContext 0
                }
                
                // Map API response to local Employee entity
                val employees = employeesResponse.map { apiEmployee ->
                    Employee(
                        employeeId = apiEmployee.employeeId,
                        employeeName = apiEmployee.employeeName,
                        position = apiEmployee.position,
                        idNumber = apiEmployee.idNumber,
                        active = apiEmployee.active
                    )
                }
                
                // Replace all employees in database
                employeeDao.deleteAll()
                employeeDao.insertEmployees(employees)
                
                Log.d(TAG, "Successfully synced ${employees.size} employees")
                return@withContext employees.size
            } else {
                Log.w(TAG, "Failed to fetch employees: ${response.code()}")
                return@withContext -1
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing employees", e)
            return@withContext -1
        }
    }
    
    /**
     * 
     * Add clock event to sync queue
     */
    suspend fun queueClockEvent(
        eventType: String,
        employeeId: String,
        timestamp: Long,
        location: String? = null
    ): Long = withContext(Dispatchers.IO) {
        val item = SyncQueueItem(
            eventType = eventType,
            employeeId = employeeId,
            timestamp = timestamp,
            location = location
        )
        return@withContext syncQueueDao.insert(item)
    }
    
    /**
     * Queue clock-in event
     */
    suspend fun queueClockIn(employeeId: String, timestamp: Long, location: String? = null): Long {
        return queueClockEvent("clock-in", employeeId, timestamp, location)
    }
    
    /**
     * Queue clock-out event
     */
    suspend fun queueClockOut(employeeId: String, timestamp: Long, location: String? = null): Long {
        return queueClockEvent("clock-out", employeeId, timestamp, location)
    }
    
    /**
     * Get count of pending sync items
     */
    suspend fun getPendingCount(): Int = withContext(Dispatchers.IO) {
        return@withContext syncQueueDao.getPendingCount()
    }
    
    /**
     * Sync all pending items to Windows desktop
     * Returns true if successful, false if any items failed
     */
    suspend fun syncPendingItems(): SyncResult = withContext(Dispatchers.IO) {
        try {
            // Check if sync is available
            if (!pairingRepository.isPaired()) {
                return@withContext SyncResult.NotPaired
            }
            
            if (!isWifiConnected()) {
                return@withContext SyncResult.NoWifi
            }
            
            // Get pending items
            val pendingItems = syncQueueDao.getPendingItemsLimited(MAX_BATCH_SIZE)
            
            if (pendingItems.isEmpty()) {
                return@withContext SyncResult.Success(0, 0)
            }
            
            Log.d(TAG, "Syncing ${pendingItems.size} pending items")
            
            // Get API service
            val apiService = retrofitClient.getApiService()
                ?: return@withContext SyncResult.NotPaired
            
            var successCount = 0
            var failureCount = 0
            
            // Try batch sync first if we have 10+ items
            if (pendingItems.size >= 10) {
                val batchResult = batchSync(apiService, pendingItems)
                when (batchResult) {
                    is SyncResult.Success -> {
                        successCount += batchResult.synced
                        failureCount += batchResult.failed
                        
                        // Update last sync timestamp
                        if (successCount > 0) {
                            pairingRepository.updateLastSync()
                        }
                        
                        return@withContext batchResult
                    }
                    else -> {
                        // Batch sync failed, fall back to individual sync
                        Log.w(TAG, "Batch sync failed, falling back to individual sync")
                    }
                }
            }
            
            // Individual sync for each item
            for (item in pendingItems) {
                try {
                    // Skip if too many attempts
                    if (item.syncAttempts >= MAX_RETRY_ATTEMPTS) {
                        Log.w(TAG, "Skipping item ${item.id} - max retry attempts reached")
                        failureCount++
                        continue
                    }
                    
                    // Sync individual item
                    val success = when (item.eventType) {
                        "clock-in" -> syncClockIn(apiService, item)
                        "clock-out" -> syncClockOut(apiService, item)
                        else -> {
                            Log.w(TAG, "Unknown event type: ${item.eventType}")
                            false
                        }
                    }
                    
                    if (success) {
                        // Mark as synced
                        syncQueueDao.markAsSynced(item.id)
                        successCount++
                    } else {
                        // Record failed attempt
                        syncQueueDao.recordSyncAttempt(
                            id = item.id,
                            timestamp = System.currentTimeMillis(),
                            error = "Sync failed"
                        )
                        failureCount++
                    }
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error syncing item ${item.id}", e)
                    syncQueueDao.recordSyncAttempt(
                        id = item.id,
                        timestamp = System.currentTimeMillis(),
                        error = e.message
                    )
                    failureCount++
                }
            }
            
            // Update last sync timestamp if any items succeeded
            if (successCount > 0) {
                pairingRepository.updateLastSync()
            }
            
            // Clean up old synced items (older than 7 days)
            val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)
            syncQueueDao.deleteSyncedOlderThan(sevenDaysAgo)
            
            return@withContext SyncResult.Success(successCount, failureCount)
            
        } catch (e: Exception) {
            Log.e(TAG, "Sync error", e)
            return@withContext SyncResult.Error(e.message ?: "Unknown error")
        }
    }
    
    /**
     * Batch sync multiple items at once
     */
    private suspend fun batchSync(
        apiService: SyncApiService,
        items: List<SyncQueueItem>
    ): SyncResult {
        try {
            val batchEvents = items.map { item ->
                BatchClockEvent(
                    type = item.eventType,
                    employeeId = item.employeeId,
                    timestamp = item.timestamp,
                    location = item.location
                )
            }
            
            val request = BatchSyncRequest(events = batchEvents)
            val response = apiService.syncBatch(request)
            
            if (response.isSuccessful && response.body() != null) {
                val result = response.body()!!
                
                // Mark all as synced (simplified - ideally we'd track individual successes)
                if (result.success) {
                    items.forEach { item ->
                        syncQueueDao.markAsSynced(item.id)
                    }
                }
                
                return SyncResult.Success(result.successCount, result.failedCount)
            } else {
                return SyncResult.Error("Batch sync failed: ${response.code()}")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Batch sync error", e)
            return SyncResult.Error(e.message ?: "Unknown error")
        }
    }
    
    /**
     * Sync individual clock-in event
     */
    private suspend fun syncClockIn(
        apiService: SyncApiService,
        item: SyncQueueItem
    ): Boolean {
        val request = ClockInRequest(
            employeeId = item.employeeId,
            timestamp = item.timestamp,
            location = item.location
        )
        
        val response = apiService.clockIn(request)
        return response.isSuccessful && response.body()?.success == true
    }
    
    /**
     * Sync individual clock-out event
     */
    private suspend fun syncClockOut(
        apiService: SyncApiService,
        item: SyncQueueItem
    ): Boolean {
        val request = ClockOutRequest(
            employeeId = item.employeeId,
            timestamp = item.timestamp,
            location = item.location
        )
        
        val response = apiService.clockOut(request)
        return response.isSuccessful && response.body()?.success == true
    }
    
    /**
     * Fetch employees from Windows desktop
     * Returns list of employees or null on failure
     */
    suspend fun fetchEmployees(): List<EmployeeResponse>? = withContext(Dispatchers.IO) {
        try {
            val apiService = retrofitClient.getApiService() ?: return@withContext null
            val response = apiService.getEmployees()
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.employees
            } else {
                Log.e(TAG, "Fetch employees failed: ${response.code()}")
                return@withContext null
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching employees", e)
            return@withContext null
        }
    }
    
    /**
     * Test connection to Windows desktop
     */
    suspend fun testConnection(): Boolean = withContext(Dispatchers.IO) {
        try {
            val apiService = retrofitClient.getApiService() ?: return@withContext false
            val response = apiService.healthCheck()
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            Log.e(TAG, "Connection test failed", e)
            return@withContext false
        }
    }
}

/**
 * Sealed class representing sync result
 */
sealed class SyncResult {
    data class Success(val synced: Int, val failed: Int) : SyncResult()
    data class Error(val message: String) : SyncResult()
    object NotPaired : SyncResult()
    object NoWifi : SyncResult()
}
