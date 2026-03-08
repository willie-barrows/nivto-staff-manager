/**
 * NIVTO Staff Manager - Automated Payment Server (Yoco Integration)
 */

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');

// Load .env from the same directory as this script
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    PORT: process.env.PORT || 3000,
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    
    YOCO: {
        SECRET_KEY: process.env.YOCO_SECRET_KEY,
        PUBLIC_KEY: process.env.YOCO_PUBLIC_KEY,
        MODE: process.env.NODE_ENV !== 'production' ? 'test' : 'live'
    },
    
    EMAIL: {
        HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        PORT: 587,
        SECURE: false,
        AUTH: {
            USER: process.env.EMAIL_USER,
            PASS: process.env.EMAIL_PASSWORD
        },
        FROM: process.env.EMAIL_FROM || 'NIVTO Staff Manager <noreply@nivto.com>'
    }
};

// ============================================================================
// EMAIL SETUP
// ============================================================================

console.log('Email config check on startup:', {
    user: process.env.EMAIL_USER || 'NOT SET',
    pass: process.env.EMAIL_PASSWORD ? 'SET (length: ' + process.env.EMAIL_PASSWORD.length + ')' : 'NOT SET',
    host: CONFIG.EMAIL.HOST,
    port: CONFIG.EMAIL.PORT
});

