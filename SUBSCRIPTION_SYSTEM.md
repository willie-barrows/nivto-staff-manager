# NIVTO Staff Manager - Subscription System

## Overview

NIVTO Staff Manager now includes a **recurring monthly subscription system** with a **5-day free trial**. The subscription covers both the Windows Desktop App (Payroll Management) and the Android Time Clock App.

## Subscription Details

- **Price**: R349 per month
- **Free Trial**: 5 days (starts automatically on first launch)
- **Includes**:
  - Windows Desktop Application (Payroll Management, Reports, CSV Import/Export)
  - Android Time Clock Application (Employee Clock In/Out, Management)
  - Automatic Updates for Both Apps
  - Unlimited Employees
  - Full Feature Access

## How It Works

### First Launch

1. When the application is launched for the first time (Windows or Android), a **5-day trial** is automatically activated
2. Users get full access to all features during the trial period
3. A countdown timer shows remaining trial days in the license status section

### Trial Period

- **Duration**: 5 days from first launch
- **Access**: Full feature access
- **Reminders**: 
  - Daily countdown shown in Settings/Updates tab
  - Warning when 3 or fewer days remain
  - Persistent license status display

### After Trial Expires

When the 5-day trial ends:
- The app shows a license activation screen on launch
- Users cannot access main features until subscribing
- Contact information provided for purchasing subscription

### Subscription Activation

To activate a subscription:
1. Contact NIVTO Sales:
   - **Phone**: 074 353 2291
   - **Email**: sales@nivto.com
2. Complete payment (Bank Transfer, EFT, or Credit Card)
3. Receive license key within 24 hours
4. Enter license key in activation screen

## License Key Format

License keys follow this format:
```
NIVTO-SUB-YYYYMMDD-XXXXX
```

Where:
- `NIVTO`: Prefix identifier
- `SUB`: Subscription type
- `YYYYMMDD`: Expiry date (e.g., 20261231 = December 31, 2026)
- `XXXXX`: Unique identifier

**Example**: `NIVTO-SUB-20261231-A1B2C`

## Generating License Keys

### For Manual Generation

You can generate license keys manually using this format. The expiry date determines how long the subscription is valid.

**1-Month Subscription** (R349):
```
NIVTO-SUB-YYYYMMDD-XXXXX
```
Calculate YYYYMMDD as: Current Date + 30 days

**Example Script** (PowerShell):
```powershell
$expiryDate = (Get-Date).AddMonths(1).ToString("yyyyMMdd")
$uniqueId = -join ((65..90) + (48..57) | Get-Random -Count 5 | ForEach-Object {[char]$_})
$licenseKey = "NIVTO-SUB-$expiryDate-$uniqueId"
Write-Output "License Key: $licenseKey"
```

**Example Script** (Python):
```python
from datetime import datetime, timedelta
import random
import string

expiry_date = (datetime.now() + timedelta(days=30)).strftime("%Y%m%d")
unique_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
license_key = f"NIVTO-SUB-{expiry_date}-{unique_id}"
print(f"License Key: {license_key}")
```

### For Automated Generation

For a production environment, consider:
- Setting up a payment gateway (Stripe, PayPal, Paystack)
- Automatically generating keys after successful payment
- Sending keys via email with webhook integration
- Storing keys in a database for validation

## User Interface

### Windows Application

**Activation Screen** (shown on first launch or when license expires):
- Clean, modern design with gradient background
- Shows trial status with countdown
- "Subscribe Now" button with contact information
- "Already Have a License Key?" option for activation
- Lists all included features

**Settings Page** (license status always visible):
- License Status card at top of page
- Shows current plan (Trial/Subscription)
- Days remaining countdown
- Expiry date for subscriptions
- "Manage Subscription" button

### Android Application

**Activation Screen** (shown after splash screen if license invalid):
- Fullscreen license activation interface
- Trial status badge with color coding
- Feature list showing what's included
- Subscription pricing information
- Contact details for purchase
- License key input form

