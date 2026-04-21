package com.nivto.timeclock.sync.repository

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Repository for storing and managing pairing information
 * Uses EncryptedSharedPreferences for secure storage of device token
 */
class PairingRepository(context: Context) {
    
    private val sharedPreferences: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    companion object {
        private const val PREFS_NAME = "sync_pairing_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_PAIRED_AT = "paired_at"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val KEY_IS_PAIRED = "is_paired"
    }
    
    /**
     * Check if device is paired with Windows desktop
     */
    fun isPaired(): Boolean {
        return sharedPreferences.getBoolean(KEY_IS_PAIRED, false)
    }
    
    /**
     * Get server URL (e.g., http://192.168.1.100:8080)
     */
    fun getServerUrl(): String? {
        return sharedPreferences.getString(KEY_SERVER_URL, null)
    }
    
    /**
     * Get device token for API authentication
     */
    fun getDeviceToken(): String? {
        return sharedPreferences.getString(KEY_DEVICE_TOKEN, null)
    }
    
    /**
     * Get device ID (Android Device ID)
     */
    fun getDeviceId(): String? {
        return sharedPreferences.getString(KEY_DEVICE_ID, null)
    }
    
    /**
     * Get device name (e.g., "Samsung Galaxy S21")
     */
    fun getDeviceName(): String {
        return sharedPreferences.getString(KEY_DEVICE_NAME, null) 
            ?: "${Build.MANUFACTURER} ${Build.MODEL}"
    }
    
    /**
     * Get timestamp when device was paired
     */
    fun getPairedAt(): Long {
        return sharedPreferences.getLong(KEY_PAIRED_AT, 0L)
    }
    
    /**
     * Get timestamp of last successful sync
     */
    fun getLastSync(): Long {
        return sharedPreferences.getLong(KEY_LAST_SYNC, 0L)
    }
    
    /**
     * Save pairing information after successful pairing
     */
    fun savePairing(
        serverUrl: String,
        deviceToken: String,
        deviceId: String,
        deviceName: String
    ) {
        sharedPreferences.edit().apply {
            putString(KEY_SERVER_URL, serverUrl)
            putString(KEY_DEVICE_TOKEN, deviceToken)
            putString(KEY_DEVICE_ID, deviceId)
            putString(KEY_DEVICE_NAME, deviceName)
            putLong(KEY_PAIRED_AT, System.currentTimeMillis())
            putBoolean(KEY_IS_PAIRED, true)
            apply()
        }
    }
    
    /**
     * Update last sync timestamp
     */
    fun updateLastSync() {
        sharedPreferences.edit().apply {
            putLong(KEY_LAST_SYNC, System.currentTimeMillis())
            apply()
        }
    }
    
    /**
     * Clear pairing information (unpair device)
     */
    fun clearPairing() {
        sharedPreferences.edit().apply {
            remove(KEY_SERVER_URL)
            remove(KEY_DEVICE_TOKEN)
            remove(KEY_DEVICE_ID)
            remove(KEY_DEVICE_NAME)
            remove(KEY_PAIRED_AT)
            remove(KEY_LAST_SYNC)
            putBoolean(KEY_IS_PAIRED, false)
            apply()
        }
    }
    
    /**
     * Get full pairing info as a data class
     */
    fun getPairingInfo(): PairingInfo? {
        if (!isPaired()) return null
        
        return PairingInfo(
            serverUrl = getServerUrl() ?: return null,
            deviceToken = getDeviceToken() ?: return null,
            deviceId = getDeviceId() ?: return null,
            deviceName = getDeviceName(),
            pairedAt = getPairedAt(),
            lastSync = getLastSync()
        )
    }
}

/**
 * Data class representing complete pairing information
 */
data class PairingInfo(
    val serverUrl: String,
    val deviceToken: String,
    val deviceId: String,
    val deviceName: String,
    val pairedAt: Long,
    val lastSync: Long
)