// Create a function to get a fresh transporter with current env vars
function getEmailTransporter() {
    return nodemailer.createTransport({
        host: CONFIG.EMAIL.HOST,
        port: CONFIG.EMAIL.PORT,
        secure: CONFIG.EMAIL.SECURE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
}

// ============================================================================
// LICENSE KEY GENERATION
// ============================================================================

function generateSubscriptionKey(daysValid) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);
    
    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const day = String(expiryDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `NIVTO-SUB-${dateStr}-${code}`;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function getLicenseEmailHtml(customerName, licenseKey, expiryDate, plan) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .license-box { background: white; border: 2px solid #667eea; padding: 20px; 
                       margin: 20px 0; border-radius: 8px; text-align: center; }
        .license-key { font-size: 24px; font-weight: bold; color: #667eea; 
                       font-family: 'Courier New', monospace; letter-spacing: 2px; }
        .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; 
                    padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to NIVTO Staff Manager!</h1>
            <p>Thank you for your subscription</p>
        </div>
        
        <div class="content">
            <p>Hi ${customerName || 'Customer'},</p>
            
            <p>Your payment has been successfully processed! Below is your license key for NIVTO Staff Manager.</p>
            
            <div class="license-box">
                <h2>Your License Key</h2>
                <div class="license-key">${licenseKey}</div>
                <p style="color: #666; margin-top: 10px;">Valid until: ${expiryDate}</p>
            </div>
            
            <div class="info-box">
                <h3>📋 What's Included:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>✅ Windows Desktop App (Payroll Management)</li>
                    <li>✅ Android Time Clock App for Employees</li>
                    <li>✅ Automatic Updates for Both Apps</li>
                    <li>✅ Unlimited Employees</li>
                    <li>✅ 5-Day Free Trial</li>
                </ul>
            </div>
            
            <h3>🚀 Getting Started:</h3>
            <ol>
                <li>Open NIVTO Staff Manager (Windows or Android)</li>
                <li>When prompted, enter your license key: <strong>${licenseKey}</strong></li>
                <li>Click "Activate License"</li>
                <li>Start managing your staff!</li>
            </ol>
            
            <div class="info-box">
                <h3>💰 Subscription Details:</h3>
                <p><strong>Plan:</strong> ${plan}<br>
                <strong>Price:</strong> R349/month<br>
                <strong>Valid Until:</strong> ${expiryDate}</p>
            </div>
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need assistance:</p>
            <ul>
                <li>📧 Email: support@nivto.com</li>
                <li>📞 Phone: 074 353 2291</li>
            </ul>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The NIVTO Team</strong></p>
        </div>
    </div>
</body>
</html>
    `;
}

async function sendLicenseEmail(recipientEmail, customerName, licenseKey, expiryDate, planName) {
    const htmlContent = getLicenseEmailHtml(customerName, licenseKey, expiryDate, planName);
    
    const mailOptions = {
        from: CONFIG.EMAIL.FROM,
        to: recipientEmail,
        subject: '🎉 Your NIVTO Staff Manager License Key',
        html: htmlContent,
        text: `
Hello ${customerName},

Your NIVTO Staff Manager license key: ${licenseKey}
Valid until: ${expiryDate}

To activate:
1. Install NIVTO Staff Manager  
2. Enter your license key when prompted
3. Click "Activate License"

Need help? Contact us at 074 353 2291

Best regards,
The NIVTO Team
        `
    };
    
    // Get fresh transporter with current credentials
    const transporter = getEmailTransporter();
    console.log('Sending email with auth:', {
        user: transporter.options.auth?.user || 'NOT SET',
        passLength: transporter.options.auth?.pass?.length || 0
    });
    
    return transporter.sendMail(mailOptions);
}

// ============================================================================
// ROUTES
// ============================================================================

// Homepage with payment form
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>NIVTO Staff Manager - Subscribe Now</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }
        
        body::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: float 20s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-20px, 20px); }
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .container {
            background: white;
            padding: 50px 40px;
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.2);
            position: relative;
            animation: fadeInUp 0.6s ease-out;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .logo {
            font-size: 60px;
            margin-bottom: 15px;
            animation: pulse 2s ease-in-out infinite;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
            font-weight: 400;
        }
        
        .features {
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
            border: 1px solid #e6e9ff;
        }
        
        .features-title {
            font-weight: 600;
            font-size: 16px;
            color: #667eea;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .features ul {
            list-style: none;
            padding: 0;
        }
        
        .features li {
            padding: 10px 0;
            color: #444;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 15px;
        }
        
        .check-icon {
            background: #667eea;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            flex-shrink: 0;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 30px 0 15px;
        }
        
        select {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            font-family: inherit;
            font-weight: 500;
            color: #333;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23667eea' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 20px center;
            padding-right: 50px;
        }
        
        select:hover {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        select:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        
        .price-display {
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%);
            border: 3px solid #667eea;
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .price-label {
            font-size: 14px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .price-amount {
            font-size: 56px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            margin-bottom: 8px;
        }
        
        .price-period {
            font-size: 16px;
            color: #888;
            font-weight: 500;
        }
        
        .savings-badge {
            display: inline-block;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 12px;
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
        }
        
        .input-group {
            margin: 15px 0;
        }
        
        .input-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #555;
            margin-bottom: 8px;
        }
        
        input[type="text"], 
        input[type="email"], 
        input[type="tel"] {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.3s;
            background: white;
        }
        
        input:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        input::placeholder {
            color: #aaa;
        }
        
        button {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 25px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .error {
            color: #e74c3c;
            padding: 12px 16px;
            background: #ffebee;
            border-left: 4px solid #e74c3c;
            border-radius: 8px;
            margin: 15px 0;
            display: none;
            font-size: 14px;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
        
        .footer-text {
            color: #888;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .secure-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #27ae60;
            font-weight: 500;
            margin-top: 10px;
        }
        
        .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 600px) {
            .container { padding: 35px 25px; }
            h1 { font-size: 26px; }
            .price { font-size: 30px; }
            .plan { padding: 18px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🕐</div>
            <h1>NIVTO Staff Manager</h1>
            <p class="subtitle">Professional Payroll & Time Management Solution</p>
        </div>
        
        <div class="features">
            <div class="features-title">
                <span>⭐</span> Complete Management Suite
            </div>
            <ul>
                <li><span class="check-icon">✓</span> Windows Desktop Application</li>
                <li><span class="check-icon">✓</span> Android Time Clock App</li>
                <li><span class="check-icon">✓</span> Unlimited Staff Members</li>
                <li><span class="check-icon">✓</span> Automatic Software Updates</li>
                <li><span class="check-icon">✓</span> 5-Day Free Trial Included</li>
            </ul>
        </div>
        
        <form id="paymentForm">
            <h3 class="section-title">Select License Period</h3>
            
            <div class="input-group">
                <label class="input-label">Subscription Plan</label>
                <select id="planSelect" name="plan" required>
                    <option value="monthly" data-amount="34900" data-price="R349" data-period="per month">Monthly - R349/month</option>
                    <option value="quarterly" data-amount="94700" data-price="R947" data-period="for 3 months" data-savings="Save 10%">Quarterly (3 Months) - R947 💰 Save 10%</option>
                    <option value="annual" data-amount="358800" data-price="R3,588" data-period="per year" data-savings="Save 15%">Annual (12 Months) - R3,588 🎉 Save 15%</option>
                </select>
            </div>
            
            <div class="price-display">
                <div class="price-label">Total Amount</div>
                <div class="price-amount" id="displayPrice">R349</div>
                <div class="price-period" id="displayPeriod">per month</div>
                <div id="savingsBadge" style="display: none;" class="savings-badge"></div>
            </div>
            
            <h3 class="section-title">Your Details</h3>
            
            <div class="input-group">
                <label class="input-label">Full Name</label>
                <input type="text" id="name" placeholder="John Doe" required>
            </div>
            
            <div class="input-group">
                <label class="input-label">Email Address</label>
                <input type="email" id="email" placeholder="john@example.com" required>
            </div>
            
            <div class="input-group">
                <label class="input-label">Phone Number</label>
                <input type="tel" id="phone" placeholder="074 353 2291" required>
            </div>
            
            <div class="error" id="errorMessage"></div>
            
            <button type="submit" id="submitBtn">
                🔒 Proceed to Secure Payment
            </button>
        </form>
        
        <div class="footer">
            <div class="secure-badge">
                🔒 Secure Payment by Yoco
            </div>
            <p class="footer-text">
                Questions? Contact us at <strong>074 353 2291</strong><br>
                or email <strong>support@nivto.com</strong>
            </p>
        </div>
    </div>
    
    <script>
        const form = document.getElementById('paymentForm');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');
        const planSelect = document.getElementById('planSelect');
        const displayPrice = document.getElementById('displayPrice');
        const displayPeriod = document.getElementById('displayPeriod');
        const savingsBadge = document.getElementById('savingsBadge');
        
        // Update price display when plan changes
        planSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const price = selectedOption.dataset.price;
            const period = selectedOption.dataset.period;
            const savings = selectedOption.dataset.savings;
            
            displayPrice.textContent = price;
            displayPeriod.textContent = period;
            
            if (savings) {
                savingsBadge.textContent = savings;
                savingsBadge.style.display = 'inline-block';
            } else {
                savingsBadge.style.display = 'none';
            }
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const planSelect = document.getElementById('planSelect');
            const selectedOption = planSelect.options[planSelect.selectedIndex];
            
            if (!name || !email || !phone) {
                errorMessage.textContent = '⚠️ Please fill in all fields';
                errorMessage.style.display = 'block';
                return;
            }
            
            if (!selectedOption || !selectedOption.value) {
                errorMessage.textContent = '⚠️ Please select a subscription plan';
                errorMessage.style.display = 'block';
                return;
            }
            
            const amount = parseInt(selectedOption.dataset.amount);
            const plan = selectedOption.value;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Creating secure checkout...';
            errorMessage.style.display = 'none';
            
            try {
                const response = await fetch('/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, plan, amount })
                });
                
                const data = await response.json();
                
                if (data.success && data.checkoutUrl) {
                    submitBtn.innerHTML = '<span class="spinner"></span> Redirecting to payment...';
                    // Redirect to Yoco hosted checkout page
                    window.location.href = data.checkoutUrl;
                } else {
                    throw new Error(data.message || 'Failed to create checkout session');
                }
            } catch (error) {
                console.error('Checkout error:', error);
                errorMessage.textContent = '⚠️ ' + (error.message || 'Unable to create checkout. Please try again.');
                errorMessage.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '🔒 Proceed to Secure Payment';
            }
        });
    </script>
</body>
</html>
    `);
});

