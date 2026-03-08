package com.nivto.timeclock.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nivto.timeclock.ui.viewmodel.ClockUiState
import com.nivto.timeclock.ui.viewmodel.ClockViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun ClockScreen(
    viewModel: ClockViewModel,
    onManagementClick: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val enteredDigits by viewModel.enteredDigits.collectAsState()
    
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 32.dp)
            ) {
                Text(
                    text = "NIVTO",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 48.sp,
                        color = Color(0xFF00E5FF) // Cyan color matching logo
                    )
                )
                Text(
                    text = "Staff Management",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Enter 6 digits: Birth Date (YYMMDD) or Staff ID",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            // Display field
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (enteredDigits.isEmpty()) "______" else enteredDigits.padEnd(6, '_'),
                        style = MaterialTheme.typography.displayMedium.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 8.sp
                        )
                    )
                }
            }
            
            // Numeric keypad
            Column(
                modifier = Modifier.padding(vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Rows 1-3
                for (row in 0..2) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        for (col in 1..3) {
                            val number = row * 3 + col
                            NumberButton(
                                number = number.toString(),
                                onClick = { viewModel.onDigitPressed(number.toString()) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
                
                // Bottom row: Clear, 0, Backspace
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { viewModel.onClear() },
                        modifier = Modifier.weight(1f).height(70.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text("Clear", fontSize = 18.sp)
                    }
                    
                    NumberButton(
                        number = "0",
                        onClick = { viewModel.onDigitPressed("0") },
                        modifier = Modifier.weight(1f)
                    )
                    
                    Button(
                        onClick = { viewModel.onBackspace() },
                        modifier = Modifier.weight(1f).height(70.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Text("⌫", fontSize = 24.sp)
                    }
                }
            }
            
            // Clock In/Out buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Button(
                    onClick = { 
                        try {
                            viewModel.clockIn()
                        } catch (e: Exception) {
                            android.util.Log.e("ClockScreen", "Clock In button error: ${e.message}", e)
                        }
                    },
                    modifier = Modifier.weight(1f).height(70.dp),
                    enabled = enteredDigits.length == 6 && uiState !is ClockUiState.Loading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50) // Green
                    )
                ) {
                    Text("Clock In", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
                
                Button(
                    onClick = { 
                        try {
                            viewModel.clockOut()
                        } catch (e: Exception) {
                            android.util.Log.e("ClockScreen", "Clock Out button error: ${e.message}", e)
                        }
                    },
                    modifier = Modifier.weight(1f).height(70.dp),
                    enabled = enteredDigits.length == 6 && uiState !is ClockUiState.Loading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFF9800) // Orange
                    )
                ) {
                    Text("Clock Out", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
            
            // Management button
            TextButton(
                onClick = onManagementClick,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Text("Management Access", color = MaterialTheme.colorScheme.primary)
            }
        }
        
        // Overlays for different states
        when (val state = uiState) {
            is ClockUiState.Success -> {
                SuccessOverlay(
                    message = state.message,
                    employeeName = state.employeeName,
                    timestamp = state.timestamp,
                    onDismiss = { viewModel.onClear() }
                )
            }
            is ClockUiState.Error -> {
                ErrorDialog(
                    message = state.message,
                    onDismiss = { viewModel.onClear() }
                )
            }
            is ClockUiState.MultipleMatches -> {
                EmployeeSelectionDialog(
                    employees = state.employees,
                    isClockIn = state.isClockIn,
                    onSelect = { employee -> viewModel.selectEmployee(employee, state.isClockIn) },
                    onDismiss = { viewModel.onClear() }
                )
            }
            is ClockUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "Processing...",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF00E5FF)
                        )
                    }
                }
            }
            else -> {}
        }
    }
}

@Composable
fun NumberButton(
    number: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(70.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Text(
            text = number,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun SuccessOverlay(
    message: String,
    employeeName: String,
    timestamp: Long,
    onDismiss: () -> Unit
) {
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    var isDismissed by remember { mutableStateOf(false) }
    
    LaunchedEffect(key1 = message, key2 = employeeName) {
        try {
            kotlinx.coroutines.delay(3000)
            if (!isDismissed) {
                isDismissed = true
                onDismiss()
            }
        } catch (e: Exception) {
            android.util.Log.e("SuccessOverlay", "Error in auto-dismiss: ${e.message}", e)
        }
    }
    
    val handleClick: () -> Unit = {
        if (!isDismissed) {
            isDismissed = true
            try {
                onDismiss()
            } catch (e: Exception) {
                android.util.Log.e("SuccessOverlay", "Error in manual dismiss: ${e.message}", e)
            }
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF4CAF50).copy(alpha = 0.95f))
            .clickable(onClick = handleClick),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "✓",
                fontSize = 120.sp,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = message,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = employeeName,
                fontSize = 28.sp,
                color = Color.White,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "at ${timeFormat.format(Date(timestamp))}",
                fontSize = 24.sp,
                color = Color.White.copy(alpha = 0.9f)
            )
        }
    }
}

@Composable
fun ErrorDialog(
    message: String,
    onDismiss: () -> Unit
) {
    var isDismissed by remember { mutableStateOf(false) }
    
    val handleDismiss: () -> Unit = {
        if (!isDismissed) {
            isDismissed = true
            try {
                onDismiss()
            } catch (e: Exception) {
                android.util.Log.e("ErrorDialog", "Error dismissing: ${e.message}", e)
            }
        }
    }
    
    AlertDialog(
        onDismissRequest = handleDismiss,
        title = { Text("Error") },
        text = { Text(message) },
        confirmButton = {
            TextButton(onClick = handleDismiss) {
                Text("OK")
            }
        }
    )
}

@Composable
fun EmployeeSelectionDialog(
    employees: List<com.nivto.timeclock.data.entity.Employee>,
    isClockIn: Boolean,
    onSelect: (com.nivto.timeclock.data.entity.Employee) -> Unit,
    onDismiss: () -> Unit
) {
    var isHandled by remember { mutableStateOf(false) }
    
    val handleSelect: (com.nivto.timeclock.data.entity.Employee) -> Unit = { employee ->
        if (!isHandled) {
            isHandled = true
            try {
                android.util.Log.d("EmployeeSelectionDialog", "Selected employee: ${employee.employeeName} (ID: ${employee.employeeId})")
                onSelect(employee)
            } catch (e: Exception) {
                android.util.Log.e("EmployeeSelectionDialog", "Error selecting employee: ${e.message}", e)
                isHandled = false
            }
        }
    }
    
    val handleDismiss: () -> Unit = {
        if (!isHandled) {
            isHandled = true
            try {
                android.util.Log.d("EmployeeSelectionDialog", "Dialog dismissed")
                onDismiss()
            } catch (e: Exception) {
                android.util.Log.e("EmployeeSelectionDialog", "Error dismissing: ${e.message}", e)
            }
        }
    }
    
    AlertDialog(
        onDismissRequest = handleDismiss,
        title = { Text("Multiple Employees Found") },
        text = {
            Column {
                Text("Please select your name:")
                Spacer(modifier = Modifier.height(8.dp))
                employees.forEach { employee ->
                    val displayName = employee.employeeName.takeIf { it.isNotBlank() } ?: "Unknown (ID: ${employee.employeeId})"
                    TextButton(
                        onClick = { handleSelect(employee) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = displayName,
                            fontSize = 18.sp,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Start
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = handleDismiss) {
                Text("Cancel")
            }
        }
    )
}
