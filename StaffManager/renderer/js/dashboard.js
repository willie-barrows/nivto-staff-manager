// Dashboard logic

// Global license status
let currentLicenseStatus = null;

// Check and display license status on page load
window.addEventListener('DOMContentLoaded', async () => {
    await checkLicenseStatus();
    await checkLogoutButton();
});

async function checkLogoutButton() {
    try {
        const config = await window.api.readConfig();
        const hasPassword = config.adminPassword && config.adminPassword.length > 0;
        if (hasPassword) {
            document.getElementById('logoutBtn').style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Error checking logout button:', error);
    }
}

async function checkLicenseStatus() {
    try {
        const status = await window.api.getLicenseStatus();
        currentLicenseStatus = status; // Store globally
        const banner = document.getElementById('licenseBanner');
        
        if (!status.hasLicense || status.needsActivation) {
            // No license - show "Start Trial" banner (PROMINENT)
            banner.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 12px; 
                            color: white; text-align: center; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);">
                    <h2 style="margin: 0 0 0.75rem 0; font-size: 1.5rem;">🎉 Welcome to NIVTO Staff Manager!</h2>
                    <p style="margin: 0 0 1rem 0; font-size: 1.1rem; opacity: 0.95;">
                        Start your <strong>5-day free trial</strong> or purchase a monthly subscription for <strong>R349/month</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="startFreeTrial()" 
                                style="padding: 0.875rem 2rem; background: white; color: #667eea; 
                                       border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; 
                                       cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                            🚀 Start 5-Day Free Trial
                        </button>
                        <button onclick="showPurchaseOptions()" 
                                style="padding: 0.875rem 2rem; background: #28a745; color: white; 
                                       border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; 
                                       cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                            💳 Purchase Now - R349/month
                        </button>
                        <button onclick="showActivation()" 
                                style="padding: 0.875rem 1.5rem; background: rgba(255,255,255,0.2); 
                                       color: white; border: 2px solid white; border-radius: 8px; 
                                       font-size: 0.95rem; font-weight: 600; cursor: pointer;">
                            🔑 Activate Key
                        </button>
                    </div>
                </div>
            `;
            banner.style.display = 'block';
        } else if (status.type === 'trial' && status.valid) {
            // Trial active - show reminder banner (PROMINENT but less intrusive)
            banner.innerHTML = `
                <div style="background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%); 
                            padding: 1rem 1.5rem; margin-bottom: 1.5rem; border-radius: 12px; 
                            color: white; display: flex; justify-content: space-between; align-items: center; 
                            box-shadow: 0 2px 10px rgba(243, 156, 18, 0.3);">
                    <div>
                        <strong style="font-size: 1.1rem;">⏰ Free Trial: ${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''} remaining</strong>
                        <p style="margin: 0.25rem 0 0 0; opacity: 0.95;">Subscribe to continue after trial ends</p>
                    </div>
                    <button onclick="showPurchaseOptions()" 
                            style="padding: 0.75rem 1.5rem; background: white; color: #f39c12; 
                                   border: none; border-radius: 8px; font-weight: 600; cursor: pointer; 
                                   white-space: nowrap;">
                        💳 Subscribe Now - R349/month
                    </button>
                </div>
            `;
            banner.style.display = 'block';
        } else if (status.expired) {
            // Expired - show urgent banner (VERY PROMINENT)
            banner.innerHTML = `
                <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
                            padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 12px; 
                            color: white; text-align: center; box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);">
                    <h2 style="margin: 0 0 0.75rem 0; font-size: 1.5rem;">❌ ${status.type === 'trial' ? 'Trial' : 'Subscription'} Expired</h2>
                    <p style="margin: 0 0 1rem 0; font-size: 1.1rem;">
                        Purchase a monthly subscription for <strong>R349</strong> to continue using NIVTO Staff Manager
                    </p>
                    <button onclick="showPurchaseOptions()" 
                            style="padding: 0.875rem 2rem; background: white; color: #e74c3c; 
                                   border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; 
                                   cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        💳 Purchase Now - R349/month
                    </button>
                </div>
            `;
            banner.style.display = 'block';
        } else if (status.type === 'subscription' && status.valid) {
            // Paid license active - show small discrete indicator
            banner.innerHTML = `
                <div style="background: #ecf0f1; padding: 0.5rem 1rem; margin-bottom: 1rem; 
                            border-radius: 8px; display: flex; justify-content: space-between; 
                            align-items: center; font-size: 0.9rem; color: #2c3e50;">
                    <span>✅ <strong>Licensed</strong> • Valid until ${new Date(status.expiryDate).toLocaleDateString()}</span>
                </div>
            `;
            banner.style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking license:', error);
    }
}

async function startFreeTrial() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Starting trial...';
    
    try {
        const result = await window.api.startTrial();
        if (result.success) {
            alert(`✅ 5-day free trial started!\n\nYour trial expires in ${result.daysRemaining} days.\nSubscribe anytime to continue using NIVTO Staff Manager.\n\nThe app will now restart.`);
            // Restart the app to refresh license status
            await window.api.restartApp();
        } else {
            alert('❌ ' + (result.error || 'Failed to start trial'));
            btn.disabled = false;
            btn.textContent = '🚀 Start 5-Day Free Trial';
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = '🚀 Start 5-Day Free Trial';
    }
}

function showPurchaseOptions() {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1rem; overflow-y: auto;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: white; padding: 2rem; border-radius: 16px; max-width: 550px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: auto;';
    content.innerHTML = `
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
        
        <button id="completePurchaseBtn" 
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
        <input type="text" id="licenseKeyInput" placeholder="NIVTO-SUB-YYYYMMDD-XXXXX" 
               style="width: 100%; padding: 0.875rem; border: 2px solid #ddd; border-radius: 8px; 
                      font-family: monospace; font-size: 1rem; margin-bottom: 1rem; box-sizing: border-box;">
        <div style="display: flex; gap: 0.75rem;">
            <button id="activateBtn" onclick="activateLicenseFromDialog()" 
                    style="flex: 1; padding: 0.875rem; background: #667eea; color: white; 
                           border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                ✅ Activate License
            </button>
            <button onclick="this.closest('[style*=fixed]').remove()" 
                    style="padding: 0.875rem 1.5rem; background: #e0e0e0; color: #333; 
                           border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // Handle purchase button click
    document.getElementById('completePurchaseBtn').onclick = async () => {
        try {
            await window.api.openExternal('https://nivto-payment.onrender.com');
            // Optionally show a message
            alert('✅ Opening payment page in your browser...\n\nAfter completing payment, you will receive your license key via email.');
        } catch (error) {
            console.error('Failed to open payment page:', error);
            alert('❌ Could not open payment page. Please visit: https://nivto-payment.onrender.com');
        }
    };
}

function showActivation() {
    showPurchaseOptions();
}

async function activateLicenseFromDialog() {
    const input = document.getElementById('licenseKeyInput');
    const btn = document.getElementById('activateBtn');
    const key = input.value.trim();
    
    if (!key) {
        alert('❌ Please enter a license key');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '⏳ Activating...';
    
    try {
        const result = await window.api.activateLicense(key);
        if (result.success) {
            alert('✅ License activated successfully! The app will now restart.');
            document.querySelector('[style*=fixed]').remove();
            // Restart the app to refresh license status
            await window.api.restartApp();
        } else {
            alert('❌ Activation failed: ' + (result.error || 'Invalid license key'));
            btn.disabled = false;
            btn.textContent = '✅ Activate License';
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = '✅ Activate License';
    }
}

function navigate(page) {
    // Protected pages that require valid license
    const protectedPages = ['staff.html', 'attendance.html', 'shifts.html', 'payout.html', 'leave.html'];
    
    if (protectedPages.includes(page)) {
        if (!currentLicenseStatus || !currentLicenseStatus.valid || currentLicenseStatus.expired) {
            alert('❌ Access Denied\n\nYour license has expired. Please purchase a subscription (R349/month) to access this feature.\n\nClick the green "Purchase Now" button above or go to Settings.');
            return;
        }
    }
    
    window.location.href = page;
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        await window.api.clearSession();
        location.href = 'login.html';
    }
}