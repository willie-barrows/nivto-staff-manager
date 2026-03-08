package com.nivto.timeclock.sync.api

import com.nivto.timeclock.sync.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API Service for communicating with Windows Desktop Sync Server
 * Base URL format: http://192.168.1.xxx:8080
 */
interface SyncApiService {
    
    /**
     * Health check endpoint
     */
    @GET("api/health")
    suspend fun healthCheck(): Response<ApiResponse>
    
    /**
     * Start pairing mode - generates a 5-minute pairing token
     */
    @POST("api/pairing/start")
    suspend fun startPairing(): Response<PairingStartResponse>
    
    /**
     * Complete pairing - exchange pairing token for permanent device token
     */
    @POST("api/pair")
    suspend fun completePairing(
        @Body request: PairingRequest
    ): Response<PairingResponse>
    
    /**
     * Get list of paired devices (admin endpoint)
     */
    @GET("api/paired-devices")
    suspend fun getPairedDevices(): Response<PairedDevicesResponse>
    
    /**
     * Unpair this device (admin endpoint)
     */
    @DELETE("api/unpair/{deviceId}")
    suspend fun unpairDevice(
        @Path("deviceId") deviceId: String
    ): Response<ApiResponse>
    
    /**
     * Get license status from Windows desktop
     * Requires: Authorization header with device token
     */
    @GET("api/license")
    suspend fun getLicenseStatus(): Response<LicenseStatusResponse>
    
    /**
     * Get list of employees from Windows desktop
     * Requires: Authorization header with device token
     */
    @GET("api/employees")
    suspend fun getEmployees(): Response<EmployeesResponse>
    
    /**
     * Record clock-in event
     * Requires: Authorization header with device token
     */
    @POST("api/clock-in")
    suspend fun clockIn(
        @Body request: ClockInRequest
    ): Response<ClockEventResponse>
    
    /**
     * Record clock-out event
     * Requires: Authorization header with device token
     */
    @POST("api/clock-out")
    suspend fun clockOut(
        @Body request: ClockOutRequest
    ): Response<ClockEventResponse>
    
    /**
     * Batch sync offline events
     * Requires: Authorization header with device token
     */
    @POST("api/sync-batch")
    suspend fun syncBatch(
        @Body request: BatchSyncRequest
    ): Response<BatchSyncResponse>
}
