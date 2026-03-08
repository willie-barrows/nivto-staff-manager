package com.nivto.timeclock.sync.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.nivto.timeclock.sync.worker.SyncWorker

/**
 * Broadcast receiver for WiFi connectivity changes
 * Triggers sync when WiFi becomes available
 */
class WifiBroadcastReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "WifiBroadcastReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ConnectivityManager.CONNECTIVITY_ACTION -> {
                handleConnectivityChange(context)
            }
        }
    }
    
    private fun handleConnectivityChange(context: Context) {
        val isWifiConnected = isWifiConnected(context)
        
        Log.d(TAG, "WiFi connectivity changed: connected=$isWifiConnected")
        
        if (isWifiConnected) {
            // WiFi is now connected - trigger sync
            Log.d(TAG, "WiFi connected - triggering sync")
            SyncWorker.triggerImmediateSync(context)
        }
    }
    
    private fun isWifiConnected(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }
}
