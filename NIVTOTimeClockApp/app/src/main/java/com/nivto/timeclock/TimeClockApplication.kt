package com.nivto.timeclock

import android.app.Application
import com.nivto.timeclock.data.TimeClockDatabase
import com.nivto.timeclock.sync.repository.PairingRepository
import com.nivto.timeclock.sync.worker.SyncWorker

class TimeClockApplication : Application() {
    val database: TimeClockDatabase by lazy { TimeClockDatabase.getDatabase(this) }
    
    override fun onCreate() {
        super.onCreate()
        
        // Auto-schedule sync if device is paired
        val pairingRepository = PairingRepository(this)
        if (pairingRepository.isPaired()) {
            SyncWorker.schedule(this)
        }
    }
}
