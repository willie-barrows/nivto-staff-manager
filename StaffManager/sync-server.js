const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SyncServer {
    constructor(dataPath) {
        console.log('🔧 Initializing SyncServer with dataPath:', dataPath);
        this.app = express();
        this.server = null;
        this.port = 8081; // Changed from 8080 to avoid Apache conflict
        this.dataPath = dataPath;
        this.pairedDevices = new Map(); // deviceId -> { token, name, pairedAt }
        this.pairingToken = null;
        this.io = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.loadPairedDevices();
        console.log('🔧 SyncServer initialized successfully');
    }
    
    setupMiddleware() {
        this.app.use(bodyParser.json());
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'online',
                version: '1.0.1',
                timestamp: Date.now(),
                serverUrl: this.getServerUrl()
            });
        });
        
        // Start pairing mode (generates pairing token)
        this.app.post('/api/pairing/start', (req, res) => {
            this.pairingToken = uuidv4();
            setTimeout(() => {
                this.pairingToken = null; // Token expires after 5 minutes
            }, 5 * 60 * 1000);
            
            res.json({
                success: true,
                pairingToken: this.pairingToken,
                serverUrl: this.getServerUrl(),
                expiresIn: 300 // seconds
            });
        });
        
        // Pair device
        this.app.post('/api/pair', (req, res) => {
            const { deviceId, deviceName, pairingToken } = req.body;
            
            if (!deviceId || !deviceName || !pairingToken) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            if (pairingToken !== this.pairingToken) {
                return res.status(401).json({ error: 'Invalid or expired pairing token' });
            }
            
            // Generate permanent device token
            const deviceToken = uuidv4();
            this.pairedDevices.set(deviceId, {
                token: deviceToken,
                name: deviceName,
                pairedAt: Date.now()
            });
            
            this.savePairedDevices();
            this.pairingToken = null; // One-time use
            
            res.json({
                success: true,
                deviceToken: deviceToken,
                serverUrl: this.getServerUrl()
            });
        });
        
        // Get paired devices
        this.app.get('/api/paired-devices', (req, res) => {
            const devices = Array.from(this.pairedDevices.entries()).map(([id, info]) => ({
                deviceId: id,
                deviceName: info.name,
                pairedAt: info.pairedAt
            }));
            res.json({ devices });
        });
        
        // Unpair device
        this.app.delete('/api/unpair/:deviceId', (req, res) => {
            const { deviceId } = req.params;
            this.pairedDevices.delete(deviceId);
            this.savePairedDevices();
            res.json({ success: true });
        });
        
        // Middleware to validate device token
        const validateToken = (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Missing authorization token' });
            }
            
            const token = authHeader.substring(7);
            let validDevice = null;
            
            for (const [deviceId, info] of this.pairedDevices.entries()) {
                if (info.token === token) {
                    validDevice = { deviceId, ...info };
                    break;
                }
            }
            
            if (!validDevice) {
                return res.status(401).json({ error: 'Invalid device token' });
            }
            
            req.device = validDevice;
            next();
        };
        
        // Get license status
        this.app.get('/api/license', validateToken, (req, res) => {
            try {
                const { loadLicense, getLicenseStatus } = require('./license');
                const license = loadLicense();
                const status = getLicenseStatus();
                
                res.json({
                    success: true,
                    license: {
                        type: license?.type || 'unknown',
                        expiryDate: license?.expiryDate || null,
                        daysRemaining: status.daysRemaining,
                        isValid: status.isValid,
                        isExpired: status.isExpired,
                        isTrial: status.isTrial,
                        message: status.message
                    }
                });
            } catch (error) {
                console.error('Error reading license:', error);
                res.status(500).json({ error: 'Failed to read license status' });
            }
        });
        
        // Get employees list
        this.app.get('/api/employees', validateToken, (req, res) => {
            try {
                const staffPath = path.join(this.dataPath, 'staff.csv');
                if (!fs.existsSync(staffPath)) {
                    return res.json({ employees: [] });
                }
                
                const Papa = require('papaparse');
                let content = fs.readFileSync(staffPath, 'utf8');
                
                // Remove Excel separator line if present
                const lines = content.split('\n');
                if (lines[0].trim().startsWith('sep=')) {
                    content = lines.slice(1).join('\n');
                }
                
                const result = Papa.parse(content, { header: true, skipEmptyLines: true });
                
                const employees = result.data.filter(emp => emp.Active === 'Yes').map(emp => ({
                    employeeId: emp['Employee ID'] || emp.EmployeeID,
                    employeeName: emp['Employee Name'] || emp.Name,
                    position: emp.Position || '',
                    idNumber: emp['ID Number'] || '',
                    rate: emp.Rate || '',
                    rateType: emp['Rate Type'] || emp.RateType || '',
                    active: true
                }));
                
                console.log(`[SYNC] Returning ${employees.length} active employees`);
                res.json({ employees });
            } catch (error) {
                console.error('Error reading employees:', error);
                res.status(500).json({ error: 'Failed to read employees' });
            }
        });
        
        // Clock in
        this.app.post('/api/clock-in', validateToken, (req, res) => {
            try {
                const { employeeId, timestamp, location } = req.body;
                
                if (!employeeId || !timestamp) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                
                const date = new Date(timestamp);
                const dateStr = this.formatDate(date);
                const timeStr = this.formatTime(date);
                
                const attendancePath = path.join(this.dataPath, 'data', `attendance_${dateStr}.csv`);
                const recordId = `${employeeId}_${Date.now()}`;
                
                // Get employee name from staff.csv
                const staffPath = path.join(this.dataPath, 'staff.csv');
                let employeeName = employeeId;
                if (fs.existsSync(staffPath)) {
                    const Papa = require('papaparse');
                    let staffContent = fs.readFileSync(staffPath, 'utf8');
                    const lines = staffContent.split('\n');
                    if (lines[0].trim().startsWith('sep=')) {
                        staffContent = lines.slice(1).join('\n');
                    }
                    const staffResult = Papa.parse(staffContent, { header: true, skipEmptyLines: true });
                    const employee = staffResult.data.find(emp => 
                        (emp['Employee ID'] || emp.EmployeeID) === employeeId
                    );
                    if (employee) {
                        employeeName = employee['Employee Name'] || employee.Name || employeeId;
                    }
                }
                
                // Read existing records
                let records = [];
                if (fs.existsSync(attendancePath)) {
                    const Papa = require('papaparse');
                    let content = fs.readFileSync(attendancePath, 'utf8');
                    const lines = content.split('\n');
                    if (lines[0].trim().startsWith('sep=')) {
                        content = lines.slice(1).join('\n');
                    }
                    const result = Papa.parse(content, { header: true, skipEmptyLines: true });
                    records = result.data;
                }
                
                // Add new record
                records.push({
                    'Employee ID': employeeId,
                    'Employee Name': employeeName,
                    'Clock In Time': timeStr,
                    'Clock Out Time': '',
                    'Hours Worked': '',
                    'Break Time': '0',
                    'Break Payable': 'No'
                });
                
                // Write back
                const Papa = require('papaparse');
                const csv = Papa.unparse(records);
                const BOM = '\uFEFF';
                const dir = path.dirname(attendancePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(attendancePath, BOM + 'sep=,\n' + csv, 'utf8');
                
                console.log(`[SYNC] Clock-in: ${employeeId} (${employeeName}) at ${timeStr}`);
                
                // Notify connected clients
                if (this.io) {
                    this.io.emit('attendance:update', {
                        type: 'clock-in',
                        employeeId,
                        timestamp,
                        date: dateStr
                    });
                }
                
                res.json({
                    success: true,
                    recordId,
                    timestamp: date.toISOString()
                });
            } catch (error) {
                console.error('Clock-in error:', error);
                res.status(500).json({ error: 'Failed to clock in' });
            }
        });
        
        // Clock out
        this.app.post('/api/clock-out', validateToken, (req, res) => {
            try {
                const { employeeId, timestamp } = req.body;
                
                if (!employeeId || !timestamp) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                
                const date = new Date(timestamp);
                const dateStr = this.formatDate(date);
                const timeStr = this.formatTime(date);
                
                const attendancePath = path.join(this.dataPath, 'data', `attendance_${dateStr}.csv`);
                
                if (!fs.existsSync(attendancePath)) {
                    return res.status(404).json({ error: 'No clock-in record found for today' });
                }
                
                // Read and update record
                const Papa = require('papaparse');
                let content = fs.readFileSync(attendancePath, 'utf8');
                const lines = content.split('\n');
                if (lines[0].trim().startsWith('sep=')) {
                    content = lines.slice(1).join('\n');
                }
                const result = Papa.parse(content, { header: true, skipEmptyLines: true });
                let records = result.data;
                
                // Find last clock-in for this employee
                let updated = false;
                for (let i = records.length - 1; i >= 0; i--) {
                    const empId = records[i]['Employee ID'] || records[i].EmployeeID;
                    const clockOut = records[i]['Clock Out Time'] || records[i]['Clock Out'] || records[i].ClockOutTime;
                    
                    if (empId === employeeId && !clockOut) {
                        records[i]['Clock Out Time'] = timeStr;
                        
                        // Calculate hours
                        const clockIn = records[i]['Clock In Time'] || records[i]['Clock In'] || records[i].ClockInTime;
                        if (clockIn) {
                            const hours = this.calculateHours(clockIn, timeStr);
                            records[i]['Hours Worked'] = hours.toFixed(2);
                        }
                        
                        updated = true;
                        console.log(`[SYNC] Clock-out: ${employeeId} at ${timeStr}, hours: ${records[i]['Hours Worked']}`);
                        break;
                    }
                }
                
                if (!updated) {
                    return res.status(404).json({ error: 'No active clock-in found' });
                }
                
                // Write back
                const csv = Papa.unparse(records);
                const BOM = '\uFEFF';
                fs.writeFileSync(attendancePath, BOM + 'sep=,\n' + csv, 'utf8');
                
                // Notify connected clients
                if (this.io) {
                    this.io.emit('attendance:update', {
                        type: 'clock-out',
                        employeeId,
                        timestamp,
                        date: dateStr
                    });
                }
                
                res.json({
                    success: true,
                    timestamp: date.toISOString(),
                    hoursWorked: records.find(r => 
                        (r['Employee ID'] || r.EmployeeID) === employeeId && 
                        r['Clock Out'] === timeStr
                    )?.['Hours Worked']
                });
            } catch (error) {
                console.error('Clock-out error:', error);
                res.status(500).json({ error: 'Failed to clock out' });
            }
        });
        
        // Batch sync (for offline records)
        this.app.post('/api/sync-batch', validateToken, (req, res) => {
            try {
                const { records } = req.body;
                
                if (!Array.isArray(records) || records.length === 0) {
                    return res.status(400).json({ error: 'No records provided' });
                }
                
                const results = {
                    success: 0,
                    failed: 0,
                    errors: []
                };
                
                for (const record of records) {
                    try {
                        // Simulate processing for now
                        results.success++;
                    } catch (error) {
                        results.failed++;
                        results.errors.push({
                            record: record.employeeId,
                            error: error.message
                        });
                    }
                }
                
                res.json(results);
            } catch (error) {
                console.error('Batch sync error:', error);
                res.status(500).json({ error: 'Failed to process batch' });
            }
        });
    }
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    calculateHours(clockIn, clockOut) {
        const [inHours, inMinutes] = clockIn.split(':').map(Number);
        const [outHours, outMinutes] = clockOut.split(':').map(Number);
        
        const inTotalMinutes = inHours * 60 + inMinutes;
        const outTotalMinutes = outHours * 60 + outMinutes;
        
        const diffMinutes = outTotalMinutes - inTotalMinutes;
        return diffMinutes / 60;
    }
    
    loadPairedDevices() {
        try {
            const devicesPath = path.join(this.dataPath, 'paired-devices.json');
            if (fs.existsSync(devicesPath)) {
                const data = JSON.parse(fs.readFileSync(devicesPath, 'utf8'));
                this.pairedDevices = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('Error loading paired devices:', error);
        }
    }
    
    savePairedDevices() {
        try {
            const devicesPath = path.join(this.dataPath, 'paired-devices.json');
            const data = Object.fromEntries(this.pairedDevices);
            fs.writeFileSync(devicesPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving paired devices:', error);
        }
    }
    
    getServerUrl() {
        const interfaces = os.networkInterfaces();
        let ipAddress = 'localhost';
        
        // Find local IP address
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                // Skip internal and non-IPv4 addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    ipAddress = iface.address;
                    break;
                }
            }
            if (ipAddress !== 'localhost') break;
        }
        
        return `http://${ipAddress}:${this.port}`;
    }
    
    start() {
        return new Promise((resolve, reject) => {
            // Try to start on port 8080, if fails try 8081-8089
            this.tryStartServer(this.port, resolve, reject);
        });
    }
    
    tryStartServer(port, resolve, reject, maxPort = 8089) {
        this.server = this.app.listen(port, () => {
            this.port = port;
            console.log(`✅ Sync server started on ${this.getServerUrl()}`);
            
            // Setup Socket.IO for real-time updates
            const socketIO = require('socket.io');
            this.io = socketIO(this.server, {
                cors: {
                    origin: '*',
                    methods: ['GET', 'POST']
                }
            });
            
            this.io.on('connection', (socket) => {
                console.log('📱 Client connected to real-time updates');
                socket.on('disconnect', () => {
                    console.log('📱 Client disconnected');
                });
            });
            
            resolve({
                port: this.port,
                url: this.getServerUrl()
            });
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE' && port < maxPort) {
                console.log(`Port ${port} in use, trying ${port + 1}...`);
                this.tryStartServer(port + 1, resolve, reject, maxPort);
            } else {
                reject(err);
            }
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Sync server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = SyncServer;
