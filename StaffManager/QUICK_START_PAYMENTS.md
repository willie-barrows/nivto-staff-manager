# 🚀 Quick Start - Automated Payments for NIVTO Staff Manager

Get your payment system up and running in under 30 minutes!

## What You'll Get

✅ **Automated Payment Processing** - Accept R349/month subscriptions  
✅ **Instant License Key Delivery** - Customers get keys via email immediately  
✅ **Recurring Billing** - Automatic monthly charges  
✅ **Zero Manual Work** - Everything automated  

---

## Step 1: Install Dependencies (2 minutes)

Open PowerShell in the `StaffManager` folder:

```powershell
npm install express body-parser nodemailer dotenv cross-env
```

---

## Step 2: Get Your Yoco API Keys (5 minutes)

Yoco is a popular South African payment gateway with simple integration.

### Get Your Keys

1. **Log in to Yoco Portal:** https://portal.yoco.com/
2. **Navigate to:** Online Payments → Settings → API Keys
3. **Copy Your Keys:**
   - **Test Secret Key:** `sk_test_YOUR_TEST_KEY_HERE` (for development)
   - **Test Public Key:** `pk_test_YOUR_PUBLIC_KEY_HERE` (for development)
   - **Live Secret Key:** `sk_live_YOUR_LIVE_KEY_HERE` (for production - only visible after verification)
   - **Live Public Key:** `pk_live_YOUR_LIVE_PUBLIC_KEY_HERE` (for production)

### Account Verification (For Live Payments)

Before accepting real payments:
1. **Complete KYC Verification** in Yoco Portal
2. **Add Bank Account** for payouts
3. **Submit Required Documents:**
   - ID/Passport
   - Bank statement or proof of banking details
4. **Wait for Approval** (usually 24-48 hours)
5. **Live keys become available** after approval

---

## Step 3: Configure Email (5 minutes)

### Option A: Gmail (Easiest)

1. **Enable 2-Factor Authentication:**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Name it "NIVTO" and generate
   - **Copy the 16-character password**

3. **Create `.env` file** in `StaffManager` folder:

```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

YOCO_SECRET_KEY=sk_test_your_test_secret_key_abc123
YOCO_PUBLIC_KEY=pk_test_your_test_public_key_xyz789

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM="NIVTO Staff Manager <noreply@nivto.com>"
```

Replace `your.email@gmail.com` and `abcd efgh ijkl mnop` with your actual credentials!

---

## Step 4: Test Email (2 minutes)

```powershell
npm run test-email
```

✅ **Expected:** "Email sent successfully!"  
❌ **Error?** Check your email/password in `.env`

Check your inbox - you should receive a test license key email!

---

## Step 5: Start Payment Server (1 minute)

```powershell
npm run payment-dev
```

✅ **Expected:** "Server running on port 3000"

---

## Step 6: Test Payment Flow (5 minutes)

1. **Open Browser:** http://localhost:3000

2. **Fill Form:**
   - Name: Test User
   - Email: your.email@gmail.com
   - Phone: 0743532291
   - Plan: Monthly

3. **Click "Proceed to Payment"**

3. **Use Test Card** (Yoco provides test cards):
   - **Successful Payment:** `4242 4242 4242 4242`
   - **Insufficient Funds:** `4000 0000 0000 0002`
   - Expiry: Any future date (e.g., `12/28`)
   - CVV: Any 3 digits (e.g., `123`)

5. **Complete Payment**

6. **Check Email** - You should receive a license key!

---

## Step 7: Test License Key (3 minutes)

1. **Copy License Key** from email (e.g., `NIVTO-SUB-20260406-ABCD1`)

2. **Open NIVTO Staff Manager** (Windows app)

3. **Click "Activate License"**

4. **Paste License Key** and activate

5. **Verify:** Should show "Subscription Active" in settings

✅ **If it works, your payment system is ready!**

---

## Step 8: Go Live (When Ready)

### Before Going Live:

- [ ] PayFast account approved and verified
- [ ] Bank account linked
- [ ] All tests passing
- [ ] Domain name ready (optional but recommended)
- [ ] SSL certificate installed (if using custom domain)

### Switch to Production:

