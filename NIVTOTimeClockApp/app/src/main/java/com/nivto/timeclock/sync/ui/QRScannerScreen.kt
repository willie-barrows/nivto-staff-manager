package com.nivto.timeclock.sync.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.gson.Gson
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.nivto.timeclock.sync.model.QRCodeData
import com.nivto.timeclock.sync.repository.PairingRepository
import com.nivto.timeclock.sync.api.RetrofitClient
import com.nivto.timeclock.sync.model.PairingRequest
import com.nivto.timeclock.sync.worker.SyncWorker
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * QR Code Scanner Screen for pairing with Windows desktop
 * Uses CameraX for camera preview and MLKit for barcode scanning
 */
@Composable
fun QRScannerScreen(
    pairingRepository: PairingRepository,
    onPairingComplete: () -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    
    var scanningEnabled by remember { mutableStateOf(true) }
    var statusMessage by remember { mutableStateOf("Point camera at QR code on Windows desktop") }
    var isProcessing by remember { mutableStateOf(false) }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            statusMessage = "Camera permission required to scan QR code"
        }
    }
    
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }
    
    /**
     * Process scanned QR code and complete pairing
     */
    fun processScanResult(qrData: String) {
        if (!scanningEnabled || isProcessing) return
        
        scanningEnabled = false
        isProcessing = true
        statusMessage = "Processing QR code..."
        
        scope.launch {
            try {
                // Parse QR code data
                val gson = Gson()
                val qrCodeData = gson.fromJson(qrData, QRCodeData::class.java)
                
                // Validate QR code data
                if (qrCodeData.serverUrl.isBlank() || qrCodeData.pairingToken.isBlank()) {
                    throw Exception("Invalid QR code format")
                }
                
                statusMessage = "Connecting to server..."
                
                // Get device info
                val deviceId = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ANDROID_ID
                )
                val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
                
                // Create pairing request
                val pairingRequest = PairingRequest(
                    deviceId = deviceId,
                    deviceName = deviceName,
                    deviceModel = Build.MODEL,
                    pairingToken = qrCodeData.pairingToken
                )
                
                // Call pairing API
                val retrofitClient = RetrofitClient(pairingRepository)
                val apiService = retrofitClient.createApiServiceWithUrl(qrCodeData.serverUrl)
                val response = apiService.completePairing(pairingRequest)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val deviceToken = response.body()?.deviceToken
                    if (deviceToken != null) {
                        // Save pairing info
                        pairingRepository.savePairing(
                            serverUrl = qrCodeData.serverUrl,
                            deviceToken = deviceToken,
                            deviceId = deviceId,
                            deviceName = deviceName
                        )
                        
                        statusMessage = "Syncing employees..."
                        
                        // Sync employees immediately after pairing
                        try {
                            val database = com.nivto.timeclock.data.TimeClockDatabase.getDatabase(context)
                            val syncRepository = com.nivto.timeclock.sync.repository.SyncRepository(
                                context,
                                database,
                                pairingRepository,
                                retrofitClient
                            )
                            
                            val employeeCount = syncRepository.syncEmployees()
                            if (employeeCount > 0) {
                                Log.d("QRScanner", "Synced $employeeCount employees")
                            }
                        } catch (e: Exception) {
                            Log.e("QRScanner", "Failed to sync employees", e)
                        }
                        
                        // Enable automatic sync
                        SyncWorker.schedule(context)
                        SyncWorker.triggerImmediateSync(context)
                        
                        statusMessage = "✓ Paired successfully!"
                        onPairingComplete()
                    } else {
                        throw Exception("Server did not return device token")
                    }
                } else {
                    val errorMsg = response.body()?.message ?: "Pairing failed"
                    throw Exception(errorMsg)
                }
                
            } catch (e: Exception) {
                Log.e("QRScanner", "Pairing error", e)
                statusMessage = "Error: ${e.message}"
                isProcessing = false
                // Re-enable scanning after 3 seconds
                kotlinx.coroutines.delay(3000)
                scanningEnabled = true
                statusMessage = "Point camera at QR code on Windows desktop"
            }
        }
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        if (hasCameraPermission) {
            // Camera preview
            CameraPreview(
                modifier = Modifier.fillMaxSize(),
                scanningEnabled = scanningEnabled,
                onQRCodeDetected = { qrData ->
                    processScanResult(qrData)
                }
            )
            
            // Overlay UI
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top bar with cancel button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Scan QR Code",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White
                    )
                    TextButton(onClick = onCancel) {
                        Text("Cancel", color = Color.White)
                    }
                }
                
                // Status message at bottom
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.Black.copy(alpha = 0.7f)
                    )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isProcessing) "⏳ $statusMessage" else statusMessage,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White
                        )
                    }
                }
            }
            
            // Scanning frame
            if (scanningEnabled) {
                ScanningFrame()
            }
            
        } else {
            // Permission denied UI
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Camera Permission Required",
                    style = MaterialTheme.typography.headlineSmall
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Please grant camera permission to scan QR codes",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = {
                    permissionLauncher.launch(Manifest.permission.CAMERA)
                }) {
                    Text("Grant Permission")
                }
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = onCancel) {
                    Text("Cancel")
                }
            }
        }
    }
}

