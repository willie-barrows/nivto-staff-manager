/**
 * Email Configuration Tester
 * 
 * This script helps you verify your email settings are working correctly
 * before going live with the payment system.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Test configuration
const CONFIG = {
    EMAIL: {
        HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        PORT: process.env.EMAIL_PORT || 587,
        SECURE: false,
        AUTH: {
            USER: process.env.EMAIL_USER || '',
            PASS: process.env.EMAIL_PASSWORD || ''
        },
        FROM: process.env.EMAIL_FROM || 'NIVTO Staff Manager <noreply@nivto.com>'
    }
};

console.log('='.repeat(60));
console.log('NIVTO Email Configuration Test');
console.log('='.repeat(60));
console.log('');
console.log('Testing email configuration...');
console.log('Host:', CONFIG.EMAIL.HOST);
console.log('User:', CONFIG.EMAIL.AUTH.USER);
console.log('');

// Create transporter
const transporter = nodemailer.createTransport({
    host: CONFIG.EMAIL.HOST,
    port: CONFIG.EMAIL.PORT,
    secure: CONFIG.EMAIL.SECURE,
    auth: {
        user: CONFIG.EMAIL.AUTH.USER,
        pass: CONFIG.EMAIL.AUTH.PASS
    }
});

// Test license email template
function getTestEmailHtml() {
    const testLicenseKey = 'NIVTO-SUB-20260406-TEST1';
    const testExpiryDate = '2026/04/06';
    
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
            <h1>🧪 Test Email - NIVTO Staff Manager</h1>
            <p>Email Configuration Test</p>
        </div>
        
        <div class="content">
            <p><strong>✅ Email system is working correctly!</strong></p>
            
            <p>This is a test email to verify your email configuration. If you received this, your settings are correct.</p>
            
            <div class="license-box">
                <h2>Sample License Key</h2>
                <div class="license-key">${testLicenseKey}</div>
                <p style="color: #666; margin-top: 10px;">Valid until: ${testExpiryDate}</p>
            </div>
            
            <div class="info-box">
                <h3>✅ Email Configuration Test Results:</h3>
                <ul>
                    <li>✅ SMTP connection successful</li>
                    <li>✅ Authentication working</li>
                    <li>✅ Email delivery successful</li>
                    <li>✅ HTML rendering correct</li>
                </ul>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
                <li>Verify this email looks good</li>
                <li>Check it didn't go to spam</li>
                <li>Update your payment server configuration</li>
                <li>Test a real payment transaction</li>
            </ol>
            
            <p style="margin-top: 30px;">
                <strong>Test Details:</strong><br>
                Host: ${CONFIG.EMAIL.HOST}<br>
                From: ${CONFIG.EMAIL.FROM}<br>
                Date: ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

// Send test email
async function sendTestEmail() {
    try {
        // Verify connection
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        console.log('');
        
        // Send test email
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: CONFIG.EMAIL.FROM,
            to: CONFIG.EMAIL.AUTH.USER, // Send to yourself
            subject: '🧪 Test Email - NIVTO Staff Manager License System',
            html: getTestEmailHtml(),
            text: `
NIVTO Staff Manager - Email Configuration Test

✅ Email system is working correctly!

This is a test email to verify your email configuration.
If you received this, your settings are correct.

Sample License Key: NIVTO-SUB-20260406-TEST1
Valid until: 2026/04/06

Email Configuration Test Results:
- ✅ SMTP connection successful
- ✅ Authentication working
- ✅ Email delivery successful
- ✅ HTML rendering correct

Test Details:
Host: ${CONFIG.EMAIL.HOST}
From: ${CONFIG.EMAIL.FROM}
Date: ${new Date().toLocaleString()}
            `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('');
        console.log('Message ID:', info.messageId);
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ EMAIL CONFIGURATION TEST PASSED');
        console.log('='.repeat(60));
        console.log('');
        console.log('Please check your inbox:', CONFIG.EMAIL.AUTH.USER);
        console.log('(Also check your spam folder)');
        console.log('');
        console.log('If you received the email and it looks good,');
        console.log('your payment system is ready to send license keys!');
        console.log('');
        
    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('❌ EMAIL CONFIGURATION TEST FAILED');
        console.error('='.repeat(60));
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        
        if (error.code === 'EAUTH') {
            console.error('🔧 Authentication failed. Please check:');
            console.error('   1. Email address is correct');
            console.error('   2. Password/App Password is correct');
            console.error('   3. For Gmail: Enable 2FA and use App Password');
            console.error('   4. For other providers: Check SMTP settings');
        } else if (error.code === 'ECONNECTION') {
            console.error('🔧 Connection failed. Please check:');
            console.error('   1. SMTP host is correct');
            console.error('   2. Port is correct (usually 587)');
            console.error('   3. Your firewall allows SMTP connections');
            console.error('   4. Your internet connection is working');
        } else {
            console.error('🔧 Please check your .env file configuration');
        }
        
        console.error('');
        console.error('Need help? Call 074 353 2291');
        console.error('');
        process.exit(1);
    }
}

// Check if configuration exists
if (!CONFIG.EMAIL.AUTH.USER || !CONFIG.EMAIL.AUTH.PASS) {
    console.warn('⚠️  WARNING: Email credentials not configured!');
    console.warn('');
    console.warn('Please create a .env file with:');
    console.warn('');
    console.warn('EMAIL_HOST=smtp.gmail.com');
    console.warn('EMAIL_USER=your-email@gmail.com');
    console.warn('EMAIL_PASSWORD=your-app-password');
    console.warn('EMAIL_FROM="NIVTO Staff Manager <noreply@nivto.com>"');
    console.warn('');
    console.warn('See PAYMENT_SETUP_GUIDE.md for detailed instructions.');
    console.warn('');
    process.exit(1);
}

// Run test
sendTestEmail();
