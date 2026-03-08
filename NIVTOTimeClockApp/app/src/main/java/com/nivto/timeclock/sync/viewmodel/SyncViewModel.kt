package com.nivto.timeclock.sync.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nivto.timeclock.data.TimeClockDatabase
import com.nivto.timeclock.sync.api.RetrofitClient
import com.nivto.timeclock.sync.repository.PairingRepository
import com.nivto.timeclock.sync.repository.SyncRepository
import com.nivto.timeclock.sync.repository.SyncResult
import com.nivto.timeclock.sync.worker.SyncWorker
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for Sync Settings Screen
 * Manages pairing status, sync operations, and connection state
 */
class SyncViewModel(application: Application) : AndroidViewModel(application) {
    
    val pairingRepository = PairingRepository(application)
    private val database = TimeClockDatabase.getDatabase(application)
    private val retrofitClient = RetrofitClient(pairingRepository)
    private val syncRepository = SyncRepository(
        application,
        database,
        pairingRepository,
        retrofitClient
    )
    
    // State flows
    private val _isPaired = MutableStateFlow(false)
    val isPaired: StateFlow<Boolean> = _isPaired.asStateFlow()
    
    private val _serverUrl = MutableStateFlow("")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()
    
    private val _deviceName = MutableStateFlow("")
    val deviceName: StateFlow<String> = _deviceName.asStateFlow()
    
    private val _pairedAt = MutableStateFlow(0L)
    val pairedAt: StateFlow<Long> = _pairedAt.asStateFlow()
    
    private val _lastSync = MutableStateFlow(0L)
    val lastSync: StateFlow<Long> = _lastSync.asStateFlow()
    
    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount.asStateFlow()
    
    private val _isWifiConnected = MutableStateFlow(false)
    val isWifiConnected: StateFlow<Boolean> = _isWifiConnected.asStateFlow()
    
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()
    
    private val _syncStatus = MutableStateFlow("")
    val syncStatus: StateFlow<String> = _syncStatus.asStateFlow()
    
    init {
        refreshStatus()
        startPeriodicStatusUpdate()
    }
    
    /**
     * Refresh all status information
     */
    fun refreshStatus() {
        viewModelScope.launch {
            // Pairing status
            _isPaired.value = pairingRepository.isPaired()
            _serverUrl.value = pairingRepository.getServerUrl() ?: ""
            _deviceName.value = pairingRepository.getDeviceName()
            _pairedAt.value = pairingRepository.getPairedAt()
            _lastSync.value = pairingRepository.getLastSync()
            
            // WiFi status
            _isWifiConnected.value = syncRepository.isWifiConnected()
            
            // Pending count
            _pendingCount.value = syncRepository.getPendingCount()
        }
    }
    
    /**
     * Start periodic status updates (every 5 seconds)
     */
    private fun startPeriodicStatusUpdate() {
        viewModelScope.launch {
            while (true) {
                delay(5000)
                refreshStatus()
            }
        }
    }
    
    /**
     * Trigger manual sync
     */
    fun triggerManualSync() {
        if (_isSyncing.value) return
        
        viewModelScope.launch {
            _isSyncing.value = true
            _syncStatus.value = "Syncing..."
            
            try {
                // First sync employees
                val empCount = syncRepository.syncEmployees()
                if (empCount > 0) {
                    _syncStatus.value = "Synced $empCount employees"
                }
                
                // Then sync pending events
                val result = syncRepository.syncPendingItems()
                
                when (result) {
                    is SyncResult.Success -> {
                        if (result.synced > 0) {
                            if (empCount > 0) {
                                _syncStatus.value = "✓ Synced $empCount employees + ${result.synced} events"
                            } else {
                                _syncStatus.value = "✓ Synced ${result.synced} events"
                            }
                        } else {
                            if (empCount > 0) {
                                _syncStatus.value = "✓ Synced $empCount employees"
                            } else {
                                _syncStatus.value = "✓ Everything up to date"
                            }
                        }
                        
                        if (result.failed > 0) {
                            _syncStatus.value += " (${result.failed} failed)"
                        }
                    }
                    is SyncResult.Error -> {
                        _syncStatus.value = "Error: ${result.message}"
                    }
                    is SyncResult.NoWifi -> {
                        _syncStatus.value = "No WiFi connection"
                    }
                    is SyncResult.NotPaired -> {
                        _syncStatus.value = "Device not paired"
                    }
                }
                
                // Clear status after 5 seconds
                delay(5000)
                _syncStatus.value = ""
                
            } finally {
                _isSyncing.value = false
                refreshStatus()
            }
        }
    }
    
    /**
     * Unpair device
     */
    fun unpair() {
        pairingRepository.clearPairing()
        SyncWorker.cancel(getApplication())
        refreshStatus()
    }
    
    /**
     * Schedule background sync worker
     */
    fun scheduleBackgroundSync() {
        if (pairingRepository.isPaired()) {
            SyncWorker.schedule(getApplication())
        }
    }
}
