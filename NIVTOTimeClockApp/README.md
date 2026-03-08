# NIVTO Time Clock - Android App

Mobile companion app for NIVTO Staff Management Windows application. Enables workers to clock in/out using their date of birth (first 6 digits of South African ID number), with management access to export attendance data to CSV.

## Features

### Worker Features
- **Quick Clock In/Out**: Large numeric keypad for easy entry of 6-digit birth date (YYMMDD format)
- **Birth Date Authentication**: Uses first 6 digits of ID Number field from staff records
- **Collision Handling**: If multiple employees share the same birth date, a selection dialog appears
- **Visual Feedback**: Full-screen success confirmation with employee name and timestamp
- **Offline Operation**: Works completely offline without internet connection

### Management Features (PIN Protected)
- **Staff Management**
  - Import staff data from CSV (compatible with Windows app format)
  - View active employee count
  - Clear all data option
  
- **Attendance Export**
  - Select date range (quick buttons for current/last month)
  - Generate CSV in Windows app-compatible format
  - Universal share options: Email, WhatsApp, USB, Cloud drives, Nearby Share, Bluetooth
  
- **Clock History**
  - View all clock events with timestamps
  - Filter and search capabilities
  - Delete incorrect entries
  
- **PIN Security**
  - Create 4-6 digit PIN on first use
  - 3 failed attempts trigger 30-second lockout
  - Encrypted storage using Android Security Crypto

## Technical Stack

- **Platform**: Android (Kotlin)
- **UI Framework**: Jetpack Compose with Material 3
- **Database**: Room (SQLite)
- **CSV Handling**: OpenCSV
- **Security**: AndroidX Security Crypto for encrypted SharedPreferences
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)

## Project Structure

```
app/src/main/java/com/nivto/timeclock/
├── data/
│   ├── entity/          # Room entities (Employee, ClockEvent)
│   ├── dao/             # Data Access Objects
│   ├── repository/      # Repository pattern implementation
│   └── TimeClockDatabase.kt
├── ui/
│   ├── screen/          # Compose UI screens
│   ├── viewmodel/       # ViewModels for each screen
│   └── theme/           # Material 3 theme configuration
├── util/
│   ├── CsvHandler.kt    # CSV import/export logic
│   └── PinManager.kt    # PIN security management
├── MainActivity.kt
└── TimeClockApplication.kt
```

## Building the App

### Requirements
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Gradle 8.2+

### Build Steps

1. **Open in Android Studio**
   ```
   File > Open > Select NIVTOTimeClockApp folder
   ```

2. **Sync Gradle**
   - Android Studio should automatically trigger Gradle sync
   - If not, click "Sync Project with Gradle Files" in the toolbar

3. **Build APK**
   ```
   Build > Build Bundle(s) / APK(s) > Build APK(s)
   ```
   APK will be generated in: `app/build/outputs/apk/release/`

4. **Or Build from Command Line**
   ```powershell
   cd NIVTOTimeClockApp
   .\gradlew assembleRelease
   ```

## CSV Format Compatibility

### Staff Import (staff.csv)
Expected format matching Windows app:
```csv
sep=,
Employee ID,Employee Name,Position,Rate,Rate Type,Active,UIF,Tax,PAYE,ID Number,...
001,John Doe,Manager,500,Daily,Yes,1,10,0,8504150123084,...
```

**Required Columns:**
- Employee ID (string) - Accepts: "Employee ID", "EmployeeID", "Staff ID", "EmpID", "ID"
- Employee Name (string) - Accepts: "Employee Name", "EmployeeName", "Name", "Full Name", "Staff Name"

**Optional Columns:**
- Position - Accepts: "Position", "Title", "Job Title", "Role"
- Active - Accepts: "Active", "Status", "Is Active" (defaults to Yes/true if missing)
- ID Number - Accepts: "ID Number", "IDNumber", "National ID", "SA ID" (uses Employee ID as fallback)

The app accepts flexible column name formats and will import all valid employee records.

### Attendance Export (attendance_export_YYYYMMDD_YYYYMMDD.csv)
Exported format compatible with Windows app:
```csv
sep=,
Employee ID,Employee Name,Hours Worked,Break Time,Break Payable
001,John Doe,160.50,0.00,No
```

