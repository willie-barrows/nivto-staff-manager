package com.nivto.timeclock.ui.screen

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.nivto.timeclock.ui.viewmodel.ExportStatus
import com.nivto.timeclock.ui.viewmodel.ImportStatus
import com.nivto.timeclock.ui.viewmodel.ManagementViewModel
import com.nivto.timeclock.util.LicenseManager
import com.nivto.timeclock.util.UpdateCheckResult
import com.nivto.timeclock.util.UpdateManager
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManagementScreen(
    viewModel: ManagementViewModel,
    onBackClick: () -> Unit,
    onSyncSettingsClick: () -> Unit = {}
) {
    val context = LocalContext.current
    val staffCount by viewModel.staffCount.collectAsState()
    val importStatus by viewModel.importStatus.collectAsState()
    val exportStatus by viewModel.exportStatus.collectAsState()
    val events by viewModel.events.collectAsState()
    
    var selectedTab by remember { mutableStateOf(0) }
    var showClearDialog by remember { mutableStateOf(false) }
    
    val startDate = remember { mutableStateOf(getStartOfMonth()) }
    val endDate = remember { mutableStateOf(System.currentTimeMillis()) }
    
    // File picker for staff CSV import
    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { viewModel.importStaff(it) }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Management Dashboard") },
                navigationIcon = {
                    TextButton(onClick = onBackClick) {
                        Text("← Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Staff") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Export") }
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("History") }
                )
                Tab(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    text = { Text("Updates") }
                )
            }
            
            when (selectedTab) {
                0 -> StaffManagementTab(
                    staffCount = staffCount,
                    importStatus = importStatus,
                    onImportClick = { importLauncher.launch("text/*") },
                    onClearData = { showClearDialog = true },
                    onResetImportStatus = { viewModel.resetImportStatus() },
                    onSyncSettingsClick = onSyncSettingsClick
                )
                1 -> ExportDataTab(
                    startDate = startDate.value,
                    endDate = endDate.value,
                    onStartDateChange = { startDate.value = it },
                    onEndDateChange = { endDate.value = it },
                    exportStatus = exportStatus,
                    onExport = { viewModel.exportAttendance(startDate.value, endDate.value, context) },
                    onShare = { file -> shareFile(context, file) },
                    onResetExportStatus = { viewModel.resetExportStatus() }
                )
                2 -> ClockHistoryTab(
                    events = events,
                    onDeleteEvent = { viewModel.deleteEvent(it) }
                )
                3 -> UpdatesTab(context = context)
            }
        }
    }
    
    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text("Clear All Data") },
            text = { Text("This will delete all staff and clock records. This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.clearAllData()
                        showClearDialog = false
                    }
                ) {
                    Text("Clear", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun StaffManagementTab(
    staffCount: Int,
    importStatus: ImportStatus,
    onImportClick: () -> Unit,
    onClearData: () -> Unit,
    onResetImportStatus: () -> Unit,
    onSyncSettingsClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Active Employees",
                    style = MaterialTheme.typography.titleLarge
                )
                Text(
                    text = "$staffCount",
                    style = MaterialTheme.typography.displayMedium.copy(
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }
        
        Button(
            onClick = onImportClick,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Import Staff from CSV")
        }
        
        Button(
            onClick = onSyncSettingsClick,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.secondary
            )
        ) {
            Text("🔄 Sync Settings")
        }
        
        OutlinedButton(
            onClick = onClearData,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Text("Clear All Data")
        }
        
        when (val status = importStatus) {
            is ImportStatus.Loading -> {
                Text(
                    text = "Processing import...",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
            }
            is ImportStatus.Success -> {
                AlertDialog(
                    onDismissRequest = onResetImportStatus,
                    title = { Text("Success") },
                    text = { Text(status.message) },
                    confirmButton = {
                        TextButton(onClick = onResetImportStatus) {
                            Text("OK")
                        }
                    }
                )
            }
            is ImportStatus.Error -> {
                AlertDialog(
                    onDismissRequest = onResetImportStatus,
                    title = { Text("Import Error") },
                    text = { Text(status.message) },
                    confirmButton = {
                        TextButton(onClick = onResetImportStatus) {
                            Text("OK")
                        }
                    }
                )
            }
            else -> {}
        }
    }
}

@Composable
fun ExportDataTab(
    startDate: Long,
    endDate: Long,
    onStartDateChange: (Long) -> Unit,
    onEndDateChange: (Long) -> Unit,
    exportStatus: ExportStatus,
    onExport: () -> Unit,
    onShare: (File) -> Unit,
    onResetExportStatus: () -> Unit
) {
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Select Date Range",
            style = MaterialTheme.typography.titleMedium
        )
        
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Start Date: ${dateFormat.format(Date(startDate))}")
                Text("End Date: ${dateFormat.format(Date(endDate))}")
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onStartDateChange(getStartOfMonth()) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("This Month")
                    }
                    Button(
                        onClick = { onStartDateChange(getStartOfLastMonth()) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Last Month")
                    }
                }
            }
        }
        
        Button(
            onClick = onExport,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Generate & Share CSV")
        }
        
        when (val status = exportStatus) {
            is ExportStatus.Loading -> {
                Text(
                    text = "Generating CSV...",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
            }
            is ExportStatus.Success -> {
                LaunchedEffect(status) {
                    onShare(status.file)
                    onResetExportStatus()
                }
            }
            is ExportStatus.Error -> {
                AlertDialog(
                    onDismissRequest = onResetExportStatus,
                    title = { Text("Export Error") },
                    text = { Text(status.message) },
                    confirmButton = {
                        TextButton(onClick = onResetExportStatus) {
                            Text("OK")
                        }
                    }
                )
            }
            else -> {}
        }
    }
}