// Create checkout session
app.post('/create-checkout', async (req, res) => {
    const { name, email, phone, plan, amount } = req.body;
    
    console.log('Creating checkout session:', { email, plan, amount });
    
    try {
        let days, planName;
        switch(plan) {
            case 'monthly': days = 30; planName = 'Monthly Subscription'; break;
            case 'quarterly': days = 90; planName = '3-Month Subscription'; break;
            case 'annual': days = 365; planName = 'Annual Subscription'; break;
            default: return res.status(400).json({ success: false, message: 'Invalid plan' });
        }
        
        // Generate unique session ID for tracking
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        // Store session data temporarily (in production, use database)
        global.checkoutSessions = global.checkoutSessions || {};
        global.checkoutSessions[sessionId] = { name, email, phone, plan, days, planName, amount };
        
        // Create Yoco checkout session
        const https = require('https');
        const checkoutData = JSON.stringify({
            amount: amount,
            currency: 'ZAR',
            successUrl: `${CONFIG.BASE_URL}/payment-complete?session_id=${sessionId}`,
            cancelUrl: `${CONFIG.BASE_URL}/?cancelled=true`,
            failureUrl: `${CONFIG.BASE_URL}/?failed=true`,
            metadata: {
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                plan: plan,
                planName: planName,
                days: days,
                sessionId: sessionId
            }
        });
        
        const options = {
            hostname: 'payments.yoco.com',
            port: 443,
            path: '/api/checkouts',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': checkoutData.length,
                'Authorization': `Bearer ${CONFIG.YOCO.SECRET_KEY}`
            }
        };
        
        const checkout = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (response.statusCode === 201 || response.statusCode === 200) {
                            resolve(result);
                        } else {
                            console.error('Yoco checkout error:', result);
                            reject(new Error(result.message || result.displayMessage || 'Failed to create checkout'));
                        }
                    } catch (e) {
                        console.error('Parse error:', e, 'Data:', data);
                        reject(new Error('Invalid response from payment provider'));
                    }
                });
            });
            request.on('error', (e) => {
                console.error('Request error:', e);
                reject(e);
            });
            request.write(checkoutData);
            request.end();
        });
        
        console.log('Checkout created:', checkout.id);
        
        res.json({ 
            success: true, 
            checkoutUrl: checkout.redirectUrl,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create checkout session' 
        });
    }
});