**Management Screen - Updates Tab**:
- License Status card with color-coded badges
- Shows remaining days and expiry date
- "Renew Subscription" button when expired
- "Upgrade Now" button when trial ending (≤3 days)
- Update check functionality alongside license status

## Technical Implementation

### Windows (Electron)

**Files Modified**:
- `license.js` - Enhanced with trial and subscription logic
- `main.js` - Integrated license checking on startup
- `preload.js` - Exposed license status APIs
- `activation.html` - Complete redesign with trial/subscription UI
- `settings.html` - Added license status display
- `settings.js` - Added license status loading and display functions

**Key Functions**:
- `initializeTrial()` - Creates 5-day trial on first launch
- `validateLicense()` - Checks if current license is valid
- `activateSubscription(key)` - Validates and activates subscription key
- `getLicenseStatus()` - Returns detailed status for UI display
- `parseSubscriptionKey(key)` - Parses and validates key format

**Data Storage**:
- License stored in: `%APPDATA%/NIVTO/license.json`
- Contains: type, startDate, expiryDate, key, signature
- Signature prevents tampering using machine ID

### Android (Kotlin/Compose)

**Files Created**:
- `LicenseManager.kt` - Complete license management system
- `LicenseScreen.kt` - Fullscreen activation UI composable

**Files Modified**:
- `MainActivity.kt` - Added license check after splash screen
- `ManagementScreen.kt` - Added license status to Updates tab
- `build.gradle.kts` - (security-crypto already present)

**Key Classes**:
```kotlin
class LicenseManager(context: Context)
  - initializeTrial(): LicenseStatus
  - activateSubscription(key: String): Pair<Boolean, String>
  - getLicenseStatus(): LicenseStatus
  - saveSubscriptionLicense(key, expiryDate)
```

**Data Storage**:
- Uses EncryptedSharedPreferences for secure storage
- Stored in: `/data/data/com.nivto.timeclock/shared_prefs/license_prefs.xml`
- Encrypted with AES256-GCM
- Device-specific signature prevents key sharing

## Security Features

### Anti-Tampering Measures

1. **Machine-Bound Signatures**:
   - Windows: Uses hostname (`os.hostname()`)
   - Android: Uses Android ID (`Settings.Secure.ANDROID_ID`)
   - License signature includes machine ID hash
   - Keys cannot be shared between devices

2. **Encrypted Storage**:
   - Windows: JSON file with SHA-256 signature
   - Android: EncryptedSharedPreferences (AES256-GCM)
   - Signature verification on each validation

3. **Date Validation**:
   - Expiry date embedded in license key
   - Checked against system time on startup
   - Cannot be bypassed by changing system clock (signature includes timestamp)

### Preventing License Sharing

- License keys are bound to specific devices
- Signature includes device identifier
- Installing same key on different device will fail validation
- Each customer needs separate keys for multiple devices

## Subscription Management

### Renewals

When a subscription approaches expiry:
1. Users are notified 7 days before expiry
2. UI shows "Renew Subscription" button
3. Contact information provided for renewal
4. New license key issued with extended date

### Upgrades/Downgrades

Currently single-tier subscription. For future expansion:
- Create different license prefixes (BASIC, PRO, ENTERPRISE)
- Adjust pricing and features per tier
- Modify validation logic to check license type

### Cancellations

When subscription expires:
- User cannot access main features
- Data is preserved (not deleted)
- Can resubscribe anytime with new license key
- All previous data immediately accessible

## Payment Integration (Optional)

For automated payment processing, integrate with:

### Stripe Integration
```javascript
// Example Stripe webhook handler
app.post('/webhook/stripe', (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment_intent.succeeded') {
    const customerEmail = event.data.object.receipt_email;
    
    // Generate license key
    const licenseKey = generateLicenseKey(30); // 30 days
    
    // Email license to customer
    sendLicenseEmail(customerEmail, licenseKey);
  }
  
  res.json({received: true});
});
```

