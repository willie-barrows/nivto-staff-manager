const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('api', {
    readCSV: (filePath) => ipcRenderer.invoke('read-csv', filePath),
    writeCSV: (filePath, data) => ipcRenderer.invoke('write-csv', filePath, data),
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
    readConfig: () => ipcRenderer.invoke('read-config'),
    writeConfig: (config) => ipcRenderer.invoke('write-config', config),
    hashPassword: (pwd) => ipcRenderer.invoke('hash-password', pwd),
    comparePassword: (pwd, hash) => ipcRenderer.invoke('compare-password', pwd, hash),
    createSession: () => ipcRenderer.invoke('create-session'),
    clearSession: () => ipcRenderer.invoke('clear-session'),
    exportPDF: (filePath, headerInfo, tableData, title, isPayslip) => ipcRenderer.invoke('export-pdf', filePath, headerInfo, tableData, title, isPayslip),
    openPDF: (filePath) => ipcRenderer.invoke('open-pdf', filePath),
    loadPage: (page) => ipcRenderer.send('load-page', page),
    exportStaffFile: () => ipcRenderer.invoke('export-staff-file'),
    
    // Auto-updater API
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    installUpdate: () => ipcRenderer.send('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, data) => callback(data)),
    
    // License and subscription
    getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
    getSubscriptionInfo: () => ipcRenderer.invoke('get-subscription-info'),
    activateLicense: (key) => ipcRenderer.invoke('activate-license-sync', key),
    startTrial: () => ipcRenderer.invoke('start-trial'),
    
    // Open external URL
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Restart app
    restartApp: () => ipcRenderer.invoke('restart-app'),
    
    // Sync server APIs
    syncStartPairing: () => ipcRenderer.invoke('sync-start-pairing'),
    syncGetPairedDevices: () => ipcRenderer.invoke('sync-get-paired-devices'),
    syncUnpairDevice: (deviceId) => ipcRenderer.invoke('sync-unpair-device', deviceId),
    syncGetServerInfo: () => ipcRenderer.invoke('sync-get-server-info')
});

console.log('window.api exposed successfully');