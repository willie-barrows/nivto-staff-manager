package com.nivto.timeclock.util

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class PinManager(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "nivto_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    companion object {
        private const val KEY_PIN_HASH = "pin_hash"
        private const val KEY_PIN_SET = "pin_set"
        private const val KEY_FAILED_ATTEMPTS = "failed_attempts"
        private const val KEY_LOCKOUT_UNTIL = "lockout_until"
        private const val MAX_ATTEMPTS = 3
        private const val LOCKOUT_DURATION = 30 * 1000L // 30 seconds
    }
    
    fun isPinSet(): Boolean {
        return sharedPreferences.getBoolean(KEY_PIN_SET, false)
    }
    
    fun setPin(pin: String) {
        val hash = hashPin(pin)
        sharedPreferences.edit()
            .putString(KEY_PIN_HASH, hash)
            .putBoolean(KEY_PIN_SET, true)
            .putInt(KEY_FAILED_ATTEMPTS, 0)
            .apply()
    }
    
    fun verifyPin(pin: String): Boolean {
        if (isLockedOut()) {
            return false
        }
        
        val storedHash = sharedPreferences.getString(KEY_PIN_HASH, "")
        val inputHash = hashPin(pin)
        
        return if (storedHash == inputHash) {
            // Reset failed attempts on successful verification
            sharedPreferences.edit()
                .putInt(KEY_FAILED_ATTEMPTS, 0)
                .apply()
            true
        } else {
            incrementFailedAttempts()
            false
        }
    }
    
    private fun incrementFailedAttempts() {
        val attempts = sharedPreferences.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
        sharedPreferences.edit()
            .putInt(KEY_FAILED_ATTEMPTS, attempts)
            .apply()
        
        if (attempts >= MAX_ATTEMPTS) {
            val lockoutUntil = System.currentTimeMillis() + LOCKOUT_DURATION
            sharedPreferences.edit()
                .putLong(KEY_LOCKOUT_UNTIL, lockoutUntil)
                .apply()
        }
    }
    
    fun isLockedOut(): Boolean {
        val lockoutUntil = sharedPreferences.getLong(KEY_LOCKOUT_UNTIL, 0)
        if (lockoutUntil > System.currentTimeMillis()) {
            return true
        }
        
        // Clear lockout if expired
        if (lockoutUntil > 0) {
            sharedPreferences.edit()
                .putInt(KEY_FAILED_ATTEMPTS, 0)
                .putLong(KEY_LOCKOUT_UNTIL, 0)
                .apply()
        }
        
        return false
    }
    
    fun getLockoutTimeRemaining(): Long {
        val lockoutUntil = sharedPreferences.getLong(KEY_LOCKOUT_UNTIL, 0)
        val remaining = lockoutUntil - System.currentTimeMillis()
        return if (remaining > 0) remaining else 0
    }
    
    fun getFailedAttempts(): Int {
        return sharedPreferences.getInt(KEY_FAILED_ATTEMPTS, 0)
    }
    
    fun resetPin() {
        sharedPreferences.edit()
            .remove(KEY_PIN_HASH)
            .putBoolean(KEY_PIN_SET, false)
            .putInt(KEY_FAILED_ATTEMPTS, 0)
            .putLong(KEY_LOCKOUT_UNTIL, 0)
            .apply()
    }
    
    private fun hashPin(pin: String): String {
        // Simple hash for PIN (in production, use stronger hashing like BCrypt)
        return pin.hashCode().toString()
    }
}
