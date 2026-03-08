const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const LICENSE_PATH = path.join(
  require("electron").app.getPath("userData"),
  "license.json"
);

const TRIAL_DAYS = 5;
const SUBSCRIPTION_PRICE = "R349";

function getMachineId() {
    return os.hostname();
}

function hashData(data) {
    return crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");
}

function generateLocalSignature(data) {
    return hashData(JSON.stringify(data) + getMachineId());
}

// Initialize trial on first launch
function initializeTrial() {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + TRIAL_DAYS);

    const licenseData = {
        type: "trial",
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        key: null
    };

    licenseData.signature = generateLocalSignature(licenseData);

    fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
    return licenseData;
}

// Save subscription license
function saveSubscriptionLicense(key, expiryDate) {
    const licenseData = {
        type: "subscription",
        startDate: new Date().toISOString(),
        expiryDate: expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
        key: key
    };

    licenseData.signature = generateLocalSignature(licenseData);

    fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
    return licenseData;
}

// Legacy save function for backward compatibility
function saveLicense(key) {
    return saveSubscriptionLicense(key, null);
}

function loadLicense() {
    if (!fs.existsSync(LICENSE_PATH)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
    } catch (e) {
        return null;
    }
}

// Parse and validate subscription key
function parseSubscriptionKey(key) {
    // Expected format: NIVTO-SUB-YYYYMMDD-XXXXX
    // Where YYYYMMDD is the expiry date
    const parts = key.split('-');
    if (parts.length !== 4 || parts[0] !== 'NIVTO' || parts[1] !== 'SUB') {
        return null;
    }

    try {
        const expiryStr = parts[2]; // YYYYMMDD
        const year = parseInt(expiryStr.substring(0, 4));
        const month = parseInt(expiryStr.substring(4, 6)) - 1;
        const day = parseInt(expiryStr.substring(6, 8));
        
        const expiryDate = new Date(year, month, day);
        return {
            key: key,
            expiryDate: expiryDate,
            code: parts[3]
        };
    } catch (e) {
        return null;
    }
}

// Check if license is valid
function validateLicense() {
    let data = loadLicense();
    
    console.log('[LICENSE] validateLicense called');
    console.log('[LICENSE] Loaded data:', JSON.stringify(data, null, 2));
    
    // No license file - user hasn't started trial or activated yet
    if (!data) {
        console.log('[LICENSE] No license file found');
        return { valid: false, reason: "no_license", needsActivation: true };
    }

    // Validate signature - try new format first (without lastChecked)
    const signatureData = {
        type: data.type,
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        key: data.key
    };
    console.log('[LICENSE] Signature data:', JSON.stringify(signatureData, null, 2));
    console.log('[LICENSE] Machine ID:', getMachineId());
    
    let expectedSignature = generateLocalSignature(signatureData);
    console.log('[LICENSE] Expected signature (new format):', expectedSignature);
    console.log('[LICENSE] Stored signature:', data.signature);
    
    let signatureValid = data.signature === expectedSignature;
    
    // If new format fails and old lastChecked field exists, try old format
    if (!signatureValid && data.lastChecked) {
        console.log('[LICENSE] New signature failed, trying old format with lastChecked...');
        const oldSignatureData = {
            type: data.type,
            startDate: data.startDate,
            expiryDate: data.expiryDate,
            key: data.key,
            lastChecked: data.lastChecked
        };
        expectedSignature = generateLocalSignature(oldSignatureData);
        console.log('[LICENSE] Expected signature (old format):', expectedSignature);
        signatureValid = data.signature === expectedSignature;
        
        // If old format validates, upgrade to new format
        if (signatureValid) {
            console.log('[LICENSE] Old format validated - upgrading to new format');
            saveSubscriptionLicense(data.key, data.expiryDate);
        }
    }
    
    console.log('[LICENSE] Signatures match:', signatureValid);

    if (!signatureValid) {
        console.log('[LICENSE] ❌ Signature validation FAILED');
        return { valid: false, reason: "invalid_signature" };
    }

    const now = new Date();
    const expiryDate = new Date(data.expiryDate);
    console.log('[LICENSE] Current date:', now.toISOString());
    console.log('[LICENSE] Expiry date:', expiryDate.toISOString());
    console.log('[LICENSE] Is expired:', now > expiryDate);

    // Check if expired
    if (now > expiryDate) {
        console.log('[LICENSE] ❌ License EXPIRED');
        return {
            valid: false,
            reason: "expired",
            type: data.type,
            expiryDate: data.expiryDate
        };
    }

    // Valid license
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    console.log('[LICENSE] ✅ License VALID - Days remaining:', daysRemaining);
    return {
        valid: true,
        type: data.type,
        expiryDate: data.expiryDate,
        daysRemaining: daysRemaining
    };
}

// Manually start trial (called when user clicks "Start Trial" button)
function startTrial() {
    const existing = loadLicense();
    if (existing && existing.type === 'subscription') {
        return { success: false, error: 'Already have active subscription' };
    }
    if (existing && existing.type === 'trial') {
        return { success: false, error: 'Trial already started' };
    }
    
    const trialData = initializeTrial();
    return { 
        success: true, 
        expiryDate: trialData.expiryDate,
        daysRemaining: TRIAL_DAYS
    };
}

// Get license status for display
function getLicenseStatus() {
    const data = loadLicense();
    if (!data) {
        return {
            hasLicense: false,
            type: "none",
            needsActivation: true,
            message: "Start 5-day free trial or activate your license"
        };
    }

    const validation = validateLicense();
    const now = new Date();
    const expiryDate = new Date(data.expiryDate);
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (validation.valid) {
        if (data.type === "trial") {
            return {
                hasLicense: true,
                type: "trial",
                valid: true,
                daysRemaining: daysRemaining,
                expiryDate: data.expiryDate,
                message: `Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
            };
        } else {
            return {
                hasLicense: true,
                type: "subscription",
                valid: true,
                daysRemaining: daysRemaining,
                expiryDate: data.expiryDate,
                message: `Active until ${expiryDate.toLocaleDateString()}`
            };
        }
    } else {
        return {
            hasLicense: true,
            type: data.type,
            valid: false,
            expired: true,
            expiryDate: data.expiryDate,
            message: validation.reason === "expired" 
                ? `${data.type === "trial" ? "Trial" : "Subscription"} expired`
                : "Invalid license"
        };
    }
}

// Activate subscription with key
function activateSubscription(key) {
    const parsed = parseSubscriptionKey(key);
    if (!parsed) {
        return { success: false, error: "Invalid license key format" };
    }

    const now = new Date();
    if (now > parsed.expiryDate) {
        return { success: false, error: "License key has expired" };
    }

    saveSubscriptionLicense(key, parsed.expiryDate.toISOString());
    return { success: true, expiryDate: parsed.expiryDate };
}

module.exports = {
    saveLicense,
    validateLicense,
    getMachineId,
    initializeTrial,
    startTrial,
    saveSubscriptionLicense,
    parseSubscriptionKey,
    getLicenseStatus,
    activateSubscription,
    TRIAL_DAYS,
    SUBSCRIPTION_PRICE
};
