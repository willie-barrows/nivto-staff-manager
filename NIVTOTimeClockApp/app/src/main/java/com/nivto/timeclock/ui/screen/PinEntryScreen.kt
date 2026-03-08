package com.nivto.timeclock.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nivto.timeclock.util.PinManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PinEntryScreen(
    pinManager: PinManager,
    onPinVerified: () -> Unit,
    onCancel: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var enteredPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    var isLocked by remember { mutableStateOf(false) }
    var lockoutTime by remember { mutableStateOf(0L) }
    
    // Check if locked out
    LaunchedEffect(Unit) {
        if (pinManager.isLockedOut()) {
            isLocked = true
            lockoutTime = pinManager.getLockoutTimeRemaining()
        }
    }
    
    // Countdown timer for lockout
    LaunchedEffect(isLocked) {
        if (isLocked) {
            while (lockoutTime > 0) {
                kotlinx.coroutines.delay(1000)
                lockoutTime = pinManager.getLockoutTimeRemaining()
                if (lockoutTime == 0L) {
                    isLocked = false
                    errorMessage = ""
                }
            }
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Management Access",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Bold
            )
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = if (pinManager.isPinSet()) "Enter PIN" else "Create a new PIN (4-6 digits)",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // PIN display
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
                    text = "•".repeat(enteredPin.length).padEnd(6, '_'),
                    style = MaterialTheme.typography.displayMedium.copy(
                        letterSpacing = 12.sp
                    )
                )
            }
        }
        
        if (errorMessage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = errorMessage,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        
        if (isLocked) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Too many attempts. Locked for ${lockoutTime / 1000}s",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Numeric keypad
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            for (row in 0..2) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    for (col in 1..3) {
                        val number = row * 3 + col
                        Button(
                            onClick = {
                                if (!isLocked && enteredPin.length < 6) {
                                    enteredPin += number.toString()
                                    errorMessage = ""
                                }
                            },
                            modifier = Modifier.weight(1f).height(70.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isLocked
                        ) {
                            Text(text = number.toString(), fontSize = 28.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = { enteredPin = "" },
                    modifier = Modifier.weight(1f).height(70.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    ),
                    enabled = !isLocked
                ) {
                    Text("Clear", fontSize = 18.sp)
                }
                
                Button(
                    onClick = {
                        if (!isLocked && enteredPin.length < 6) {
                            enteredPin += "0"
                            errorMessage = ""
                        }
                    },
                    modifier = Modifier.weight(1f).height(70.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !isLocked
                ) {
                    Text("0", fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
                
                Button(
                    onClick = {
                        if (enteredPin.isNotEmpty()) {
                            enteredPin = enteredPin.dropLast(1)
                        }
                    },
                    modifier = Modifier.weight(1f).height(70.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    ),
                    enabled = !isLocked
                ) {
                    Text("⌫", fontSize = 24.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        if (!pinManager.isPinSet()) {
            // Create PIN button
            Button(
                onClick = {
                    if (enteredPin.length >= 4) {
                        pinManager.setPin(enteredPin)
                        enteredPin = ""
                        errorMessage = "PIN created successfully!"
                        scope.launch {
                            delay(1000)
                            onPinVerified()
                        }
                    } else {
                        errorMessage = "PIN must be at least 4 digits"
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = enteredPin.length >= 4 && !isLocked
            ) {
                Text("Create PIN")
            }
        } else {
            // Verify PIN button
            Button(
                onClick = {
                    if (enteredPin.length >= 4) {
                        if (pinManager.verifyPin(enteredPin)) {
                            onPinVerified()
                        } else {
                            if (pinManager.isLockedOut()) {
                                isLocked = true
                                lockoutTime = pinManager.getLockoutTimeRemaining()
                                errorMessage = ""
                            } else {
                                errorMessage = "Incorrect PIN"
                            }
                            enteredPin = ""
                        }
                    } else {
                        errorMessage = "PIN must be at least 4 digits"
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = enteredPin.length >= 4 && !isLocked
            ) {
                Text("Enter")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(onClick = onCancel) {
            Text("Cancel")
        }
    }
}