1. **Update `.env`:**
   ```env
   NODE_ENV=production
   YOCO_SECRET_KEY=sk_live_your_live_secret_key
   YOCO_PUBLIC_KEY=pk_live_your_live_public_key
   BASE_URL=https://your-domain.com
   ```

2. **Deploy to Server:**
   - **Option A:** Heroku (free tier, easy)
   - **Option B:** DigitalOcean ($5/month, more control)
   - **Option C:** Your own server

3. **Configure Yoco Webhook (Optional):**
   - Portal → Settings → Webhooks
   - Add URL: `https://your-domain.com/webhook/yoco`
   - Select events: `payment.succeeded`, `charge.succeeded`

4. **Test with Real Payment:**
   - Use small amount first (R10)
   - Verify entire flow
   - Check bank account for deposit

---

## Common Commands

```powershell
# Start payment server (development)
npm run payment-dev

# Start payment server (production)
npm run payment-prod

# Test email configuration
npm run test-email

# Generate license key manually
npm run generate-key -- --monthly

# Generate bulk keys
npm run generate-key -- --bulk 10 30
```

---

## Troubleshooting

### Email Not Working?

1. Check `.env` file exists and has correct credentials
2. For Gmail: Ensure using **App Password**, not regular password
3. Check spam folder
4. Run: `npm run test-email` to debug

### Yoco Payment Issues?

1. Verify you're using **test keys** (sk_test_... and pk_test_...) for testing
2. Check `NODE_ENV=development` in `.env`
3. View transaction logs in Yoco Portal
4. Ensure keys are correctly copied (no extra spaces)
5. Test with Yoco test cards: `4242 4242 4242 4242`

### License Key Not Activating?

1. Check expiry date is in future
2. Verify no typos in key
3. Test with manually generated key: `npm run generate-key -- --monthly`

---

## Server Deployment Options

### Heroku (Easiest - Free Tier Available)

```powershell
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create nivto-payments

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set YOCO_SECRET_KEY=sk_live_your_key
heroku config:set YOCO_PUBLIC_KEY=pk_live_your_key
# ... (set all other config vars)

# Create Procfile
echo "web: node payment-server.js" > Procfile

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku master
```

### DigitalOcean ($5/month - More Control)

1. Create Ubuntu droplet
2. SSH into server
3. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
4. Upload your code: `scp -r StaffManager root@your_ip:/root/`
5. Install dependencies: `npm install`
6. Install PM2: `npm install -g pm2`
7. Start server: `pm2 start payment-server.js`
8. Setup auto-start: `pm2 startup && pm2 save`

---

## Pricing & Fees

### Yoco Fees

- **Transaction Fee:** 2.95% per transaction
- **Monthly Fee:** R0
- **Setup Fee:** R0

**Example:** Customer pays R349  
- Yoco fee: R10.30  
- You receive: **R338.70** 💰

### Recommended Pricing

- **Monthly:** R349 (most popular)
- **3 Months:** R899 (save R148 - 14% off)
- **6 Months:** R1,699 (save R395 - 19% off)
- **Annual:** R3,199 (save R989 - 23% off)

---

## Support

### Need Help?

📞 **Phone:** 074 353 2291  
📧 **Email:** support@nivto.com  
📚 **Full Guide:** See `PAYMENT_SETUP_GUIDE.md`

### Resources

- **PayFast Docs:** https://developers.payfast.co.za/
- **PayFast Support:** support@payfast.co.za / +27 21 469 0072
- **Email Tester:** https://www.mail-tester.com/

---

## Summary

✅ **15 minutes:** Set up PayFast sandbox + email  
✅ **5 minutes:** Test payment and email delivery  
✅ **3 minutes:** Test license activation  
✅ **100% automated:** No manual work after setup!

**Total Time:** ~30 minutes to full automation!

---

## What Happens When Customer Buys?

1. 💳 Customer visits your payment page
2. 🔒 Customer enters details in Yoco popup
3. ✅ Yoco processes payment securely
4. 🎟️ Server generates unique license key immediately
5. 📧 License key emailed to customer instantly
6. 🚀 Customer activates both apps with key
7. 💰 Money deposited to your bank account (1-3 business days)

**Your work:** Zero! It's all automated! 🎉

---

**Ready to accept your first payment?** Run `npm run payment-dev` and visit http://localhost:3000!