// Payment complete callback
app.get('/payment-complete', async (req, res) => {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
        return res.redirect('/?error=no_session');
    }
    
    try {
        // Retrieve session data
        const sessionData = (global.checkoutSessions || {})[sessionId];
        
        if (!sessionData) {
            console.error('Session not found:', sessionId);
            return res.redirect('/?error=session_not_found');
        }
        
        const { name, email, phone, plan, days, planName } = sessionData;
        
        // Generate license key
        const licenseKey = generateSubscriptionKey(days);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        const expiryStr = expiryDate.toLocaleDateString('en-ZA');
        
        console.log('Sending license key for payment:', { email, licenseKey, plan: planName });
        
        // Send email
        await sendLicenseEmail(email, name, licenseKey, expiryStr, planName);
        
        console.log(`✅ License sent successfully: ${email} - ${licenseKey}`);
        
        // Clean up session
        delete global.checkoutSessions[sessionId];
        
        // Redirect to success page
        res.redirect(`/payment-success?email=${encodeURIComponent(email)}&license=${encodeURIComponent(licenseKey)}`);
        
    } catch (error) {
        console.error('Payment completion error:', error);
        res.redirect('/?error=completion_failed');
    }
});

// Configuration test endpoint
app.get('/test-config', (req, res) => {
    res.json({
        yocoConfigured: !!CONFIG.YOCO.SECRET_KEY && !!CONFIG.YOCO.PUBLIC_KEY,
        publicKeyPrefix: CONFIG.YOCO.PUBLIC_KEY ? CONFIG.YOCO.PUBLIC_KEY.substring(0, 15) + '...' : 'NOT SET',
        secretKeyPrefix: CONFIG.YOCO.SECRET_KEY ? CONFIG.YOCO.SECRET_KEY.substring(0, 15) + '...' : 'NOT SET',
        mode: CONFIG.YOCO.MODE,
        emailConfigured: !!CONFIG.EMAIL.AUTH.USER && !!CONFIG.EMAIL.AUTH.PASS,
        port: CONFIG.PORT,
        baseUrl: CONFIG.BASE_URL
    });
});

