package com.nivto.timeclock.sync.model

import com.google.gson.annotations.SerializedName

/**
 * API Request/Response Models for Windows Desktop Sync
 */

// ============ PAIRING MODELS ============

data class PairingStartResponse(
    val success: Boolean,
    val pairingToken: String,
    val serverUrl: String,
    val expiresIn: Int // seconds
)

data class PairingRequest(
    val deviceId: String,
    val deviceName: String,
    val deviceModel: String,
    val pairingToken: String
)

data class PairingResponse(
    val success: Boolean,
    val deviceToken: String?,
    val message: String?
)

data class PairedDevice(
    val id: String,
    val name: String,
    val model: String,
    val pairedAt: Long,
    val lastSync: Long?
)

data class PairedDevicesResponse(
    val devices: List<PairedDevice>
)

// ============ LICENSE MODELS ============

data class LicenseInfo(
    val type: String, // "trial" or "subscription"
    val expiryDate: String?,
    val daysRemaining: Int,
    val isValid: Boolean,
    val isExpired: Boolean,
    val isTrial: Boolean,
    val message: String
)

data class LicenseStatusResponse(
    val success: Boolean,
    val license: LicenseInfo
)

// ============ QR CODE DATA ============

data class QRCodeData(
    val serverUrl: String,
    val pairingToken: String,
    val version: String,
    val timestamp: Long
)

// ============ EMPLOYEE MODELS ============

data class EmployeeResponse(
    val employeeId: String,
    val employeeName: String,
    val position: String,
    val idNumber: String,
    val rate: String?,
    val rateType: String?,
    val active: Boolean
)

data class EmployeesResponse(
    val employees: List<EmployeeResponse>
)

// ============ CLOCK EVENT MODELS ============

data class ClockInRequest(
    val employeeId: String,
    val timestamp: Long,
    val location: String?
)

data class ClockOutRequest(
    val employeeId: String,
    val timestamp: Long,
    val location: String?
)

data class ClockEventResponse(
    val success: Boolean,
    val message: String?,
    val clockEventId: String?
)

// ============ BATCH SYNC MODELS ============

data class BatchClockEvent(
    val type: String, // "clock-in" or "clock-out"
    val employeeId: String,
    val timestamp: Long,
    val location: String?
)

data class BatchSyncRequest(
    val events: List<BatchClockEvent>
)

data class BatchSyncResult(
    val success: Boolean,
    val successCount: Int,
    val failedCount: Int,
    val errors: List<String>
)

data class BatchSyncResponse(
    val success: Boolean,
    @SerializedName("synced")
    val successCount: Int,
    @SerializedName("failed")
    val failedCount: Int,
    val errors: List<String>? = null
)

// ============ GENERIC RESPONSE ============

data class ApiResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)
