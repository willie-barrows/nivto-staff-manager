package com.nivto.timeclock

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import com.nivto.timeclock.data.repository.TimeClockRepository
import com.nivto.timeclock.ui.screen.ClockScreen
import com.nivto.timeclock.ui.screen.LicenseScreen
import com.nivto.timeclock.ui.screen.ManagementScreen
import com.nivto.timeclock.ui.screen.PinEntryScreen
import com.nivto.timeclock.ui.theme.NIVTOTimeClockTheme
import com.nivto.timeclock.sync.ui.SyncSettingsScreen
import com.nivto.timeclock.ui.viewmodel.ClockViewModel
import com.nivto.timeclock.ui.viewmodel.ClockViewModelFactory
import com.nivto.timeclock.ui.viewmodel.ManagementViewModel
import com.nivto.timeclock.ui.viewmodel.ManagementViewModelFactory
import com.nivto.timeclock.util.CsvHandler
import com.nivto.timeclock.util.LicenseManager
import com.nivto.timeclock.util.PinManager
import com.nivto.timeclock.sync.repository.PairingRepository
import com.nivto.timeclock.sync.worker.SyncWorker

class MainActivity : ComponentActivity() {
    
    private lateinit var repository: TimeClockRepository
    private lateinit var pinManager: PinManager
    private lateinit var csvHandler: CsvHandler
    private lateinit var licenseManager: LicenseManager
    private lateinit var pairingRepository: PairingRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val database = (application as TimeClockApplication).database
        repository = TimeClockRepository(database.employeeDao(), database.clockEventDao(), database.syncQueueDao())
        pinManager = PinManager(this)
        licenseManager = LicenseManager(this)
        csvHandler = CsvHandler(this)
        pairingRepository = PairingRepository(this)
        
        // Schedule background sync worker if paired
        if (pairingRepository.isPaired()) {
            SyncWorker.schedule(this)
        }
        
        setContent {
            NIVTOTimeClockTheme {
                var showSplash by remember { mutableStateOf(true) }
                var licenseValid by remember { mutableStateOf(false) }
                
                // Check license status after splash
                LaunchedEffect(Unit) {
                    delay(2000) // Show splash for 2 seconds
                    showSplash = false
                    
                    // Check if license is valid
                    val status = licenseManager.getLicenseStatus()
                    licenseValid = status.valid
                }
                
                when {
                    showSplash -> {
                        SplashScreen()
                    }
                    !licenseValid -> {
                        LicenseScreen(
                            onLicenseValid = {
                                licenseValid = true
                            }
                        )
                    }
                    else -> {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.background
                        ) {
                            MainScreen(
                                repository = repository,
                                pinManager = pinManager,
                                csvHandler = csvHandler
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.nivto_logo),
            contentDescription = "NIVTO Logo"
        )
    }
}

@Composable
fun MainScreen(
    repository: TimeClockRepository,
    pinManager: PinManager,
    csvHandler: CsvHandler
) {
    var currentScreen by remember { mutableStateOf(Screen.Clock) }
    
    when (currentScreen) {
        Screen.Clock -> {
            val viewModel: ClockViewModel = viewModel(
                factory = ClockViewModelFactory(repository, context = LocalContext.current)
            )
            ClockScreen(
                viewModel = viewModel,
                onManagementClick = { currentScreen = Screen.PinEntry }
            )
        }
        Screen.PinEntry -> {
            PinEntryScreen(
                pinManager = pinManager,
                onPinVerified = { currentScreen = Screen.Management },
                onCancel = { currentScreen = Screen.Clock }
            )
        }
        Screen.Management -> {
            val viewModel: ManagementViewModel = viewModel(
                factory = ManagementViewModelFactory(repository, csvHandler)
            )
            ManagementScreen(
                viewModel = viewModel,
                onBackClick = { currentScreen = Screen.Clock },
                onSyncSettingsClick = { currentScreen = Screen.SyncSettings }
            )
        }
        Screen.SyncSettings -> {
            SyncSettingsScreen(
                onNavigateBack = { currentScreen = Screen.Management }
            )
        }
    }
}

enum class Screen {
    Clock,
    PinEntry,
    Management,
    SyncSettings
}
