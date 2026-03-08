# StaffManager

A comprehensive offline staff management and payroll calculation application built with Electron.

## 📋 Features

- **Staff Management** - Add, edit, and manage employee records with customizable rates
- **Attendance Tracking** - Track daily attendance with automatic date-based loading
- **Shift Scheduling** - Create and manage weekly work schedules
- **Payout Calculator** - Automated salary calculations with deductions (UIF, PAYE, Tax)
- **PDF Reports** - Generate professional payout slips (individual & full reports)
- **CSV Export** - Excel-compatible data exports
- **Password Protection** - Optional admin password with session management
- **Offline Operation** - Works completely offline with local data storage

## 💻 System Requirements

- **Operating System**: Windows 10/11 (64-bit)
- **Disk Space**: 200 MB for installation
- **RAM**: 512 MB minimum
- **No Internet Required** - Fully offline application

## 🚀 Installation

1. Locate the installer: `StaffManager Setup 1.0.0.exe`
2. Double-click to run the installer
3. Follow the installation wizard:
   - Choose installation directory (default: `C:\Program Files\StaffManager`)
   - Select if you want a desktop shortcut
   - Click Install
4. Launch StaffManager from the desktop shortcut or Start Menu

## 📖 User Guide

### First Time Setup

When you first launch StaffManager, you'll see a **Welcome Setup** screen:

1. **Company Name** (Required) - Enter your business name
2. **Address** (Optional) - Company physical address
3. **Contact Info** (Optional) - Phone, email, or website
4. **Working Hours** - Set default workday start and end times
5. **Default Deductions** - Set default percentages:
   - **UIF** (Unemployment Insurance Fund) - Default: 1%
   - **PAYE** (Pay As You Earn) - Default: 0%
   - **Tax** - Default: 10%
6. **Admin Password** (Optional) - Leave blank for no password protection
7. Click **Save & Continue**

### Dashboard

The main dashboard provides quick access to all modules:
- 👥 **Staff Management**
- 📅 **Attendance**
- 📆 **Shifts**
- 💰 **Payout Calculator**
- ⚙️ **Settings**

### 👥 Staff Management

**Adding Employees:**
1. Click **Add Employee**
2. Fill in the form:
   - **Employee ID** - Unique identifier (e.g., 001, EMP001)
   - **Full Name** - Employee's complete name
   - **Position** - Job title (e.g., Manager, Cashier)
   - **Rate Type** - Choose Hourly or Daily
   - **Rate** - Wage amount in Rands (R)
   - **Employment Status** - Active or Inactive
   - **UIF %** - UIF deduction percentage (default: 1%)
   - **PAYE %** - PAYE deduction percentage (default: 0%)
   - **Tax %** - Tax deduction percentage (default: 10%)
3. Click **Save Employee**

**Editing Employees:**
1. Click **Edit** button next to employee
2. Modify any fields (including Employee ID)
3. Click **Save Changes**

**Removing Employees:**
- Click **Remove** and confirm deletion

**Data Storage:**
- All staff data is saved to `staff.csv`
- Compatible with Microsoft Excel

### 📅 Attendance Tracking

**Marking Attendance:**
1. Select a date from the calendar
2. Attendance automatically loads for that date
3. Click **Mark as Present** for employees who worked
4. Set **Hours Worked** for each present employee
5. Changes save automatically

**Features:**
- Date-based tracking with auto-loading
- Hours worked per employee
- Automatically excludes inactive employees
- Status indicators: ✅ Present | ⭕ Absent

**Data Storage:**
- Attendance saved in `data/attendance_YYYY-MM-DD.csv` format
- One file per date for easy management

### 📆 Shift Scheduling

**Creating Schedules:**
1. Select a week using date navigation
2. For each employee:
   - Check the days they work
   - Set start and end times
3. Click **Save Schedule**

**Features:**
- Weekly view (Monday to Sunday)
- Quick "All Days" checkbox
- Time pickers for start/end times
- Visual schedule overview

**Data Storage:**
- Saved in `data/schedule_YYYY-MM-DD.csv`
- One file per week

### 💰 Payout Calculator

**Calculating Payouts:**
1. Select **Start Date** and **End Date** for pay period
2. Click **Calculate Payouts**
3. View employee breakdown with:
   - Hours worked (from attendance)
   - Gross pay calculation
   - Individual deductions (UIF, PAYE, Tax)
   - Net pay

**Rate Calculations:**
- **Hourly Rate**: `Hours × Rate`
- **Daily Rate**: `(Hours ÷ 8) × Rate`

**Generating Reports:**

**Full Report:**
- Click **📄 Open PDF Report** at the top
- Generates comprehensive payout report
- Opens automatically in default PDF viewer
- Includes summary totals