// Process payment
app.post('/process-payment', async (req, res) => {
    const { token, name, email, phone, plan, amount } = req.body;
    
    console.log('Processing payment:', { email, plan, amount });
    
    try {
        let days, planName;
        switch(plan) {
            case 'monthly': days = 30; planName = 'Monthly Subscription'; break;
            case 'quarterly': days = 90; planName = '3-Month Subscription'; break;
            case 'annual': days = 365; planName = 'Annual Subscription'; break;
            default: return res.status(400).json({ success: false, message: 'Invalid plan' });
        }
        
        // Charge with Yoco
        const https = require('https');
        const chargeData = JSON.stringify({
            token: token,
            amountInCents: amount,
            currency: 'ZAR',
            metadata: { customerName: name, customerEmail: email, customerPhone: phone, plan, planName, days }
        });
        
        const options = {
            hostname: 'online.yoco.com',
            port: 443,
            path: '/v1/charges/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': chargeData.length,
                'Authorization': `Bearer ${CONFIG.YOCO.SECRET_KEY}`
            }
        };
        
        const charge = await new Promise((resolve, reject) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (response.statusCode === 201) {
                            resolve(result);
                        } else {
                            reject(new Error(result.message || 'Payment failed'));
                        }
                    } catch (e) {
                        reject(new Error('Invalid response'));
                    }
                });
            });
            request.on('error', reject);
            request.write(chargeData);
            request.end();
        });
        
        console.log('Payment successful:', charge.id);
        
        // Generate license
        const licenseKey = generateSubscriptionKey(days);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        const expiryStr = expiryDate.toLocaleDateString('en-ZA');
        
        // Send email
        await sendLicenseEmail(email, name, licenseKey, expiryStr, planName);
        
        console.log(`License sent: ${email} - ${licenseKey}`);
        
        res.json({ success: true, message: 'Payment successful', licenseKey });
        
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
});

