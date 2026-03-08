const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const { 
    saveLicense, 
    validateLicense, 
    getLicenseStatus, 
    activateSubscription,
    startTrial,
    SUBSCRIPTION_PRICE,
    TRIAL_DAYS
} = require('./license');

// Sync server
const SyncServer = require('./sync-server');
let syncServer = null;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow('update-error', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  sendStatusToWindow('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('update-downloaded', info);
});

function sendStatusToWindow(event, data) {
  if (win) {
    win.webContents.send('update-status', { event, data });
  }
}

let win;
const userDataPath = app.getPath('userData');
const sessionPath = path.join(userDataPath, 'session.json');
const configPath = path.join(userDataPath, 'config.json');

const VALID_KEYS = [
  "NVTO-2026-8F3K2-91LM",
  "NVTO-2026-7T9XP-22QA"
];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Enable DevTools with Ctrl+Shift+I or F12
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      win.webContents.openDevTools();
    }
  });
  
  // Check if config exists and determine which page to load
  const configExists = fs.existsSync(configPath);
  
  if (!configExists) {
    // First time setup
    win.loadFile('renderer/setup.html');
    return;
  }
  
  // Config exists, check if password protection is enabled
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hasPassword = config.adminPassword && config.adminPassword.length > 0;
  
  if (!hasPassword) {
    // No password protection, create session and go to dashboard
    createSession();
    win.loadFile('renderer/index.html');
  } else {
    // Password protection enabled, check session
    const sessionActive = checkSession();
    if (sessionActive) {
      win.loadFile('renderer/index.html');
    } else {
      win.loadFile('renderer/login.html');
    }
  }
}

function checkSession() {
  if (!fs.existsSync(sessionPath)) return false;
  try {
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    // Session expires after 24 hours
    const expiryTime = 24 * 60 * 60 * 1000;
    return (Date.now() - session.timestamp) < expiryTime;
  } catch (e) {
    return false;
  }
}

function createSession() {
  const session = { timestamp: Date.now() };
  fs.writeFileSync(sessionPath, JSON.stringify(session), 'utf8');
}

function clearSession() {
  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
  }
}

function createActivationWindow() {
  win = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('renderer/activation.html');
}

function initializeUserData() {
  // Create userData directory structure if it doesn't exist
  const dataDir = path.join(userDataPath, 'data');
  const reportsDir = path.join(dataDir, 'reports');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
}

app.whenReady().then(() => {
  initializeUserData();
  
  // Start sync server
  syncServer = new SyncServer(userDataPath);
  syncServer.start()
    .then(info => {
      console.log(`✅ Sync server running at ${info.url}`);
    })
    .catch(err => {
      console.error('❌ Failed to start sync server:', err);
    });
  
  // Always open main window - license check will show banner if needed
  createWindow();
  
  // Check for updates after window is created (in production only)
  if (!app.isPackaged) {
    console.log('Development mode - skipping update check');
  } else {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000); // Wait 3 seconds after launch
  }
});

app.on('before-quit', async () => {
  if (syncServer) {
    await syncServer.stop();
  }
});

app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });

ipcMain.on('activate-license', (event, key) => {
  const result = activateSubscription(key);
  if (result.success) {
    event.reply('activation-result', { success: true, expiryDate: result.expiryDate });
    setTimeout(() => {
      app.relaunch();
      app.exit();
    }, 1500);
  } else {
    event.reply('activation-result', { success: false, error: result.error });
  }
});

// Get license status
ipcMain.handle('get-license-status', () => {
  return getLicenseStatus();
});

// Activate license (promise-based for settings page)
ipcMain.handle('activate-license-sync', async (event, key) => {
  const result = activateSubscription(key);
  if (result.success) {
    // Restart will happen after the caller acknowledges success
    return { success: true, expiryDate: result.expiryDate };
  } else {
    return { success: false, error: result.error };
  }
});