**Individual Employee Report:**
- Click **📄 PDF** button next to employee name
- Generates personal payout slip
- Format: `Payout_[EmpID]_[Name]_[DateRange].pdf`
- Opens automatically

**PDF Report Contents:**
- Company header (name, address, contact)
- Report title with date range
- Employee data table
- Summary section with totals:
  - Total employees
  - Total hours
  - Total gross pay
  - Total deductions (UIF, PAYE, Tax)
  - **Total Net Pay**
- Professional footer with page numbers

**Data Storage:**
- Payout data: `data/payout_YYYY-MM-DD_YYYY-MM-DD.csv`
- PDF reports: `data/reports/Payout_*.pdf`

### ⚙️ Settings

**Company Information:**
- Edit company name, address, and contact info
- Changes reflect in PDF reports

**Working Hours:**
- Adjust default workday start/end times
- Used for shift scheduling defaults

**Default Deductions:**
- Modify default UIF, PAYE, and Tax percentages
- Applied to new employees automatically

**Security:**
- Set or change admin password
- Leave blank to remove password protection
- With password: requires login after 24 hours
- Without password: always logged in

**Session Management:**
- Sessions last 24 hours with password protection
- Use **Logout** button to end session manually
- Sessions persist across app restarts

## 📁 Data Storage Locations

When installed, all data is stored in:
```
C:\Users\[YourUsername]\AppData\Roaming\staff-manager\
├── config.json (Company & system settings)
├── session.json (Login session data)
├── staff.csv (Employee records)
└── data/
    ├── attendance_YYYY-MM-DD.csv (Daily attendance)
    ├── schedule_YYYY-MM-DD.csv (Weekly schedules)
    ├── payout_START_END.csv (Payout calculations)
    └── reports/
        └── Payout_*.pdf (Generated reports)
```

**During Development:**
- Data is stored in the `StaffManager` project folder
- Same structure as above

## 🔒 Security Features

**Password Protection:**
- Optional administrative password
- Uses bcrypt encryption for secure storage
- Never stored in plain text

**Session Management:**
- 24-hour automatic sessions
- Secure session tokens
- Automatic logout after expiry

**Data Privacy:**
- All data stored locally on your computer
- No internet connection required
- No data transmitted externally
- You maintain complete control

## 📊 Excel Compatibility

All CSV files are formatted for Microsoft Excel:
- UTF-8 BOM encoding for special characters
- Delimiter declaration for proper parsing
- Descriptive column headers
- Compatible with Excel 2010 and newer

**Opening CSV Files:**
1. Navigate to data folder in AppData
2. Double-click CSV file
3. Opens directly in Excel with proper formatting

## 🛠️ Troubleshooting

**Application won't start:**
- Check if Windows SmartScreen is blocking it
- Right-click installer → Properties → Unblock → Apply
- Re-run the installer

**PDF won't open automatically:**
- Ensure you have a PDF reader installed (e.g., Adobe Reader, Edge)
- PDFs are still saved even if auto-open fails
- Manual location: AppData → staff-manager → data → reports

**Data not saving:**
- Check if you have sufficient disk space
- Ensure antivirus isn't blocking the app
- Run as Administrator if needed

**Can't find my data:**
- Press `Windows + R`
- Type: `%APPDATA%\staff-manager`
- Press Enter
- Access all your data files

**Forgot password:**
- No password recovery feature available
- Navigate to: `%APPDATA%\staff-manager\config.json`
- Open in Notepad
- Delete the line: `"adminPassword": "..."`
- Save file and restart app

**Settings not applying:**
- Close and restart the application
- Check config.json file for corruption
- Delete config.json to reset (will need to re-setup)

## 💡 Tips & Best Practices

1. **Regular Backups:**
   - Copy entire `%APPDATA%\staff-manager` folder periodically
   - Store backups on external drive or cloud storage

2. **Employee IDs:**
   - Use consistent format (e.g., 001, 002, 003)
   - Don't reuse IDs after deletion

3. **Attendance:**
   - Mark attendance daily for accuracy
   - Review attendance before calculating payouts

4. **Payout Calculation:**
   - Verify attendance data first
   - Review calculated values before generating PDFs
   - Keep PDF reports for record-keeping

5. **Deductions:**
   - Review deduction percentages regularly
   - Update per employee as needed for accuracy

## 🆘 Support

For issues, feature requests, or questions:
- Review the troubleshooting section above
- Check data storage locations
- Verify all required files are present

## 📝 Version Information

**Current Version:** 1.0.0

**Built with:**
- Electron 26.0.0
- PapaParse 5.4.1 (CSV parsing)
- PDFKit 0.13.0 (PDF generation)
- bcryptjs 2.4.3 (Password encryption)

## 📜 License

This software is provided as-is for business use.

---

**StaffManager** - Professional Staff Management Made Simple