// Success page
app.get('/payment-success', (req, res) => {
    const email = req.query.email || '';
    const license = req.query.license || '';
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Successful - NIVTO Staff Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        @keyframes checkmark {
            0% { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
        }
        
        .card {
            background: white;
            padding: 50px 40px;
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: fadeInScale 0.5s ease-out;
        }
        
        .success-icon {
            font-size: 100px;
            margin-bottom: 20px;
            animation: bounce 1s ease-out;
            filter: drop-shadow(0 5px 15px rgba(39, 174, 96, 0.3));
        }
        
        h1 {
            color: #27ae60;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        
        .license-box {
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%);
            border: 2px solid #667eea;
            padding: 30px;
            border-radius: 15px;
            margin: 25px 0;
        }
        
        .license-label {
            font-size: 14px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .license-key {
            font-size: 24px;
            font-family: 'Courier New', monospace;
            background: white;
            padding: 18px;
            border-radius: 10px;
            color: #667eea;
            font-weight: 700;
            letter-spacing: 2px;
            word-break: break-all;
            border: 2px solid #e6e9ff;
            margin-bottom: 12px;
            user-select: all;
            cursor: pointer;
        }
        
        .license-key:hover {
            background: #f8f9ff;
        }
        
        .copy-hint {
            font-size: 13px;
            color: #888;
        }
        
        .info-box {
            background: #e8f5e9;
            border-left: 4px solid #27ae60;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
        }
        
        .info-box-title {
            font-weight: 600;
            color: #27ae60;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .info-box p {
            color: #555;
            margin: 8px 0;
            line-height: 1.6;
        }
        
        .email-address {
            font-weight: 600;
            color: #333;
            font-size: 16px;
        }
        
        .steps {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            text-align: left;
        }
        
        .steps-title {
            font-weight: 600;
            color: #333;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin: 12px 0;
            padding: 12px;
            background: white;
            border-radius: 8px;
        }
        
        .step-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            flex-shrink: 0;
        }
        
        .step-text {
            flex: 1;
            color: #555;
            line-height: 1.6;
            padding-top: 4px;
        }
        
        button {
            padding: 18px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .help-text {
            color: #999;
            font-size: 14px;
            margin-top: 25px;
            padding-top: 25px;
            border-top: 1px solid #e0e0e0;
            line-height: 1.8;
        }
        
        .help-text strong {
            color: #667eea;
        }
        
        @media (max-width: 600px) {
            .card { padding: 35px 25px; }
            .success-icon { font-size: 80px; }
            h1 { font-size: 26px; }
            .license-key { font-size: 18px; padding: 14px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="success-icon">🎉</div>
        <h1>Payment Successful!</h1>
        <p class="subtitle">Thank you for subscribing to NIVTO Staff Manager</p>
        
        ${license ? `
        <div class="license-box">
            <div class="license-label">🔑 Your License Key</div>
            <div class="license-key" onclick="navigator.clipboard.writeText('${license}').then(() => alert('License key copied to clipboard!'))">${license}</div>
            <div class="copy-hint">💡 Click to copy • Save this key safely</div>
        </div>
        ` : ''}
        
        <div class="info-box">
            <div class="info-box-title">
                <span>📧</span> Check Your Email
            </div>
            <p>Your license key has been sent to:</p>
            <p class="email-address">${email}</p>
            <p style="font-size: 13px; color: #888; margin-top: 12px;">
                💡 Don't see it? Check your spam/junk folder
            </p>
        </div>
        
        <div class="steps">
            <div class="steps-title">🚀 Getting Started</div>
            
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-text">
                    <strong>Install the App</strong><br>
                    Download and install NIVTO Staff Manager on Windows or Android
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-text">
                    <strong>Enter Your License</strong><br>
                    When prompted, paste your license key: <strong>${license || 'sent to your email'}</strong>
                </div>
            </div>
            
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-text">
                    <strong>Start Managing</strong><br>
                    Click "Activate License" and enjoy full access to all features!
                </div>
            </div>
        </div>
        
        <button onclick="window.location.href='${CONFIG.BASE_URL}'">← Back to Home</button>
        
        <p class="help-text">
            Need assistance? Contact us:<br>
            📞 <strong>074 353 2291</strong> | 📧 <strong>support@nivto.com</strong>
        </p>
    </div>
</body>
</html>
    `);
});

// Webhook (optional - for future recurring payments)
app.post('/webhook/yoco', async (req, res) => {
    console.log('Yoco webhook:', req.body);
    res.status(200).json({ received: true });
});

// ============================================================================
// START SERVER  
// ============================================================================

app.listen(CONFIG.PORT, () => {
    console.log('='.repeat(60));
    console.log('NIVTO Payment Server Started (Yoco Integration)');
    console.log('='.repeat(60));
    console.log(`Server running on port ${CONFIG.PORT}`);
    console.log(`Environment: ${CONFIG.YOCO.MODE.toUpperCase()}`);
    console.log(`Payment Provider: Yoco`);
    console.log('');
    console.log('Payment page:');
    console.log(`  ${CONFIG.BASE_URL}/`);
    console.log('');
    console.log('⚠️  Make sure YOCO_SECRET_KEY and YOCO_PUBLIC_KEY are set in .env');
    console.log('='.repeat(60));
});

module.exports = app;