/**
 * Camera preview component using CameraX
 */
@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
@Composable
fun CameraPreview(
    modifier: Modifier = Modifier,
    scanningEnabled: Boolean,
    onQRCodeDetected: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val barcodeScanner = remember { BarcodeScanning.getClient() }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    
    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }
    
    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            previewView
        },
        modifier = modifier,
        update = { previewView ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    
                    // Preview
                    val preview = Preview.Builder()
                        .build()
                        .also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }
                    
                    // Image analysis for QR scanning
                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                    
                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        if (!scanningEnabled) {
                            imageProxy.close()
                            return@setAnalyzer
                        }
                        
                        try {
                            processImageProxy(imageProxy, barcodeScanner) { qrData ->
                                onQRCodeDetected(qrData)
                            }
                        } catch (e: Exception) {
                            Log.e("CameraPreview", "Image processing error", e)
                            imageProxy.close()
                        }
                    }
                    
                    // Select back camera
                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                    
                    // Unbind all before rebinding
                    cameraProvider.unbindAll()
                    
                    // Bind use cases to lifecycle
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        imageAnalysis
                    )
                    
                } catch (e: Exception) {
                    Log.e("CameraPreview", "Camera initialization failed", e)
                }
                
            }, ContextCompat.getMainExecutor(context))
        }
    )
}

/**
 * Process camera image for barcode detection
 */
private fun processImageProxy(
    imageProxy: ImageProxy,
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    onBarcodeDetected: (String) -> Unit
) {
    try {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(
                mediaImage, 
                imageProxy.imageInfo.rotationDegrees
            )
            
            barcodeScanner.process(image)
                .addOnSuccessListener { barcodes ->
                    try {
                        for (barcode in barcodes) {
                            if (barcode.format == Barcode.FORMAT_QR_CODE) {
                                barcode.rawValue?.let { qrData ->
                                    onBarcodeDetected(qrData)
                                }
                                break
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("QRScanner", "Barcode processing error", e)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e("QRScanner", "Barcode scanning failed", e)
                }
                .addOnCompleteListener {
                    try {
                        imageProxy.close()
                    } catch (e: Exception) {
                        Log.e("QRScanner", "Error closing image proxy", e)
                    }
                }
        } else {
            imageProxy.close()
        }
    } catch (e: Exception) {
        Log.e("QRScanner", "Image proxy processing error", e)
        try {
            imageProxy.close()
        } catch (closeError: Exception) {
            Log.e("QRScanner", "Error closing image proxy in catch", closeError)
        }
    }
}

/**
 * Scanning frame overlay
 */
@Composable
fun ScanningFrame() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(64.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(280.dp)
                .background(Color.Transparent)
        ) {
            // Corner indicators
            Canvas(modifier = Modifier.fillMaxSize()) {
                // Implementation would draw corner brackets here
                // Simplified for now
            }
        }
    }
}
