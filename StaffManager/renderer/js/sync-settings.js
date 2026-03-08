// Sync Settings Page Logic

let qrCodeTimer = null;
let qrCodeExpiryTime = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sync settings page loaded');
    loadServerStatus();
    loadPairedDevices();
});

// Load server status
async function loadServerStatus() {
    try {
        const info = await window.api.syncGetServerInfo();
        const statusDiv = document.getElementById('serverStatus');
        const statusText = document.getElementById('serverStatusText');
        const urlText = document.getElementById('serverUrl');
        
        if (info.running) {
            statusText.textContent = '✅ Server Running';
            urlText.textContent = `Server URL: ${info.url}`;
        } else {
            statusText.textContent = '❌ Server Not Running';
            urlText.textContent = 'Please restart the application';
        }
    } catch (error) {
        console.error('Failed to load server status:', error);
        document.getElementById('serverStatusText').textContent = '⚠️ Error loading status';
    }
}

// Generate QR code for pairing
async function generateQRCode() {
    const btn = document.getElementById('generateQRBtn');
    const qrImage = document.getElementById('qrCodeImage');
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrPlaceholder = document.getElementById('qrCodePlaceholder');
    const qrExpiry = document.getElementById('qrCodeExpiry');
    
    try {
        btn.disabled = true;
        btn.textContent = '⏳ Generating...';
        
        const result = await window.api.syncStartPairing();
        
        if (result.success) {
            // Display QR code
            qrImage.src = result.qrCode;
            qrContainer.style.display = 'block';
            qrPlaceholder.style.display = 'none';
            
            btn.textContent = '✓ QR Code Generated';
            btn.style.background = '#28a745';
            
            // Start expiry countdown
            qrCodeExpiryTime = Date.now() + (result.expiresIn * 1000);
            startExpiryCountdown();
            
            // Show success message
            showNotification('QR Code generated! Scan with your Android app within 5 minutes.', 'success');
            
            // Auto-refresh devices after pairing might complete
            setTimeout(() => {
                loadPairedDevices();
            }, 10000); // Check after 10 seconds
        } else {
            throw new Error(result.error || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('QR generation error:', error);
        showNotification('Failed to generate QR code: ' + error.message, 'error');
        btn.textContent = '🔐 Generate QR Code';
    } finally {
        btn.disabled = false;
    }
}

// Countdown timer for QR code expiry
function startExpiryCountdown() {
    if (qrCodeTimer) {
        clearInterval(qrCodeTimer);
    }
    
    const qrExpiry = document.getElementById('qrCodeExpiry');
    const btn = document.getElementById('generateQRBtn');
    
    qrCodeTimer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((qrCodeExpiryTime - now) / 1000));
        
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            qrExpiry.textContent = `⏰ Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            qrExpiry.textContent = '⚠️ QR code expired - generate a new one';
            document.getElementById('qrCodeContainer').style.display = 'none';
            document.getElementById('qrCodePlaceholder').style.display = 'block';
            btn.textContent = '🔐 Generate QR Code';
            btn.style.background = '';
            clearInterval(qrCodeTimer);
        }
    }, 1000);
}

// Load paired devices
async function loadPairedDevices() {
    try {
        const result = await window.api.syncGetPairedDevices();
        const container = document.getElementById('pairedDevicesContainer');
        
        if (!result.devices || result.devices.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #999;">
                    <p>No devices paired yet</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Generate a QR code above to pair your Android device</p>
                </div>
            `;
            return;
        }
        
        // Display devices in a table
        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Device Name</th>
                            <th>Model</th>
                            <th>Paired Date</th>
                            <th>Last Sync</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        result.devices.forEach(device => {
            const pairedDate = new Date(device.pairedAt).toLocaleString();
            const lastSync = device.lastSync ? new Date(device.lastSync).toLocaleString() : 'Never';
            
            html += `
                <tr>
                    <td><strong>${escapeHtml(device.name)}</strong></td>
                    <td>${escapeHtml(device.model)}</td>
                    <td>${pairedDate}</td>
                    <td>${lastSync}</td>
                    <td>
                        <button class="btn-danger" onclick="unpairDevice('${device.id}', '${escapeHtml(device.name)}')">
                            🗑️ Unpair
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load paired devices:', error);
        document.getElementById('pairedDevicesContainer').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>⚠️ Error loading devices</p>
            </div>
        `;
    }
}

// Unpair a device
async function unpairDevice(deviceId, deviceName) {
    if (!confirm(`Are you sure you want to unpair "${deviceName}"?\n\nThe device will need to scan a new QR code to sync again.`)) {
        return;
    }
    
    try {
        const result = await window.api.syncUnpairDevice(deviceId);
        
        if (result.success) {
            showNotification(`Device "${deviceName}" unpaired successfully`, 'success');
            loadPairedDevices(); // Refresh list
        } else {
            throw new Error(result.error || 'Failed to unpair device');
        }
    } catch (error) {
        console.error('Unpair error:', error);
        showNotification('Failed to unpair device: ' + error.message, 'error');
    }
}

// Refresh devices list manually
function refreshDevices() {
    loadPairedDevices();
    showNotification('Device list refreshed', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#2196F3'};
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
