package com.nivto.timeclock.util

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*

/**
 * Manages licensing and subscription for the app
 * - 5-day free trial on first launch
 * - R349/month subscription after trial
 * - Validates license keys
 */
class LicenseManager(private val context: Context) {
    
    companion object {
        private const val PREFS_NAME = "license_prefs"
        private const val KEY_LICENSE_TYPE = "license_type"
        private const val KEY_START_DATE = "start_date"
        private const val KEY_EXPIRY_DATE = "expiry_date"
        private const val KEY_LICENSE_KEY = "license_key"
        private const val KEY_SIGNATURE = "signature"
        
        const val TRIAL_DAYS = 5
        const val SUBSCRIPTION_PRICE = "R349"
        
        const val TYPE_NONE = "none"
        const val TYPE_TRIAL = "trial"
        const val TYPE_SUBSCRIPTION = "subscription"
    }
    
    private val prefs: SharedPreferences by lazy {
        // For debug builds, use regular SharedPreferences to avoid keystore issues
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    data class LicenseStatus(
        val hasLicense: Boolean,
        val type: String,
        val valid: Boolean,
        val expired: Boolean = false,
        val daysRemaining: Int = 0,
        val expiryDate: String? = null,
        val message: String
    )
    
    /**
     * Initialize with permanent subscription (no trial)
     */
    fun initializeTrial(): LicenseStatus {
        val now = Calendar.getInstance()
        val expiryDate = Calendar.getInstance()
        expiryDate.add(Calendar.YEAR, 10) // 10 years permanent license
        
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val startDateStr = dateFormat.format(now.time)
        val expiryDateStr = dateFormat.format(expiryDate.time)
        
        prefs.edit().apply {
            putString(KEY_LICENSE_TYPE, TYPE_SUBSCRIPTION)
            putString(KEY_START_DATE, startDateStr)
            putString(KEY_EXPIRY_DATE, expiryDateStr)
            putString(KEY_LICENSE_KEY, "PERMANENT")
            putString(KEY_SIGNATURE, generateSignature(TYPE_SUBSCRIPTION, startDateStr, expiryDateStr, "PERMANENT"))
            apply()
        }
        
        return getLicenseStatus()
    }
    
    /**
     * Save subscription license
     */
    fun saveSubscriptionLicense(key: String, expiryDate: Date? = null): Boolean {
        val now = Calendar.getInstance()
        val expiry = expiryDate ?: run {
            val cal = Calendar.getInstance()
            cal.add(Calendar.MONTH, 1)
            cal.time
        }
        
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val startDateStr = dateFormat.format(now.time)
        val expiryDateStr = dateFormat.format(expiry)
        
        prefs.edit().apply {
            putString(KEY_LICENSE_TYPE, TYPE_SUBSCRIPTION)
            putString(KEY_START_DATE, startDateStr)
            putString(KEY_EXPIRY_DATE, expiryDateStr)
            putString(KEY_LICENSE_KEY, key)
            putString(KEY_SIGNATURE, generateSignature(TYPE_SUBSCRIPTION, startDateStr, expiryDateStr, key))
            apply()
        }
        
        return true
    }
    
    /**
     * Validate and activate subscription key
     * Format: NIVTO-SUB-YYYYMMDD-XXXXX
     */
    fun activateSubscription(key: String): Pair<Boolean, String> {
        val parts = key.split("-")
        if (parts.size != 4 || parts[0] != "NIVTO" || parts[1] != "SUB") {
            return Pair(false, "Invalid license key format")
        }
        
        try {
            val expiryStr = parts[2] // YYYYMMDD
            val year = expiryStr.substring(0, 4).toInt()
            val month = expiryStr.substring(4, 6).toInt()
            val day = expiryStr.substring(6, 8).toInt()
            
            val calendar = Calendar.getInstance()
            calendar.set(year, month - 1, day, 23, 59, 59)
            val expiryDate = calendar.time
            
            val now = Date()
            if (now.after(expiryDate)) {
                return Pair(false, "License key has expired")
            }
            
            saveSubscriptionLicense(key, expiryDate)
            return Pair(true, "Subscription activated successfully")
        } catch (e: Exception) {
            return Pair(false, "Invalid license key format")
        }
    }
    
    /**
     * Get current license status
     */
    fun getLicenseStatus(): LicenseStatus {
        val type = prefs.getString(KEY_LICENSE_TYPE, null)
        
        // First launch - initialize trial
        if (type == null) {
            return initializeTrial()
        }
        
        val startDateStr = prefs.getString(KEY_START_DATE, null)
        val expiryDateStr = prefs.getString(KEY_EXPIRY_DATE, null)
        val licenseKey = prefs.getString(KEY_LICENSE_KEY, null)
        val signature = prefs.getString(KEY_SIGNATURE, null)
        
        // Validate signature
        val expectedSignature = generateSignature(type, startDateStr, expiryDateStr, licenseKey)
        if (signature != expectedSignature) {
            return LicenseStatus(
                hasLicense = true,
                type = type,
                valid = false,
                message = "Invalid license signature"
            )
        }
        
        // Check expiry
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val now = Date()
        val expiryDate = try {
            dateFormat.parse(expiryDateStr ?: "")
        } catch (e: Exception) {
            null
        }
        
        if (expiryDate == null) {
            return LicenseStatus(
                hasLicense = true,
                type = type,
                valid = false,
                message = "Invalid expiry date"
            )
        }
        
        val daysRemaining = ((expiryDate.time - now.time) / (1000 * 60 * 60 * 24)).toInt() + 1
        val isExpired = now.after(expiryDate)
        
        return if (isExpired) {
            LicenseStatus(
                hasLicense = true,
                type = type,
                valid = false,
                expired = true,
                daysRemaining = 0,
                expiryDate = expiryDateStr,
                message = if (type == TYPE_TRIAL) "Trial expired" else "Subscription expired"
            )
        } else {
            val message = when (type) {
                TYPE_TRIAL -> "Trial: $daysRemaining day${if (daysRemaining != 1) "s" else ""} remaining"
                TYPE_SUBSCRIPTION -> {
                    val displayDate = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(expiryDate)
                    "Subscription active until $displayDate"
                }
                else -> "Unknown license type"
            }
            
            LicenseStatus(
                hasLicense = true,
                type = type,
                valid = true,
                expired = false,
                daysRemaining = daysRemaining.coerceAtLeast(0),
                expiryDate = expiryDateStr,
                message = message
            )
        }
    }
    
    /**
     * Generate signature for license validation
     */
    private fun generateSignature(type: String, startDate: String?, expiryDate: String?, key: String?): String {
        val data = "$type|$startDate|$expiryDate|$key|${getDeviceId()}"
        return sha256(data)
    }
    
    /**
     * Get device identifier
     */
    private fun getDeviceId(): String {
        return android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "unknown"
    }
    
    /**
     * SHA-256 hash
     */
    private fun sha256(input: String): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray())
            .joinToString("") { "%02x".format(it) }
    }
    
    /**
     * Clear license (for testing/reset)
     */
    fun clearLicense() {
        prefs.edit().clear().apply()
    }
}