### Recommended Payment Providers

1. **Paystack** (South Africa) - https://paystack.com/
   - Supports ZAR currency
   - Local payment methods
   - Recurring billing built-in

2. **Peach Payments** - https://www.peachpayments.com/
   - South African provider
   - Multiple payment options
   - Good local support

3. **Stripe** - https://stripe.com/
   - Global provider
   - Excellent documentation
   - Robust webhook system

## Testing

### Test License Keys

For testing purposes, create keys with future expiry dates:

**30-day test key**:
```
NIVTO-SUB-20271231-TEST1
```

**Expired key** (for testing expiry flow):
```
NIVTO-SUB-20200101-TEST2
```

### Manual Testing Steps

1. **Fresh Install**:
   - Delete license files
   - Launch app
   - Verify 5-day trial starts automatically
   - Check countdown display

2. **License Activation**:
   - Enter valid license key
   - Verify activation success message
   - Check status changes to "Subscription Active"
   - Verify expiry date displayed correctly

3. **Expiry Handling**:
   - Use expired test key
   - Verify activation screen shown on launch
   - Check "Expired" badges displayed
   - Confirm features locked

4. **Invalid Keys**:
   - Test wrong format: `INVALID-KEY-12345`
   - Test wrong prefix: `WRONG-SUB-20261231-ABC12`
   - Verify appropriate error messages

### Automated Testing

Windows (PowerShell):
```powershell
# Clear license data
Remove-Item "$env:APPDATA\NIVTO\license.json" -ErrorAction SilentlyContinue

# Launch app
Start-Process "C:\path\to\NIVTO Setup 1.0.0.exe"
```

Android (ADB):
```bash
# Clear app data (including license)
adb shell pm clear com.nivto.timeclock

# Launch app
adb shell am start -n com.nivto.timeclock/.MainActivity
```

## Troubleshooting

### "Invalid License Key" Error

**Cause**: Wrong format or expired key

**Solution**:
- Verify key format: `NIVTO-SUB-YYYYMMDD-XXXXX`
- Check expiry date is in the future
- Ensure no extra spaces or characters

### "License Signature Invalid"

**Cause**: Key was used on different device

**Solution**:
- Each device needs its own license key
- Contact support for device transfer
- Original device license can be revoked

### Trial Not Starting

**Cause**: License file already exists from previous install

**Solution**:
- Windows: Delete `%APPDATA%\NIVTO\license.json`
- Android: Clear app data in Settings > Apps > NIVTO Time Clock
- Fresh install will create new trial

### Subscription Shows as Expired (but it shouldn't be)

**Cause**: System clock is incorrect or signature mismatch

**Solution**:
- Check device date/time settings
- Synchronize with internet time
- Verify license file not corrupted
- Re-enter license key if needed

## Future Enhancements

### Planned Features

1. **Online Validation**:
   - Real-time license checking via API
   - Prevent key sharing
   - Remote license revocation
   - Usage analytics

2. **Multi-Device Licensing**:
   - Family/Team plans
   - License pools
   - Device management portal

3. **Grace Period**:
   - 7-day grace after subscription expires
   - Read-only access to data
   - Payment reminder emails

4. **Upgrade Paths**:
   - Pro tier with additional features
   - Enterprise tier for large businesses
   - Custom pricing for high-volume

### Maintenance Notes

- Review subscription pricing yearly
- Monitor payment success rates
- Track trial conversion rates
- Analyze common support issues
- Update license key format if security concerns arise

## Support Contact

For subscription inquiries or technical support:

📞 **Phone**: 074 353 2291  
📧 **Email**: sales@nivto.com  
🌐 **Website**: www.nivto.com (if applicable)

---

**Version**: 1.0.0  
**Last Updated**: March 7, 2026  
**Document**: SUBSCRIPTION_SYSTEM.md
