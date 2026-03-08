// Initialize on page load
window.onload = () => {
    init();
};

async function init() {
    const config = await window.api.readConfig();
    document.getElementById('companyName').value = config.companyName || '';
    document.getElementById('address').value = config.address || '';
    document.getElementById('contact').value = config.contact || '';
    document.getElementById('workStart').value = config.workStart || "08:00";
    document.getElementById('workEnd').value = config.workEnd || "17:00";
    document.getElementById('defaultUIF').value = config.defaultUIF || 1;
    document.getElementById('defaultPAYE').value = config.defaultPAYE || 0;
    document.getElementById('defaultTax').value = config.defaultTax || 10;
    
    // Load mobile PIN settings
    if (config.mobilePIN) {
        document.getElementById('enableMobilePin').checked = true;
        document.getElementById('mobilePinSection').style.display = 'block';
        document.getElementById('mobilePIN').value = config.mobilePIN;
        document.getElementById('mobilePINConfirm').value = config.mobilePIN;
    }
    
    // Show logout button only if password protection is enabled
    const hasPassword = config.adminPassword && config.adminPassword.length > 0;
    if (hasPassword) {
        document.getElementById('logoutBtn').style.display = 'inline-flex';
    }
    
    // Load license status and app version
    await loadLicenseStatus();
    await loadAppVersion();
}

// Toggle mobile PIN section
document.getElementById('enableMobilePin').addEventListener('change', (e) => {
    const section = document.getElementById('mobilePinSection');
    section.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
        document.getElementById('mobilePIN').value = '';
        document.getElementById('mobilePINConfirm').value = '';
    }
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = await window.api.readConfig();
    
    // Update all settings
    config.companyName = document.getElementById('companyName').value;
    config.address = document.getElementById('address').value;
    config.contact = document.getElementById('contact').value;
    config.workStart = document.getElementById('workStart').value;
    config.workEnd = document.getElementById('workEnd').value;
    config.defaultUIF = document.getElementById('defaultUIF').value;
    config.defaultPAYE = document.getElementById('defaultPAYE').value;
    config.defaultTax = document.getElementById('defaultTax').value;
    
    const pwd = document.getElementById('adminPwd').value;
    if(pwd) {
        config.adminPassword = await window.api.hashPassword(pwd);
    }
    
    // Validate and save mobile PIN
    const enableMobilePin = document.getElementById('enableMobilePin').checked;
    if (enableMobilePin) {
        const pin = document.getElementById('mobilePIN').value;
        const pinConfirm = document.getElementById('mobilePINConfirm').value;
        
        if (!pin) {
            alert('❌ Please enter a mobile PIN');
            return;
        }
        
        if (!/^\d{4,6}$/.test(pin)) {
            alert('❌ Mobile PIN must be 4-6 digits');
            return;
        }
        
        if (pin !== pinConfirm) {
            alert('❌ Mobile PIN and confirmation do not match');
            return;
        }
        
        config.mobilePIN = pin;
    } else {
        // Remove mobile PIN if unchecked
        delete config.mobilePIN;
    }
    
    await window.api.writeConfig(config);
    alert("✅ Settings saved successfully!");
    document.getElementById('adminPwd').value = ''; // Clear password field
});

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        await window.api.clearSession();
        location.href = 'login.html';
    }
}

// Auto-updater functions
async function loadAppVersion() {
    try {
        const version = await window.api.getAppVersion();
        document.getElementById('currentVersion').textContent = 'v' + version;
    } catch (error) {
        document.getElementById('currentVersion').textContent = 'Unknown';
    }
}

