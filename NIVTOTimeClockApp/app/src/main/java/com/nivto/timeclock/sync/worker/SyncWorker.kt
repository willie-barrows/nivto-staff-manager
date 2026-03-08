package com.nivto.timeclock.sync.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.nivto.timeclock.data.TimeClockDatabase
import com.nivto.timeclock.sync.api.RetrofitClient
import com.nivto.timeclock.sync.repository.PairingRepository
import com.nivto.timeclock.sync.repository.SyncRepository
import com.nivto.timeclock.sync.repository.SyncResult
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker for periodic background sync
 * Runs every 15 minutes as a fallback when event-driven sync may have missed events
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    companion object {
        private const val TAG = "SyncWorker"
        private const val WORK_NAME = "sync_worker_periodic"
        private const val SYNC_INTERVAL_MINUTES = 15L
        
        /**
         * Schedule periodic sync work
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                SYNC_INTERVAL_MINUTES,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
            
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
            
            Log.d(TAG, "Periodic sync work scheduled (every $SYNC_INTERVAL_MINUTES minutes)")
        }
        
        /**
         * Cancel periodic sync work
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Periodic sync work cancelled")
        }
        
        /**
         * Trigger immediate one-time sync
         */
        fun triggerImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()
            
            WorkManager.getInstance(context).enqueue(syncRequest)
            Log.d(TAG, "Immediate sync triggered")
        }
    }
    
    override suspend fun doWork(): Result {
        Log.d(TAG, "Sync worker started")
        
        return try {
            // Initialize repositories
            val database = TimeClockDatabase.getDatabase(applicationContext)
            val pairingRepository = PairingRepository(applicationContext)
            val retrofitClient = RetrofitClient(pairingRepository)
            val syncRepository = SyncRepository(
                applicationContext,
                database,
                pairingRepository,
                retrofitClient
            )
            
            // Check if paired
            if (!pairingRepository.isPaired()) {
                Log.w(TAG, "Device not paired - skipping sync")
                return Result.success()
            }
            
            // Sync employees from Windows desktop
            try {
                val employeeCount = syncRepository.syncEmployees()
                if (employeeCount > 0) {
                    Log.d(TAG, "Synced $employeeCount employees from desktop")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync employees", e)
                // Continue with clock event sync even if employee sync fails
            }
            
            // Check pending count
            val pendingCount = syncRepository.getPendingCount()
            if (pendingCount == 0) {
                Log.d(TAG, "No pending items to sync")
                return Result.success()
            }
            
            Log.d(TAG, "Starting sync for $pendingCount pending items")
            
            // Perform sync
            val result = syncRepository.syncPendingItems()
            
            when (result) {
                is SyncResult.Success -> {
                    Log.d(TAG, "Sync complete: ${result.synced} synced, ${result.failed} failed")
                    
                    // If some items failed, retry later
                    if (result.failed > 0) {
                        return Result.retry()
                    }
                    
                    return Result.success()
                }
                is SyncResult.Error -> {
                    Log.e(TAG, "Sync error: ${result.message}")
                    return Result.retry()
                }
                is SyncResult.NoWifi -> {
                    Log.w(TAG, "No WiFi connection - skipping sync")
                    return Result.success() // Don't retry, wait for WiFi
                }
                is SyncResult.NotPaired -> {
                    Log.w(TAG, "Not paired - skipping sync")
                    return Result.success()
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Sync worker exception", e)
            Result.retry()
        }
    }
}