**Calculation Logic:**
- Groups clock events by employee across date range
- Pairs CLOCK_IN and CLOCK_OUT events to calculate hours
- Sums total hours for each employee
- Break Time defaults to 0 (manual entry in Windows app)
- Break Payable defaults to "No"

## Usage Instructions

### First-Time Setup

1. **Install APK** on Android device/tablet (Min Android 7.0)
2. **Create Management PIN**
   - Tap "Management Access" on clock screen
   - Enter a 4-6 digit PIN twice to confirm
   - Remember this PIN - it cannot be recovered!

3. **Import Staff Data**
   - In Management Dashboard, go to "Staff" tab
   - Tap "Import Staff from CSV"
   - Select staff.csv file from Windows app
   - Verify employee count after import

### Daily Operations

**Workers Clocking In/Out:**
1. Enter first 6 digits of ID number (birth date in YYMMDD format)
   - Example: For ID 850415..., enter: 850415
2. Tap "Clock In" or "Clock Out"
3. Success screen shows name and time for 3 seconds
4. Automatically returns to entry screen

**If Multiple Employees Share Birth Date:**
- Selection dialog appears with employee names
- Worker taps their name to confirm
- Clock event recorded for selected employee

### Exporting Attendance

1. **Access Management** (enter PIN)
2. **Go to "Export" tab**
3. **Select Date Range**
   - Quick buttons: "This Month" or "Last Month"
   - Or manually adjust dates
4. **Tap "Generate & Share CSV"**
5. **Choose Share Method:**
   - Email: Attach to Gmail, Outlook, etc.
   - WhatsApp: Send to manager/admin
   - USB: Transfer via file manager
   - Cloud: Upload to Google Drive, OneDrive, etc.
   - Nearby Share/Bluetooth: Direct transfer to nearby device

6. **In Windows App:**
   - Save CSV file to device
   - Open NIVTO Staff Management
   - Use standard Windows file operations to import data

### Clock History Management

- View all clock events in "History" tab
- Tap "×" button to delete incorrect entries
- Filter by date or search for specific employees

### Data Management

**Clear All Data:**
- Management Dashboard > Staff tab > "Clear All Data"
- Removes all staff records and clock events
- Does NOT reset PIN (for security)
- Use before re-importing fresh staff data

## Security Features

- **Encrypted PIN Storage**: Uses AndroidX Security Crypto with AES256-GCM encryption
- **Lockout Protection**: 3 failed PIN attempts trigger 30-second lockout
- **No Cloud Sync**: All data stored locally on device only
- **Offline Operation**: No network permissions required for core functionality

## Troubleshooting

### Issue: "Date of birth not found"
- **Cause**: ID Number not in imported staff list or employee inactive
- **Solution**: Verify staff.csv contains employee with matching ID Number (first 6 digits)

### Issue: "Already clocked in"
- **Cause**: Worker tried to clock in twice without clocking out
- **Solution**: Clock out first, or use Management > History to delete duplicate entry

### Issue: Import fails
- **Cause**: CSV format incorrect or missing required columns
- **Solution**: 
  - Ensure CSV exported from Windows NIVTO app
  - Verify "ID Number" column exists and contains 13-digit IDs
  - Check file encoding is UTF-8

### Issue: Export shows no records
- **Cause**: No clock events in selected date range
- **Solution**: Verify date range includes days with clock activity

### Issue: Forgot PIN
- **Solution**: 
  - Uninstall and reinstall app (loses all data)
  - Or use Android Settings > Apps > NIVTO Time Clock > Storage > Clear Data

## Permissions

- **READ_EXTERNAL_STORAGE** (Android 12 and below): To import staff CSV
- **WRITE_EXTERNAL_STORAGE** (Android 12 and below): To export attendance CSV
- **USE_BIOMETRIC** (optional): For future biometric PIN unlock

## Known Limitations

- Break time not tracked automatically (defaults to 0 in export)
- Overnight shifts not automatically split (handled by Windows app)
- No automatic data sync (manual CSV export/import workflow)
- No photo capture (removed per requirements)

## Support

For issues or feature requests related to:
- **Windows App**: See NIVTO Staff Management documentation
- **Android App**: Contact development team or check commit history

## Version History

**v1.0.0** (2026-03-06)
- Initial release
- Birth date authentication (6-digit ID number)
- Clock in/out functionality
- PIN-protected management dashboard
- CSV import/export
- Offline operation
- Universal share options

## License

Proprietary - NIVTO © 2026