// Load license/subscription status
async function loadLicenseStatus() {
    try {
        const status = await window.api.getLicenseStatus();
        const subscriptionInfo = await window.api.getSubscriptionInfo();
        
        const messageEl = document.getElementById('licenseMessage');
        const detailsEl = document.getElementById('licenseDetails');
        
        if (!status || !status.hasLicense) {
            messageEl.innerHTML = '⚠️ No License Found';
            detailsEl.innerHTML = `Start your ${subscriptionInfo.trialDays}-day free trial or activate your subscription.`;
            return;
        }
        
        if (status.type === 'trial') {
            if (status.valid) {
                messageEl.innerHTML = `🎉 Free Trial Active`;
                detailsEl.innerHTML = `<strong>${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''} remaining</strong><br>` +
                                     `Subscribe for ${subscriptionInfo.price}/month to continue after trial ends.`;
                messageEl.style.color = '#27ae60';
            } else if (status.expired) {
                messageEl.innerHTML = '❌ Trial Expired';
                detailsEl.innerHTML = `Your free trial has ended. Subscribe for ${subscriptionInfo.price}/month to continue using NIVTO Staff Manager.`;
                messageEl.style.color = '#e74c3c';
            }
        } else if (status.type === 'subscription') {
            if (status.valid) {
                const expiryDate = new Date(status.expiryDate).toLocaleDateString();
                messageEl.innerHTML = '✅ Subscription Active';
                detailsEl.innerHTML = `<strong>Valid until: ${expiryDate}</strong><br>` +
                                     `${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''} remaining`;
                messageEl.style.color = '#27ae60';
            } else if (status.expired) {
                messageEl.innerHTML = '❌ Subscription Expired';
                detailsEl.innerHTML = `Your subscription ended. Renew for ${subscriptionInfo.price}/month to continue.`;
                messageEl.style.color = '#e74c3c';
            }
        }
    } catch (error) {
        console.error('Failed to load license status:', error);
        document.getElementById('licenseMessage').textContent = 'Error loading license status';
    }
}

