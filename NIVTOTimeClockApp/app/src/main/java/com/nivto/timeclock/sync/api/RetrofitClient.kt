package com.nivto.timeclock.sync.api

import com.nivto.timeclock.sync.repository.PairingRepository
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Retrofit Client for Windows Desktop Sync API
 * Manages HTTP client configuration and API service creation
 */
class RetrofitClient(private val pairingRepository: PairingRepository) {
    
    private var retrofit: Retrofit? = null
    
    companion object {
        private const val DEFAULT_TIMEOUT = 30L // seconds
    }
    
    /**
     * Auth interceptor - adds device token to all requests (except pairing endpoints)
     */
    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val url = original.url.toString()
        
        // Skip auth for pairing endpoints
        if (url.contains("/api/pairing/") || url.contains("/api/pair") || url.contains("/api/health")) {
            return@Interceptor chain.proceed(original)
        }
        
        // Add device token to Authorization header
        val token = pairingRepository.getDeviceToken()
        if (token != null) {
            val request = original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
            chain.proceed(request)
        } else {
            // No token available - proceed without auth (will likely fail with 401)
            chain.proceed(original)
        }
    }
    
    /**
     * Logging interceptor for debugging
     */
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    /**
     * Create OkHttpClient with interceptors
     */
    private fun createOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(DEFAULT_TIMEOUT, TimeUnit.SECONDS)
            .build()
    }
    
    /**
     * Get or create Retrofit instance
     * Base URL is loaded from PairingRepository
     */
   private fun getRetrofit(): Retrofit? {
        val serverUrl = pairingRepository.getServerUrl()
        
        // If no server URL is configured, return null
        if (serverUrl.isNullOrBlank()) {
            return null
        }
        
        // Ensure URL ends with /
        val baseUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
        
        // Create new Retrofit instance only if needed
        if (retrofit == null || retrofit?.baseUrl()?.toString() != baseUrl) {
            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(createOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        
        return retrofit
    }
    
    /**
     * Create Retrofit instance with custom base URL (for pairing)
     * Used when pairing with a new server
     */
    fun createRetrofitWithUrl(serverUrl: String): Retrofit {
        val baseUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
        
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(createOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    /**
     * Get API service instance
     * Returns null if device is not paired
     */
    fun getApiService(): SyncApiService? {
        return getRetrofit()?.create(SyncApiService::class.java)
    }
    
    /**
     * Create API service with custom URL (for pairing)
     */
    fun createApiServiceWithUrl(serverUrl: String): SyncApiService {
        return createRetrofitWithUrl(serverUrl).create(SyncApiService::class.java)
    }
    
    /**
     * Check if client is ready (server URL is configured)
     */
    fun isReady(): Boolean {
        return !pairingRepository.getServerUrl().isNullOrBlank()
    }
}