@Composable
fun ClockHistoryTab(
    events: List<com.nivto.timeclock.data.entity.ClockEvent>,
    onDeleteEvent: (com.nivto.timeclock.data.entity.ClockEvent) -> Unit
) {
    val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(events) { event ->
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = event.employeeName,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = event.eventType.name.replace("_", " "),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = dateFormat.format(Date(event.timestamp)),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    IconButton(onClick = { onDeleteEvent(event) }) {
                        Text("×", fontSize = 24.sp)
                    }
                }
            }
        }
    }
}

private fun getStartOfMonth(): Long {
    val calendar = Calendar.getInstance()
    calendar.set(Calendar.DAY_OF_MONTH, 1)
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
}

private fun getStartOfLastMonth(): Long {
    val calendar = Calendar.getInstance()
    calendar.add(Calendar.MONTH, -1)
    calendar.set(Calendar.DAY_OF_MONTH, 1)
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
}

@Composable
fun UpdatesTab(context: Context) {
    val updateManager = remember { UpdateManager(context) }
    val licenseManager = remember { LicenseManager(context) }
    val scope = rememberCoroutineScope()
    
    var licenseStatus by remember { mutableStateOf(licenseManager.getLicenseStatus()) }
    
    val currentVersion = remember {
        try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, android.content.pm.PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            packageInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }
    
    var checkingForUpdates by remember { mutableStateOf(false) }
    var updateCheckResult by remember { mutableStateOf<UpdateCheckResult?>(null) }
    var downloadId by remember { mutableStateOf<Long?>(null) }
    var downloading by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // License Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (licenseStatus.valid) 
                    MaterialTheme.colorScheme.primaryContainer 
                else 
                    MaterialTheme.colorScheme.errorContainer
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "📋 License Status",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    
                    if (licenseStatus.valid) {
                        Surface(
                            color = Color(0xFF27AE60),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = if (licenseStatus.type == "trial") "TRIAL" else "ACTIVE",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    } else {
                        Surface(
                            color = Color(0xFFE74C3C),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = "EXPIRED",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
                
                Text(
                    text = licenseStatus.message,
                    style = MaterialTheme.typography.bodyMedium
                )
                
                if (licenseStatus.type == "trial" && licenseStatus.valid) {
                    Text(
                        text = "Subscribe for ${LicenseManager.SUBSCRIPTION_PRICE}/month after trial ends.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }
                
                if (!licenseStatus.valid || (licenseStatus.valid && licenseStatus.daysRemaining <= 3)) {
                    Button(
                        onClick = { 
                            showSubscriptionInfo(context)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF27AE60)
                        )
                    ) {
                        Text(if (licenseStatus.expired) "Renew Subscription" else "Upgrade Now")
                    }
                }
            }
        }
        
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "App Updates",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = "Current Version: $currentVersion",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                
                Button(
                    onClick = {
                        checkingForUpdates = true
                        scope.launch {
                            updateCheckResult = updateManager.checkForUpdates()
                            checkingForUpdates = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !checkingForUpdates && !downloading
                ) {
                    Text(if (checkingForUpdates) "Checking..." else "Check for Updates")
                }
            }
        }
        
        when (val result = updateCheckResult) {
            is UpdateCheckResult.UpdateAvailable -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "🎉 Update Available!",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        
                        Text(
                            text = "Version: ${result.release.tagName}",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        
                        result.release.body?.let { body ->
                            Text(
                                text = body,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        
                        if (downloadId != null) {
                            Button(
                                onClick = {
                                    downloadId?.let { updateManager.installApk(it) }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Install Update")
                            }
                        } else {
                            Button(
                                onClick = {
                                    val id = updateManager.downloadAndInstallUpdate(result.release)
                                    if (id != null) {
                                        downloadId = id
                                        downloading = true
                                        
                                        updateManager.registerDownloadReceiver(id) {
                                            downloading = false
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !downloading
                            ) {
                                Text(if (downloading) "Downloading..." else "Download Update")
                            }
                        }
                    }
                }
            }
            
            is UpdateCheckResult.NoUpdateAvailable -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "✅ You're Up to Date",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "You have the latest version installed.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
            
            is UpdateCheckResult.Error -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "❌ Update Check Failed",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            text = result.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }
            
            null -> {}
        }
        
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "ℹ️ How Updates Work",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "• Updates are checked from GitHub releases\n" +
                            "• Download happens in the background\n" +
                            "• You'll need to approve the installation\n" +
                            "• Your data will not be affected",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun showSubscriptionInfo(context: Context) {
    android.app.AlertDialog.Builder(context)
        .setTitle("Subscription Details")
        .setMessage(
            "Monthly Fee: ${LicenseManager.SUBSCRIPTION_PRICE}\n" +
            "Includes: Windows + Android apps\n" +
            "Free ${LicenseManager.TRIAL_DAYS}-day trial included\n\n" +
            "Payment Methods:\n" +
            "• Bank Transfer\n" +
            "• EFT\n" +
            "• Credit Card\n\n" +
            "Contact us:\n" +
            "📞 074 353 2291\n" +
            "📧 sales@nivto.com\n\n" +
            "After payment, you'll receive your license key within 24 hours."
        )
        .setPositiveButton("OK", null)
        .show()
}

private fun shareFile(context: Context, file: File) {
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
    )
    
    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    
    context.startActivity(Intent.createChooser(shareIntent, "Share Attendance CSV"))
}