function openActivationHelp() {
    const activationHTML = `
        <div style="text-align: left;">
            <h3 style="margin-top: 0; color: #667eea;">Activate Your License</h3>
            <p style="margin-bottom: 1rem;">Already have a license key? Enter it below:</p>
            <input type="text" id="licenseKeyInput" placeholder="NIVTO-SUB-YYYYMMDD-XXXXX" 
                   style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 8px; font-family: monospace; font-size: 1rem; margin-bottom: 1rem;">
            <button id="activateBtn" style="width: 100%; padding: 0.875rem; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                ✅ Activate License
            </button>
            <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">
            <h4 style="color: #667eea; margin-bottom: 0.75rem;">Don't have a license key?</h4>
            <p style="margin-bottom: 0.5rem;"><strong>💰 Monthly Subscription: R349</strong></p>
            <p style="margin-bottom: 0.5rem;">✓ Windows + Android apps included</p>
            <p style="margin-bottom: 1rem;">✓ 5-day free trial on first install</p>
            <p style="color: #666; font-size: 0.9rem; line-height: 1.5;">
                📞 Contact: 074 353 2291<br>
                📧 Email: sales@nivto.com<br>
                🌐 Visit: nivto.com/subscribe
            </p>
        </div>
    `;
    
    const activationDiv = document.createElement('div');
    activationDiv.innerHTML = activationHTML;
    
    // Create custom dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = 'background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);';
    dialogContent.appendChild(activationDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'width: 100%; padding: 0.75rem; background: #e0e0e0; color: #333; border: none; border-radius: 8px; font-size: 1rem; margin-top: 1rem; cursor: pointer;';
    closeBtn.onclick = () => dialog.remove();
    dialogContent.appendChild(closeBtn);
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // Handle activation
    dialogContent.querySelector('#activateBtn').onclick = async () => {
        const key = dialogContent.querySelector('#licenseKeyInput').value.trim();
        if (!key) {
            alert('❌ Please enter a license key');
            return;
        }
        
        const activateBtn = dialogContent.querySelector('#activateBtn');
        activateBtn.disabled = true;
        activateBtn.textContent = '⏳ Activating...';
        
        try {
            const result = await window.api.activateLicense(key);
            if (result.success) {
                alert('✅ License activated successfully! The app will now restart.');
                dialog.remove();
                // Restart the app to refresh license status
                await window.api.restartApp();
            } else {
                alert('❌ Activation failed: ' + (result.error || 'Invalid license key'));
                activateBtn.disabled = false;
                activateBtn.textContent = '✅ Activate License';
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
            activateBtn.disabled = false;
            activateBtn.textContent = '✅ Activate License';
        }
    };
}

function openPurchaseDialog() {
    const purchaseHTML = `
        <div style="text-align: left;">
            <h2 style="margin: 0 0 1rem 0; color: #667eea; font-size: 1.8rem;">💰 Subscribe to NIVTO Staff Manager</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white; margin-bottom: 1.5rem;">
                <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem;">R349<span style="font-size: 1.2rem; opacity: 0.9;">/month</span></div>
                <ul style="list-style: none; padding: 0; margin: 1rem 0 0 0; line-height: 1.8;">
                    <li>✓ Windows Desktop App</li>
                    <li>✓ Android Mobile App</li>
                    <li>✓ Unlimited Staff</li>
                    <li>✓ Full Feature Access</li>
                    <li>✓ Email Support</li>
                </ul>
            </div>
            
            <button id="settingsCompletePurchaseBtn" 
                    style="width: 100%; padding: 1.25rem; background: #28a745; color: white; 
                           border: none; border-radius: 8px; font-size: 1.2rem; font-weight: 700; 
                           cursor: pointer; margin-bottom: 1.5rem; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                🛒 Complete Purchase Online (Pay with Card)
            </button>
            
            <div style="background: #f8f9fa; padding: 1.25rem; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 1.5rem;">
                <p style="margin: 0 0 0.75rem 0; font-size: 1.05rem;"><strong>📧 Or contact us to subscribe:</strong></p>
                <p style="margin: 0.25rem 0; color: #555;">📞 Phone: <strong>074 353 2291</strong></p>
                <p style="margin: 0.25rem 0; color: #555;">✉️ Email: <strong>sales@nivto.com</strong></p>
            </div>
            <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; line-height: 1.6;">
                    <strong>💡 Already purchased?</strong> Enter your license key below:
                </p>
            </div>
            <input type="text" id="purchaseLicenseInput" placeholder="NIVTO-SUB-YYYYMMDD-XXXXX" 
                   style="width: 100%; padding: 0.875rem; border: 2px solid #ddd; border-radius: 8px; 
                          font-family: monospace; font-size: 1rem; margin-bottom: 1rem; box-sizing: border-box;">
            <button id="purchaseActivateBtn" style="width: 100%; padding: 0.875rem; background: #667eea; color: white; 
                   border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem;">
                ✅ Activate License
            </button>
        </div>
    `;
    
    const purchaseDiv = document.createElement('div');
    purchaseDiv.innerHTML = purchaseHTML;
    
    // Create custom dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; overflow-y: auto;';
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = 'background: white; padding: 2rem; border-radius: 16px; max-width: 550px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: auto;';
    dialogContent.appendChild(purchaseDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'width: 100%; padding: 0.875rem; background: #e0e0e0; color: #333; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;';
    closeBtn.onclick = () => dialog.remove();
    dialogContent.appendChild(closeBtn);
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // Handle purchase button click
    dialogContent.querySelector('#settingsCompletePurchaseBtn').onclick = async () => {
        try {
            await window.api.openExternal('https://nivto-payment.onrender.com');
            alert('✅ Opening payment page in your browser...\n\nAfter completing payment, you will receive your license key via email.');
        } catch (error) {
            console.error('Failed to open payment page:', error);
            alert('❌ Could not open payment page. Please visit: https://nivto-payment.onrender.com');
        }
    };
    
    // Handle activation
    dialogContent.querySelector('#purchaseActivateBtn').onclick = async () => {
        const key = dialogContent.querySelector('#purchaseLicenseInput').value.trim();
        if (!key) {
            alert('❌ Please enter a license key');
            return;
        }
        
        const activateBtn = dialogContent.querySelector('#purchaseActivateBtn');
        activateBtn.disabled = true;
        activateBtn.textContent = '⏳ Activating...';
        
        try {
            const result = await window.api.activateLicense(key);
            if (result.success) {
                alert('✅ License activated successfully! The app will now restart.');
                dialog.remove();
                // Restart the app to refresh license status
                await window.api.restartApp();
            } else {
                alert('❌ Activation failed: ' + (result.error || 'Invalid license key'));
                activateBtn.disabled = false;
                activateBtn.textContent = '✅ Activate License';
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
            activateBtn.disabled = false;
            activateBtn.textContent = '✅ Activate License';
        }
    };
}

function checkForUpdates() {
    document.getElementById('checkUpdatesBtn').disabled = true;
    document.getElementById('checkUpdatesBtn').textContent = '🔄 Checking...';
    showUpdateStatus('Checking for updates...', '', 'info');
    window.api.checkForUpdates();
}

function downloadUpdate() {
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('downloadBtn').textContent = '⬇️ Downloading...';
    window.api.downloadUpdate();
}

function installUpdate() {
    if (confirm('The application will now restart to install the update. Make sure all your work is saved.')) {
        window.api.installUpdate();
    }
}

function showUpdateStatus(message, details, type = 'info') {
    const statusDiv = document.getElementById('updateStatus');
    const messageDiv = document.getElementById('updateMessage');
    const detailsDiv = document.getElementById('updateDetails');
    
    statusDiv.style.display = 'block';
    messageDiv.textContent = message;
    detailsDiv.textContent = details;
    
    // Set border color based on type
    if (type === 'success') {
        statusDiv.style.borderLeftColor = '#27ae60';
    } else if (type === 'error') {
        statusDiv.style.borderLeftColor = '#e74c3c';
    } else {
        statusDiv.style.borderLeftColor = '#3498db';
    }
}

function hideUpdateProgress() {
    document.getElementById('updateProgress').style.display = 'none';
}

function showUpdateProgress() {
    document.getElementById('updateProgress').style.display = 'block';
}

function updateProgressBar(percent) {
    document.getElementById('progressBar').style.width = percent + '%';
}

function updateProgressText(text) {
    document.getElementById('progressText').textContent = text;
}

// Listen for update events
window.api.onUpdateStatus((data) => {
    const { event, data: eventData } = data;
    
    switch (event) {
        case 'update-available':
            showUpdateStatus(
                '🎉 Update Available!',
                `Version ${eventData.version} is available. Click below to download.`,
                'success'
            );
            document.getElementById('updateActions').style.display = 'flex';
            document.getElementById('downloadBtn').style.display = 'block';
            document.getElementById('checkUpdatesBtn').disabled = false;
            document.getElementById('checkUpdatesBtn').textContent = '🔄 Check for Updates';
            break;
            
        case 'update-not-available':
            showUpdateStatus(
                '✅ You\'re Up to Date',
                'You have the latest version installed.',
                'success'
            );
            hideUpdateProgress();
            document.getElementById('updateActions').style.display = 'none';
            document.getElementById('checkUpdatesBtn').disabled = false;
            document.getElementById('checkUpdatesBtn').textContent = '🔄 Check for Updates';
            break;
            
        case 'download-progress':
            showUpdateProgress();
            const percent = Math.round(eventData.percent);
            updateProgressBar(percent);
            updateProgressText(`${percent}% - ${formatBytes(eventData.transferred)} / ${formatBytes(eventData.total)}`);
            showUpdateStatus(
                '⬇️ Downloading Update...',
                `Please wait while the update is being downloaded.`,
                'info'
            );
            break;
            
        case 'update-downloaded':
            hideUpdateProgress();
            showUpdateStatus(
                '✅ Update Downloaded!',
                'The update has been downloaded and is ready to install.',
                'success'
            );
            document.getElementById('downloadBtn').style.display = 'none';
            document.getElementById('installBtn').style.display = 'block';
            break;
            
        case 'update-error':
            showUpdateStatus(
                '❌ Update Error',
                eventData.message || 'An error occurred while checking for updates.',
                'error'
            );
            hideUpdateProgress();
            document.getElementById('checkUpdatesBtn').disabled = false;
            document.getElementById('checkUpdatesBtn').textContent = '🔄 Check for Updates';
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('downloadBtn').textContent = '⬇️ Download Update';
            break;
            
        case 'Checking for updates...':
            showUpdateStatus(
                '🔄 Checking for Updates...',
                'Please wait while we check for new versions.',
                'info'
            );
            break;
    }
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Load version on init
loadAppVersion();
loadLicenseStatus();

init();