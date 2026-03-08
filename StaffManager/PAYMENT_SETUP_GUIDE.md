# NIVTO Staff Manager - Automated Payment Setup Guide

## Overview

This guide will help you set up **fully automated payment processing** for NIVTO Staff Manager subscriptions. The system will:

✅ Accept recurring monthly payments (R349/month)  
✅ Automatically generate license keys  
✅ Send license keys to customers via email  
✅ Handle payment confirmations  
✅ Process renewals automatically  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Choose Payment Provider](#choose-payment-provider)
3. [Server Setup](#server-setup)
4. [Email Configuration](#email-configuration)
5. [Payment Provider Setup](#payment-provider-setup)
6. [Testing](#testing)
7. [Going Live](#going-live)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

1. **Bank Account** - To receive payments
2. **Payment Gateway Account** - One of:
   - PayFast (Recommended for South Africa)
   - Paystack (Alternative for SA)
   - Stripe (International)
3. **Email Service** - For sending license keys:
   - Gmail (easiest to set up)
   - SendGrid (for high volume)
   - Your own SMTP server
4. **Server** - To host the payment system:
   - Heroku (free tier available)
   - DigitalOcean (from $5/month)
   - AWS/Azure (scalable)
   - Your own server

### Technical Requirements

- Node.js 14 or higher
- npm (comes with Node.js)
- Basic command line knowledge
- Domain name (optional but recommended)

---

## Choose Payment Provider

### Option 1: PayFast (Recommended for South Africa ⭐)

**Pros:**
- Most popular in South Africa
- Supports ZAR currency
- Low fees (3.9% + R2.00)
- Built-in recurring billing
- Local support

**Sign Up:**
1. Visit: https://www.payfast.co.za/
2. Click "Sign Up"
3. Choose "Merchant Account"
4. Complete business verification
5. Add bank account details
6. Get approved (24-48 hours)

**Costs:**
- Setup: Free
- Monthly fee: R0
- Transaction fee: 3.9% + R2.00
- Example: R349 payment = R15.61 fee, you receive R333.39

### Option 2: Paystack

**Pros:**
- Modern API
- Good for tech-savvy users
- Supports South Africa
- 2.9% + R2.00 fees

**Sign Up:**
1. Visit: https://paystack.com/
2. Create account
3. Complete KYC verification
4. Add bank details

### Option 3: Stripe

**Pros:**
- Global payment processing
- Excellent documentation
- Most features

**Cons:**
- Higher fees for SA
- International payouts can take longer

---

## Server Setup

### Step 1: Install Dependencies

Open terminal in the `StaffManager` folder:

```bash
npm install express body-parser nodemailer
```

### Step 2: Configure Environment Variables

Create a file named `.env` in the `StaffManager` folder:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# PayFast Credentials (get these from PayFast dashboard)
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_secure_passphrase

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM="NIVTO Staff Manager <noreply@nivto.com>"
```

### Step 3: Test Locally

```bash
node payment-server.js
```

Open browser to: http://localhost:3000

You should see the subscription page!

---

## Email Configuration

### Option A: Gmail (Easiest)

1. **Enable 2-Factor Authentication:**
   - Go to Google Account settings
   - Security → 2-Step Verification
   - Enable it

2. **Create App Password:**
   - Google Account → Security
   - App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "NIVTO Server"
   - Copy the 16-character password
   - Use this in `.env` as `EMAIL_PASSWORD`

3. **Update `.env`:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM="NIVTO Staff Manager <noreply@nivto.com>"
```

### Option B: SendGrid (For High Volume)

SendGrid offers 100 emails/day free, then paid plans.

1. Sign up: https://sendgrid.com/
2. Get API key
3. Update `.env`:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM="NIVTO Staff Manager <noreply@nivto.com>"
```

### Option C: Custom SMTP

If you have your own email server:

```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your_password
EMAIL_FROM="NIVTO Staff Manager <noreply@yourdomain.com>"
```

---

## Payment Provider Setup

### PayFast Configuration

1. **Log in to PayFast Dashboard:**
   - Go to https://www.payfast.co.za/login

2. **Get Your Credentials:**
   - Settings → Integration
   - Copy your **Merchant ID**
   - Copy your **Merchant Key**
   - Generate a **Passphrase** (secure random string)
   - Add these to your `.env` file

3. **Set Up Sandbox (Testing):**
   - Settings → Sandbox
   - Enable sandbox mode
   - Get sandbox credentials
   - Use these for testing first!

4. **Configure Webhook:**
   - Settings → Integration
   - Set Instant Payment Notification (IPN) URL:
     ```
     https://your-domain.com/webhook/payfast
     ```
   - Enable IPN
   - Save

5. **Security Settings:**
   - Enable IP whitelisting (optional)
   - Set referrer URL: `https://your-domain.com`
   - Set confirmation page: `https://your-domain.com/payment-success`

### Test Credentials (Sandbox)

Use these for testing before going live:

```env
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_test_passphrase
NODE_ENV=development
```

---

## Deploy to Server

### Option 1: Heroku (Free/Easy)

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App:**
   ```bash
   cd StaffManager
   heroku login
   heroku create nivto-payments
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PAYFAST_MERCHANT_ID=your_id
   heroku config:set PAYFAST_MERCHANT_KEY=your_key
   heroku config:set PAYFAST_PASSPHRASE=your_pass
   heroku config:set EMAIL_USER=your_email
   heroku config:set EMAIL_PASSWORD=your_password
   ```

4. **Create Procfile:**
   Create file named `Procfile` (no extension):
   ```
   web: node payment-server.js
   ```

5. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Initial payment server"
   git push heroku master
   ```

6. **Open Your App:**
   ```bash
   heroku open
   ```

Your payment system is now live!

### Option 2: DigitalOcean Droplet ($5/month)

1. **Create Droplet:**
   - Go to DigitalOcean
   - Create Droplet → Ubuntu 22.04
   - Choose $5/month plan

2. **SSH into Server:**
   ```bash
   ssh root@your_server_ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt-get install -y nodejs
   ```

4. **Install PM2 (Process Manager):**
   ```bash
   npm install -g pm2
   ```

5. **Upload Your Code:**
   ```bash
   # On your local machine
   scp -r StaffManager root@your_server_ip:/root/
   ```

6. **Start Server:**
   ```bash
   cd /root/StaffManager
   npm install
   pm2 start payment-server.js --name nivto-payment
   pm2 startup
   pm2 save
   ```

7. **Set Up Nginx (Optional - for HTTPS):**
   ```bash
   apt-get install nginx certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

---

## Testing

### Test Payment Flow

1. **Use Sandbox Mode:**
   - Set `NODE_ENV=development` in `.env`
   - Use PayFast sandbox credentials

2. **Test Credit Card:**
   - Card Number: `4000000000000002`
   - Expiry: Any future date
   - CVV: `123`

3. **Test the Flow:**
   - Visit your payment page
   - Fill in customer details
   - Use test card
   - Complete payment
   - Check email for license key

4. **Test License Key:**
   - Copy license key from email
   - Open NIVTO Staff Manager (Windows or Android)
   - Enter license key
   - Verify activation works

### Test Webhook

```bash
# Install curl if needed
# Send test webhook
curl -X POST http://localhost:3000/webhook/payfast \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "payment_status=COMPLETE&email_address=test@example.com&custom_int1=30&name_first=Test&name_last=User"
```

Check if email is sent!

---

## Going Live

### Checklist Before Launch

- [ ] PayFast account fully verified
- [ ] Bank account linked and verified
- [ ] Email system tested and working
- [ ] Test payment completed successfully
- [ ] License key received via email
- [ ] License key activates in app
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Switch to live PayFast credentials
- [ ] SSL certificate installed (HTTPS)
- [ ] Webhook URL configured in PayFast
- [ ] Domain name pointed to server

### Switch to Production

1. **Update `.env`:**
   ```env
   NODE_ENV=production
   PAYFAST_MERCHANT_ID=your_live_merchant_id
   PAYFAST_MERCHANT_KEY=your_live_merchant_key
   PAYFAST_PASSPHRASE=your_live_passphrase
   BASE_URL=https://payments.nivto.com
   ```

2. **Restart Server:**
   ```bash
   pm2 restart nivto-payment
   ```

3. **Test with Real Payment:**
   - Use small amount first (R10)
   - Verify entire flow works
   - Check bank account for deposit

---

## Recurring Billing

PayFast supports automatic recurring payments.

### Enable Subscriptions

Modify the payment creation code to include:

```javascript
const paymentData = {
    // ... existing fields ...
    subscription_type: 1,  // Recurring
    billing_date: new Date().toISOString().split('T')[0],
    recurring_amount: '349.00',
    frequency: 3,  // Monthly
    cycles: 0      // Infinite
};
```

When customer pays first time, they'll be automatically charged R349 every month!

### Handle Renewal Webhook

PayFast sends webhook for each recurring payment. The code already handles this - it will:
1. Generate new 30-day license key
2. Email customer with new key
3. Customer enters new key when prompted

---

## Advanced Features

### Customer Portal

Let customers manage their subscription:

```javascript
app.get('/portal/:email', async (req, res) => {
    // Show customer's:
    // - Current license key
    // - Expiry date
    // - Payment history
    // - Cancel/update payment method
});
```

### Database Integration

Store license keys in database:

```bash
npm install sqlite3
```

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('licenses.db');

db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY,
    email TEXT,
    licenseKey TEXT,
    expiryDate TEXT,
    customerName TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// In webhook handler
db.run('INSERT INTO licenses (email, licenseKey, expiryDate, customerName) VALUES (?, ?, ?, ?)',
    [email, licenseKey, expiryDate, customerName]);
```

### Analytics

Track your revenue:

```javascript
app.get('/admin/stats', (req, res) => {
    db.all('SELECT COUNT(*) as total, SUM(amount) as revenue FROM licenses', (err, rows) => {
        res.json(rows[0]);
    });
});
```

---

## Troubleshooting

### Email Not Sending

**Problem:** License keys not arriving

**Solutions:**
1. Check spam folder
2. Verify email credentials in `.env`
3. For Gmail, ensure app password is correct
4. Check server logs: `pm2 logs nivto-payment`
5. Test email manually:
   ```bash
   node -e "require('./payment-server.js')"
   ```

### Webhook Not Received

**Problem:** Payment completes but no license generated

**Solutions:**
1. Verify webhook URL in PayFast dashboard
2. Check server is publicly accessible
3. View PayFast webhook logs in dashboard
4. Test webhook locally with ngrok:
   ```bash
   npm install -g ngrok
   ngrok http 3000
   # Use ngrok URL in PayFast webhook settings
   ```

### Invalid Signature Error

**Problem:** PayFast webhook rejected

**Solutions:**
1. Verify passphrase matches exactly
2. Check all merchant credentials
3. Ensure sandbox mode matches environment
4. Test signature generation:
   ```javascript
   console.log('Generated:', signature);
   console.log('Received:', req.body.signature);
   ```

### License Key Not Activating

**Problem:** Customer enters key but activation fails

**Solutions:**
1. Check date format in license key
2. Verify expiry date is in future
3. Check for typos in key
4. Ensure customer copied entire key
5. Test with manually generated key:
   ```bash
   node generate-license.js --monthly
   ```

---

## Pricing Strategies

### Add Discounts

Encourage longer commitments:

```javascript
const CONFIG = {
    PRICING: {
        MONTHLY: 349,
        QUARTERLY: 899,   // Save R148 (14% discount)
        BIANNUAL: 1699,   // Save R395 (19% discount)
        ANNUAL: 3199      // Save R989 (23% discount)
    }
};
```

### Early Bird Pricing

Offer promotional pricing:

```javascript
const PROMO_CODE = 'LAUNCH2026';
const PROMO_DISCOUNT = 0.20; // 20% off

if (req.body.promoCode === PROMO_CODE) {
    amount = amount * (1 - PROMO_DISCOUNT);
}
```

### Free Trial Extension

Some customers may need more than 5 days:

```javascript
// In activation screen
if (request.body.extendTrial) {
    // Generate 14-day trial key instead
    const licenseKey = generateSubscriptionKey(14);
}
```

---

## Security Best Practices

1. **Never commit `.env` file to git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use HTTPS only**
   - Get free SSL with Let's Encrypt
   - Never process payments over HTTP

3. **Validate all webhook data**
   - Always verify signature
   - Check payment status
   - Validate amounts

4. **Rate limiting**
   ```bash
   npm install express-rate-limit
   ```

5. **Log everything**
   - Record all payments
   - Store license activations
   - Monitor failed attempts

---

## Support & Resources

### PayFast Resources
- Documentation: https://developers.payfast.co.za/
- Support: support@payfast.co.za
- Phone: +27 (0)21 469 0072

### Helpful Tools
- Webhook tester: https://webhook.site/
- Email tester: https://www.mail-tester.com/
- SSL checker: https://www.ssllabs.com/ssltest/

### Need Help?

Contact NIVTO Support:
- 📞 Phone: 074 353 2291
- 📧 Email: support@nivto.com

---

## Summary

You now have a complete automated payment system that:

✅ Accepts R349/month recurring payments  
✅ Automatically generates license keys  
✅ Emails keys to customers instantly  
✅ Handles renewals automatically  
✅ Requires no manual intervention  

**Total Setup Time:** 2-4 hours  
**Ongoing Maintenance:** ~5 minutes/month  
**Payment Processing:** 100% automated  

Your customers can now subscribe and get instant access to NIVTO Staff Manager with zero manual work required!

---

**Document Version:** 1.0  
**Last Updated:** March 7, 2026  
**Document:** PAYMENT_SETUP_GUIDE.md
