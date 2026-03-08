package com.nivto.timeclock.sync.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nivto.timeclock.sync.viewmodel.SyncViewModel
import java.text.SimpleDateFormat
import java.util.*

/**
 * Sync Settings Screen - Main screen for managing sync with Windows desktop
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncSettingsScreen(
    viewModel: SyncViewModel = viewModel(),
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    var showQRScanner by remember { mutableStateOf(false) }
    var showUnpairDialog by remember { mutableStateOf(false) }
    
    // Observe view model state
    val isPaired by viewModel.isPaired.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()
    val deviceName by viewModel.deviceName.collectAsState()
    val pairedAt by viewModel.pairedAt.collectAsState()
    val lastSync by viewModel.lastSync.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()
    val isWifiConnected by viewModel.isWifiConnected.collectAsState()
    val isSyncing by viewModel.isSyncing.collectAsState()
    val syncStatus by viewModel.syncStatus.collectAsState()
    
    // QR Scanner overlay
    if (showQRScanner) {
        QRScannerScreen(
            pairingRepository = viewModel.pairingRepository,
            onPairingComplete = {
                showQRScanner = false
                viewModel.refreshStatus()
            },
            onCancel = { showQRScanner = false }
        )
        return
    }
    
    // Unpair confirmation dialog
    if (showUnpairDialog) {
        AlertDialog(
            onDismissRequest = { showUnpairDialog = false },
            title = { Text("Unpair Device?") },
            text = { Text("This will remove pairing with the Windows desktop app. You'll need to scan a new QR code to sync again.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.unpair()
                        showUnpairDialog = false
                    }
                ) {
                    Text("Unpair")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUnpairDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sync Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Pairing Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (isPaired) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.errorContainer
                    }
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = if (isPaired) "✅" else "❌",
                            style = MaterialTheme.typography.titleLarge
                        )
                        Text(
                            text = if (isPaired) "Paired" else "Not Paired",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    if (isPaired) {
                        Text("Device: $deviceName", style = MaterialTheme.typography.bodyMedium)
                        Text("Server: $serverUrl", style = MaterialTheme.typography.bodySmall)
                        Text("Paired: ${formatTimestamp(pairedAt)}", style = MaterialTheme.typography.bodySmall)
                    } else {
                        Text("Scan QR code from Windows app to pair", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            
            // WiFi & Sync Status Card
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Connection Status",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    
                    // WiFi Status
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = if (isWifiConnected) "📶" else "📵",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = if (isWifiConnected) "WiFi Connected" else "WiFi Disconnected",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    
                    // Last Sync
                    if (lastSync > 0) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("🔄", style = MaterialTheme.typography.titleMedium)
                            Text(
                                text = "Last sync: ${formatTimestamp(lastSync)}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                    
                    // Pending Count
                    if (pendingCount > 0) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                "⏳",
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                text = "$pendingCount items pending sync",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                    
                    // Sync Status Message
                    if (syncStatus.isNotEmpty()) {
                        Text(
                            text = syncStatus,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
            
            // Actions
            if (!isPaired) {
                Button(
                    onClick = { showQRScanner = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("📷 Scan QR Code to Pair")
                }
            } else {
                // Manual Sync Button
                Button(
                    onClick = { viewModel.triggerManualSync() },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isSyncing && isWifiConnected
                ) {
                    if (isSyncing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(if (isSyncing) "Syncing..." else "🔄 Sync Now")
                }
                
                // Unpair Button
                OutlinedButton(
                    onClick = { showUnpairDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("🔗 Unpair Device")
                }
            }
            
            // Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "About Sync",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "• Clock events automatically sync to Windows desktop when WiFi is available\n" +
                                "• Offline events are queued and synced when connection is restored\n" +
                                "• Background sync runs every 15 minutes as fallback\n" +
                                "• Both devices must be on the same WiFi network",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

/**
 * Format timestamp to readable string
 */
private fun formatTimestamp(timestamp: Long): String {
    if (timestamp == 0L) return "Never"
    val date = Date(timestamp)
    val format = SimpleDateFormat("MMM dd, yyyy h:mm a", Locale.getDefault())
    return format.format(date)
}