// Start trial
ipcMain.handle('start-trial', () => {
  return startTrial();
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

// ============ SYNC SERVER IPC HANDLERS ============

// Start pairing mode and get QR code
ipcMain.handle('sync-start-pairing', async () => {
  if (!syncServer) {
    return { success: false, error: 'Sync server not running' };
  }
  
  try {
    const response = await fetch(`http://localhost:${syncServer.port}/api/pairing/start`, {
      method: 'POST'
    });
    const data = await response.json();
    
    const { generatePairingQR } = require('./qr-generator');
    const qrCode = await generatePairingQR(data.serverUrl, data.pairingToken);
    
    return {
      success: true,
      qrCode: qrCode,
      serverUrl: data.serverUrl,
      pairingToken: data.pairingToken,
      expiresIn: data.expiresIn
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get list of paired devices
ipcMain.handle('sync-get-paired-devices', async () => {
  if (!syncServer) {
    return { devices: [] };
  }
  
  try {
    const response = await fetch(`http://localhost:${syncServer.port}/api/paired-devices`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { devices: [] };
  }
});

// Unpair a device
ipcMain.handle('sync-unpair-device', async (event, deviceId) => {
  if (!syncServer) {
    return { success: false };
  }
  
  try {
    const response = await fetch(`http://localhost:${syncServer.port}/api/unpair/${deviceId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get sync server information
ipcMain.handle('sync-get-server-info', async () => {
  if (!syncServer) {
    return { running: false };
  }
  
  return {
    running: true,
    url: syncServer.getServerUrl(),
    port: syncServer.port
  };
});

// Get subscription info
ipcMain.handle('get-subscription-info', () => {
  return {
    price: SUBSCRIPTION_PRICE,
    trialDays: TRIAL_DAYS
  };
});

// Restart app
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.on('load-page', (event, page) => {
  if (win) win.loadFile(`renderer/${page}.html`);
});

// Auto-updater IPC handlers
ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) {
    sendStatusToWindow('update-not-available', { message: 'Updates only work in production build' });
    return;
  }
  autoUpdater.checkForUpdates();
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('read-csv', (event, filePath) => {
  const fullPath = path.join(userDataPath, filePath);
  if (!fs.existsSync(fullPath)) return [];
  let content = fs.readFileSync(fullPath, 'utf8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  // Remove "sep=," line if present
  if (content.startsWith('sep=,')) {
    const firstNewline = content.indexOf('\n');
    if (firstNewline > 0) {
      content = content.slice(firstNewline + 1);
    }
  }
  const result = Papa.parse(content, { 
    header: true,
    skipEmptyLines: true,
    delimiter: ","
  });
  return result.data;
});

ipcMain.handle('file-exists', (event, filePath) => {
  const fullPath = path.join(userDataPath, filePath);
  return fs.existsSync(fullPath);
});

ipcMain.handle('write-csv', (event, filePath, data) => {
  const fullPath = path.join(userDataPath, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const csv = Papa.unparse(data, {
    quotes: false, // Don't quote all fields - only when needed
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ",",
    header: true,
    newline: "\r\n" // Windows line endings for Excel
  });
  // Add UTF-8 BOM and delimiter declaration for Excel
  const BOM = '\uFEFF';
  const delimiterDeclaration = 'sep=,\r\n';
  fs.writeFileSync(fullPath, BOM + delimiterDeclaration + csv, 'utf8');
});

ipcMain.handle('read-config', () => {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
});

ipcMain.handle('write-config', (event, config) => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
});

ipcMain.handle('hash-password', (event, pwd) => {
  return bcrypt.hashSync(pwd, 10);
});

ipcMain.handle('compare-password', (event, pwd, hash) => {
  return bcrypt.compareSync(pwd, hash);
});

ipcMain.handle('create-session', () => {
  createSession();
});

ipcMain.handle('clear-session', () => {
  clearSession();
});

ipcMain.handle('export-staff-file', async () => {
  const { dialog } = require('electron');
  
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(win, {
      title: 'Export Staff Data for Mobile App',
      defaultPath: path.join(app.getPath('downloads'), 'nivto_staff_export.csv'),
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, cancelled: true };
    }
    
    // Read staff.csv from userData
    const staffPath = path.join(userDataPath, 'staff.csv');
    if (!fs.existsSync(staffPath)) {
      return { success: false, error: 'No staff data found' };
    }
    
    // Read and clean the CSV content for Android compatibility
    let content = fs.readFileSync(staffPath, 'utf8');
    
    // Remove BOM if present (Android CSV readers may not handle this well)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // Write cleaned content without BOM
    fs.writeFileSync(result.filePath, content, 'utf8');
    
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pdf', (event, filePath, headerInfo, tableData, title, isPayslip = false) => {
  const fullPath = path.join(userDataPath, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(fs.createWriteStream(fullPath));
  
  const now = new Date();
  
  // Check if this is an individual payslip
  if (isPayslip && tableData && tableData.length === 1) {
    // Generate payslip format matching CSG layout
    const employee = tableData[0];
    
    // Top Header - Company info on right
    const margin = 40;
    let currentY = 50;
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text(headerInfo.companyName || 'COMPANY NAME', 350, currentY, { width: 200, align: 'left' });
    
    currentY += 12;
    if (headerInfo.address) {
      doc.fontSize(8)
         .font('Helvetica')
         .text(headerInfo.address, 350, currentY, { width: 200, align: 'left' });
      currentY += 10;
    }
    
    if (headerInfo.contact) {
      doc.fontSize(8)
         .text(`Tel.: ${headerInfo.contact}`, 350, currentY, { width: 200, align: 'left' });
    }
    
    // Top Employee Summary
    currentY = 80;
    doc.fontSize(8)
       .font('Helvetica');
    
    doc.font('Helvetica-Bold').text('First Names:', margin, currentY);
    doc.font('Helvetica').text(employee['Employee Name']?.split(' ')[0] || '', margin + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Last Name:', margin + 180, currentY);
    doc.font('Helvetica').text(employee['Employee Name']?.split(' ').slice(1).join(' ') || '', margin + 240, currentY);
    
    doc.font('Helvetica-Bold').text('Identity No.:', 380, currentY);
    doc.font('Helvetica').text(employee['ID Number'] || '', 440, currentY);
    
    currentY += 15;
    doc.font('Helvetica-Bold').text('Empl. No.:', margin, currentY);
    doc.font('Helvetica').text(employee['Employee ID'] || '', margin + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Run:', 380, currentY);
    doc.font('Helvetica').text(employee.Period || '', 440, currentY);
    
    // Dotted separator line
    currentY += 20;
    const drawDottedLine = (y) => {
      for (let x = margin; x < 555; x += 5) {
        doc.moveTo(x, y).lineTo(x + 2, y).stroke();
      }
    };
    drawDottedLine(currentY);
    
    // Main Details Section
    currentY += 15;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text(`Company: ${headerInfo.companyName || 'N/A'}`, margin, currentY);
    
    doc.font('Helvetica').text(`Run: ${employee.Period || ''}`, 380, currentY);
    
    currentY += 15;
    doc.fontSize(8);
    
    // Employee details in structured layout
    const col1 = margin;
    const col2 = margin + 180;
    const col3 = 380;
    const lineH = 14;
    
    doc.font('Helvetica-Bold').text('First Names:', col1, currentY);
    doc.font('Helvetica').text(employee['Employee Name']?.split(' ')[0] || '', col1 + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Last Name:', col2, currentY);
    doc.font('Helvetica').text(employee['Employee Name']?.split(' ').slice(1).join(' ') || '', col2 + 60, currentY);
    
    doc.font('Helvetica-Bold').text('Identity No.:', col3, currentY);
    doc.font('Helvetica').text(employee['ID Number'] || '', col3 + 60, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Position:', col1, currentY);
    doc.font('Helvetica').text(employee.Position || '', col1 + 70, currentY, { width: 100 });
    
    doc.font('Helvetica-Bold').text('Period End Date:', col2, currentY);
    doc.font('Helvetica').text(employee.Period?.split(' to ')[1] || '', col2 + 80, currentY);
    
    doc.font('Helvetica-Bold').text('Empl. Number:', col3, currentY);
    doc.font('Helvetica').text(employee['Employee ID'] || '', col3 + 70, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Engagement Date:', col1, currentY);
    doc.font('Helvetica').text(employee.Period?.split(' to ')[0] || '', col1 + 90, currentY);
    
    doc.font('Helvetica-Bold').text('Termination Date:', col2, currentY);
    doc.font('Helvetica').text('', col2 + 90, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Cost Centre:', col1, currentY);
    doc.font('Helvetica').text(employee.Position || '', col1 + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Pay Rate:', col3, currentY);
    doc.font('Helvetica').text(`R ${employee.Rate || '0'}`, col3 + 60, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Bank Name:', col1, currentY);
    doc.font('Helvetica').text(employee['Bank Name'] || '', col1 + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Branch Code:', col2, currentY);
    doc.font('Helvetica').text(employee['Branch Code'] || '', col2 + 70, currentY);
    
    doc.font('Helvetica-Bold').text('Account Number:', col3, currentY);
    doc.font('Helvetica').text(employee['Account Number'] || '', col3 + 90, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Tax Ref. Number:', col1, currentY);
    doc.font('Helvetica').text(employee['Tax Ref'] || '', col1 + 85, currentY);
    
    doc.font('Helvetica-Bold').text('UIF Number:', col2, currentY);
    doc.font('Helvetica').text(employee['UIF Ref'] || '', col2 + 65, currentY);
    
    currentY += lineH;
    doc.font('Helvetica-Bold').text('Phys. Add.:', col1, currentY);
    doc.font('Helvetica').text(employee.Address || '', col1 + 70, currentY, { width: 200 });
    
    // Income Table
    currentY += 25;
    drawDottedLine(currentY);
    currentY += 15;
    
    const gross = parseFloat(employee['Gross Pay'] || 0);
    const uif = parseFloat(employee['UIF Deduction'] || 0);
    const paye = parseFloat(employee['PAYE Deduction'] || 0);
    const tax = parseFloat(employee['Tax Deduction'] || 0);
    const net = gross - uif - paye - tax;
    
    const workedValue = (employee['Days Worked'] !== undefined) ? employee['Days Worked'] : employee['Hours Worked'];
    const rateValue = parseFloat(employee.Rate || 0);
    
    // Income table
    doc.fontSize(8)
       .font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Income', margin + 5, currentY + 4);
    doc.text('Qty', 350, currentY + 4);
    doc.text('Current', 420, currentY + 4);
    doc.text('YTD Amount', 490, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica');
    doc.text('Basic Pay', margin + 5, currentY + 4);
    doc.text(workedValue || '0', 350, currentY + 4);
    doc.text(rateValue.toFixed(2), 420, currentY + 4);
    doc.text('', 490, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Total Earnings', margin + 5, currentY + 4);
    doc.text(gross.toFixed(2), 420, currentY + 4);
    
    // Deductions table
    currentY += 20;
    doc.font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Deductions', margin + 5, currentY + 4);
    doc.text('Balance', 350, currentY + 4);
    doc.text('Current', 420, currentY + 4);
    doc.text('YTD Amount', 490, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica');
    doc.text('Tax Paid', margin + 5, currentY + 4);
    doc.text(tax.toFixed(2), 420, currentY + 4);
    
    currentY += 15;
    doc.text('UIF Employee', margin + 5, currentY + 4);
    doc.text(uif.toFixed(2), 420, currentY + 4);
    
    if (paye > 0) {
      currentY += 15;
      doc.text('PAYE', margin + 5, currentY + 4);
      doc.text(paye.toFixed(2), 420, currentY + 4);
    }
    
    currentY += 15;
    doc.font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Total Deductions', margin + 5, currentY + 4);
    doc.text((uif + paye + tax).toFixed(2), 420, currentY + 4);
    
    // Net Pay
    currentY += 20;
    doc.rect(margin, currentY, 515, 20).fillAndStroke('#f0f0f0', '#000');
    doc.fontSize(10).fillColor('#000').text('Net Pay', margin + 5, currentY + 5);
    doc.text(net.toFixed(2), 420, currentY + 5);
    
    // Company Contributions
    currentY += 30;
    doc.fontSize(8)
       .font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Company Contributions', margin + 5, currentY + 4);
    doc.text('Current', 420, currentY + 4);
    doc.text('YTD Amount', 490, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica');
    const uifEmployer = (gross * 0.01).toFixed(2);
    doc.text('UIF Employer', margin + 5, currentY + 4);
    doc.text(uifEmployer, 420, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text("Total CC's", margin + 5, currentY + 4);
    doc.text(uifEmployer, 420, currentY + 4);
    
    // Leave Information
    currentY += 25;
    doc.fontSize(8)
       .font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Leave Balance', margin + 5, currentY + 4);
    doc.text('Days', 420, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica');
    const annualLeave = parseFloat(employee['Leave Days']) || 15;
    const usedLeave = parseFloat(employee['Leave Used']) || 0;
    const remainingLeave = parseFloat(employee['Leave Remaining']) || annualLeave;
    
    doc.text('Annual Leave Allocation', margin + 5, currentY + 4);
    doc.text(annualLeave.toFixed(1), 420, currentY + 4);
    
    currentY += 15;
    doc.text('Leave Days Used', margin + 5, currentY + 4);
    doc.text(usedLeave, 420, currentY + 4);
    
    currentY += 15;
    doc.font('Helvetica-Bold');
    doc.rect(margin, currentY, 515, 15).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Leave Days Remaining', margin + 5, currentY + 4);
    doc.text(remainingLeave, 420, currentY + 4);
    
  } else {
    // Original table format for multiple employees or reports
    let currentPage = 1;
  
  // Company Header - More compact
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text(headerInfo.companyName || 'Company Name', { align: 'center' });
  
  doc.moveDown(0.2);
  
  if (headerInfo.address) {
    doc.fontSize(8)
       .font('Helvetica')
       .text(headerInfo.address, { align: 'center' });
  }
  
  if (headerInfo.contact) {
    doc.fontSize(8)
       .text(headerInfo.contact, { align: 'center' });
  }
  
  // Separator line
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y)
     .lineTo(555, doc.y)
     .stroke();
  doc.moveDown(0.5);
  
  // Report Title
  doc.fontSize(13)
     .font('Helvetica-Bold')
     .text(title, { align: 'center' });
  
  // Date Generated
  const now = new Date();
  const dateStr = now.toLocaleString('en-ZA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.fontSize(8)
     .font('Helvetica')
     .text(`Generated: ${dateStr}`, { align: 'center' });
  
  doc.moveDown(1);
  
  // Table
  if (tableData && tableData.length > 0) {
    const headers = Object.keys(tableData[0]);
    let startX = 40;
    let startY = doc.y;
    
    // Define custom column widths for better spacing
    const getColumnWidth = (header) => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('employee id') || headerLower.includes('employeeid')) return 45;
      if (headerLower.includes('employee name') || headerLower.includes('name')) return 90;
      if (headerLower.includes('hours')) return 50;
      if (headerLower.includes('rate type')) return 50;
      if (headerLower.includes('rate') && !headerLower.includes('type')) return 50;
      if (headerLower.includes('gross')) return 60;
      if (headerLower.includes('uif')) return 50;
      if (headerLower.includes('paye')) return 50;
      if (headerLower.includes('tax')) return 50;
      if (headerLower.includes('net')) return 60;
      return 50; // default
    };
    
    const columnWidths = headers.map(h => getColumnWidth(h));
    
    // Table Headers
    doc.fontSize(8)
       .font('Helvetica-Bold');
    
    let currentX = startX;
    headers.forEach((header, i) => {
      doc.text(header, currentX, startY, {
        width: columnWidths[i] - 5,
        align: 'left',
        lineBreak: true
      });
      currentX += columnWidths[i];
    });
    
    // Header underline
    doc.moveDown(1.2);
    doc.moveTo(40, doc.y)
       .lineTo(555, doc.y)
       .stroke();
    doc.moveDown(0.4);
    
    // Table Rows
    doc.font('Helvetica')
       .fontSize(7.5);
    
    tableData.forEach((row, rowIndex) => {
      startY = doc.y;
      
      // Check if we need a new page - more generous limit for 2 pages
      if (startY > 700) {
        doc.addPage();
        currentPage++;
        startY = 40;
        doc.y = startY;
      }
      
      const maxHeight = 16;
      
      currentX = startX;
      headers.forEach((header, i) => {
        const value = row[header] || '';
        doc.text(value.toString(), currentX, startY, {
          width: columnWidths[i] - 5,
          align: 'left',
          lineBreak: false
        });
        currentX += columnWidths[i];
      });
      
      doc.y = startY + maxHeight;
      
      // Add subtle separator line every 5 rows
      if ((rowIndex + 1) % 5 === 0) {
        doc.moveTo(40, doc.y)
           .lineTo(555, doc.y)
           .strokeOpacity(0.15)
           .stroke()
           .strokeOpacity(1);
        doc.moveDown(0.3);
      }
    });
    
    // Calculate totals for payout reports
    if (title.toLowerCase().includes('payout')) {
      // Check if summary will fit on current page
      if (doc.y > 680) {
        doc.addPage();
        currentPage++;
        doc.y = 40;
      }
      
      doc.moveDown(1.5);
      doc.moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .lineWidth(1.5)
         .stroke()
         .lineWidth(1);
      doc.moveDown(1);
      
      let totalHours = 0;
      let totalGross = 0;
      let totalUIF = 0;
      let totalPAYE = 0;
      let totalTax = 0;
      let totalNet = 0;
      
      tableData.forEach(row => {
        totalHours += parseFloat(row['Hours Worked'] || row.Hours || 0);
        totalGross += parseFloat(row['Gross Pay'] || row.Gross || 0);
        totalUIF += parseFloat(row['UIF Deduction'] || row.UIF || 0);
        totalPAYE += parseFloat(row['PAYE Deduction'] || row.PAYE || 0);
        totalTax += parseFloat(row['Tax Deduction'] || row.Tax || 0);
        totalNet += parseFloat(row['Net Pay'] || row.NetPay || 0);
      });
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('SUMMARY', 40);
      doc.moveDown(0.5);
      
      doc.fontSize(8)
         .font('Helvetica');
      
      const summaryStartY = doc.y;
      const leftCol = 40;
      const rightCol = 280;
      const lineSpacing = 14;
      
      doc.text(`Total Employees:`, leftCol, summaryStartY);
      doc.text(`${tableData.length}`, rightCol, summaryStartY);
      
      doc.text(`Total Hours:`, leftCol, summaryStartY + lineSpacing);
      doc.text(`${totalHours.toFixed(2)}`, rightCol, summaryStartY + lineSpacing);
      
      doc.text(`Total Gross Pay:`, leftCol, summaryStartY + lineSpacing * 2);
      doc.text(`R ${totalGross.toFixed(2)}`, rightCol, summaryStartY + lineSpacing * 2);
      
      doc.text(`Total UIF Deductions:`, leftCol, summaryStartY + lineSpacing * 3);
      doc.text(`R ${totalUIF.toFixed(2)}`, rightCol, summaryStartY + lineSpacing * 3);
      
      doc.text(`Total PAYE Deductions:`, leftCol, summaryStartY + lineSpacing * 4);
      doc.text(`R ${totalPAYE.toFixed(2)}`, rightCol, summaryStartY + lineSpacing * 4);
      
      doc.text(`Total Tax Deductions:`, leftCol, summaryStartY + lineSpacing * 5);
      doc.text(`R ${totalTax.toFixed(2)}`, rightCol, summaryStartY + lineSpacing * 5);
      
      doc.text(`Total Deductions:`, leftCol, summaryStartY + lineSpacing * 6);
      doc.text(`R ${(totalUIF + totalPAYE + totalTax).toFixed(2)}`, rightCol, summaryStartY + lineSpacing * 6);
      
      doc.y = summaryStartY + lineSpacing * 7;
      doc.moveDown(0.5);
      doc.fontSize(9)
         .font('Helvetica-Bold');
      
      const netPayY = doc.y;
      doc.text(`TOTAL NET PAY:`, leftCol, netPayY);
      doc.text(`R ${totalNet.toFixed(2)}`, rightCol, netPayY);
    }
  }
  
  // Footer with proper page numbering and company info
  const totalPages = currentPage;
  const footerY = 770;
  const footerSeparatorY = 760;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i > 1) {
      doc.switchToPage(i - 1);
    }
    
    // Footer separator line
    doc.moveTo(40, footerSeparatorY)
       .lineTo(555, footerSeparatorY)
       .strokeOpacity(0.3)
       .stroke()
       .strokeOpacity(1);
    
    // Footer content
    doc.fontSize(7)
       .font('Helvetica');
    
    // Company name on left
    doc.text(headerInfo.companyName || 'StaffManager', 40, footerY, { 
      align: 'left',
      width: 150
    });
    
    // Page number in center
    doc.text(`Page ${i} of ${totalPages}`, 40, footerY, { 
      align: 'center',
      width: 515
    });
    
    // Date on right
    const footerDate = now.toLocaleDateString('en-ZA');
    doc.text(footerDate, 405, footerY, { 
      align: 'right',
      width: 150
    });
  }
  
  } // End of if-else for payslip vs table format
  
  doc.end();
});

ipcMain.handle('open-pdf', async (event, filePath) => {
  const fullPath = path.join(userDataPath, filePath);
  if (fs.existsSync(fullPath)) {
    await shell.openPath(fullPath);
    return true;
  }
  return false;
});