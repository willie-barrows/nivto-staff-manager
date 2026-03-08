package com.nivto.timeclock.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nivto.timeclock.util.LicenseManager

@Composable
fun LicenseScreen(
    onLicenseValid: () -> Unit
) {
    val context = LocalContext.current
    val licenseManager = remember { LicenseManager(context) }
    
    var licenseStatus by remember { mutableStateOf(licenseManager.getLicenseStatus()) }
    var showActivationForm by remember { mutableStateOf(false) }
    var licenseKey by remember { mutableStateOf("") }
    var activationMessage by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }
    
    LaunchedEffect(licenseStatus) {
        if (licenseStatus.valid) {
            onLicenseValid()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF667eea),
                        Color(0xFF764ba2)
                    )
                )
            )
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Text(
                    text = "🕐 NIVTO Time Clock",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF667eea)
                )
                
                Text(
                    text = "Employee Time Management App",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                if (!showActivationForm) {
                    // Status Section
                    LicenseStatusCard(licenseStatus)
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Features Section
                    FeaturesCard()
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Subscription Info
                    SubscriptionInfoCard()
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Action Buttons
                    Button(
                        onClick = { showPurchaseInfo(context) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF27ae60)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "💳 Subscribe Now",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    
                    OutlinedButton(
                        onClick = { showActivationForm = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Already Have a License Key?")
                    }
                } else {
                    // Activation Form
                    Text(
                        text = "Activate License",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    OutlinedTextField(
                        value = licenseKey,
                        onValueChange = { licenseKey = it },
                        label = { Text("License Key") },
                        placeholder = { Text("NIVTO-SUB-20261231-XXXXX") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    
                    if (activationMessage.isNotEmpty()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isError) Color(0xFFF8D7DA) else Color(0xFFD4EDDA)
                            )
                        ) {
                            Text(
                                text = activationMessage,
                                modifier = Modifier.padding(12.dp),
                                color = if (isError) Color(0xFFE74C3C) else Color(0xFF27AE60)
                            )
                        }
                    }
                    
                    Button(
                        onClick = {
                            if (licenseKey.isBlank()) {
                                activationMessage = "Please enter a license key"
                                isError = true
                                return@Button
                            }
                            
                            val (success, message) = licenseManager.activateSubscription(licenseKey)
                            activationMessage = message
                            isError = !success
                            
                            if (success) {
                                licenseStatus = licenseManager.getLicenseStatus()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF667eea)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "Activate License",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    
                    OutlinedButton(
                        onClick = { 
                            showActivationForm = false
                            activationMessage = ""
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("← Back")
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "License format: NIVTO-SUB-YYYYMMDD-XXXXX\nNeed help? Contact: 074 353 2291",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun LicenseStatusCard(status: LicenseManager.LicenseStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8F9FA)
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "⚠️ License Required",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF667eea)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            val statusText = when {
                status.type == LicenseManager.TYPE_TRIAL && status.valid -> 
                    "Your free trial is active with ${status.daysRemaining} day${if (status.daysRemaining != 1) "s" else ""} remaining."
                status.type == LicenseManager.TYPE_TRIAL && status.expired -> 
                    "Your free trial has expired. Please purchase a subscription to continue."
                status.type == LicenseManager.TYPE_SUBSCRIPTION && status.expired ->
                    "Your subscription has expired. Please renew to continue."
                else -> "No license found. Start your free 5-day trial now!"
            }
            
            Text(
                text = statusText,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.DarkGray
            )
            
            if (status.type == LicenseManager.TYPE_TRIAL && status.valid) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = Color(0xFF27AE60),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        text = "🎉 Trial Active: ${status.daysRemaining} days left",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }
            } else if (status.expired) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = Color(0xFFE74C3C),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Text(
                        text = "❌ ${if (status.type == LicenseManager.TYPE_TRIAL) "Trial" else "Subscription"} Expired",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun FeaturesCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8F9FA)
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "📦 What's Included",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF667eea)
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            val features = listOf(
                "✅ Android Time Clock App",
                "✅ Windows Desktop App (Payroll)",
                "✅ Automatic Updates",
                "✅ CSV Export/Import",
                "✅ Unlimited Employees",
                "✅ Break Time Tracking"
            )
            
            features.forEach { feature ->
                Text(
                    text = feature,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.DarkGray,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
fun SubscriptionInfoCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFF8F9FA)
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "💰 Subscription",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF667eea)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "${LicenseManager.SUBSCRIPTION_PRICE} per month",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF667eea)
            )
            
            Text(
                text = "Includes both Windows and Android apps",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.DarkGray
            )
            
            Text(
                text = "${LicenseManager.TRIAL_DAYS}-day free trial included",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF27AE60)
            )
        }
    }
}

fun showPurchaseInfo(context: android.content.Context) {
    val message = """
        To purchase a subscription:
        
        Monthly Fee: ${LicenseManager.SUBSCRIPTION_PRICE}
        Includes: Windows + Android apps
        
        Payment Methods:
        • Bank Transfer
        • EFT  
        • Credit Card
        
        Contact us to complete your purchase:
        📞 074 353 2291
        📧 sales@nivto.com
        
        After payment, you'll receive your license key within 24 hours.
    """.trimIndent()
    
    android.app.AlertDialog.Builder(context)
        .setTitle("Subscribe to NIVTO")
        .setMessage(message)
        .setPositiveButton("OK", null)
        .show()
}
