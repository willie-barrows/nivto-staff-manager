# 🚀 Quick Start - Yoco Automated Payments for NIVTO Staff Manager

Get your payment system up and running in under 30 minutes with Yoco!

## What You'll Get

✅ **Automated Payment Processing** - Accept R349/month subscriptions  
✅ **Instant License Key Delivery** - Customers get keys via email immediately  
✅ **Lower Fees** - Only 2.95% per transaction (no fixed fee!)  
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
   - **Test Secret Key:** `sk_test_...` (for development)
   - **Test Public Key:** `pk_test_...` (for development)
   - **Live Secret Key:** `sk_live_...` (for production - only visible after verification)
   - **Live Public Key:** `pk_live_...` (for production)

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

Replace the `YOCO_SECRET_KEY`, `YOCO_PUBLIC_KEY`, email, and password with your actual values!

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
✅ **Should show:** "Payment Provider: Yoco"

---

## Step 6: Test Payment Flow (5 minutes)

1. **Open Browser:** http://localhost:3000

2. **Fill Form:**
   - Name: Test User
   - Email: your.email@gmail.com
   - Phone: 0743532291
   - Plan: Monthly

3. **Click "Pay Securely with Yoco"**

4. **Yoco Popup Opens - Use Test Card:**
   - **Card Number:** `4242 4242 4242 4242` ✅ (Success)
   - **Alternative Test Cards:**
     - `4000 0000 0000 0002` (Insufficient funds - for testing decline)
     - `4000 0000 0000 0341` (Card authentication required)
   - **Expiry:** Any future date (e.g., `12/28`)
   - **CVV:** Any 3 digits (e.g., `123`)
   - **Name:** Any name

5. **Complete Payment**

6. **Check Email** - You should receive a license key instantly!

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

- [ ] Yoco account verified and approved
- [ ] Bank account linked in Yoco Portal
- [ ] All tests passing with test keys
- [ ] Domain name ready (optional but recommended)
- [ ] SSL certificate installed (if using custom domain)

### Switch to Production:

1. **Update `.env`:**
   ```env
   NODE_ENV=production
   YOCO_SECRET_KEY=sk_live_your_live_secret_key_here
   YOCO_PUBLIC_KEY=pk_live_your_live_public_key_here
   BASE_URL=https://your-domain.com
   ```

2. **Deploy to Server:**
   - **Option A:** Heroku (free tier, easy)
   - **Option B:** DigitalOcean ($5/month, more control)
   - **Option C:** Your own server

3. **Configure Yoco Webhook (Optional but Recommended):**
   - Portal → Settings → Webhooks
   - Add URL: `https://your-domain.com/webhook/yoco`
   - Select events: `payment.succeeded`, `charge.succeeded`
   - ⚠️ Note: Webhooks are optional since payment is processed immediately on server

4. **Test with Real Payment:**
   - Use real card with small amount first (R10)
   - Verify entire flow works
   - Check bank account for deposit (settles in 1-3 business days)

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
5. Verify EMAIL_USER and EMAIL_PASSWORD are correct

### Yoco Payment Issues?

1. Verify you're using **test keys** (`sk_test_...` and `pk_test_...`) for testing
2. Check `NODE_ENV=development` in `.env`
3. View transaction logs in Yoco Portal → Transactions
4. Ensure keys are correctly copied (no extra spaces)
5. Test with Yoco test card: `4242 4242 4242 4242`
6. Check browser console for JavaScript errors
7. Make sure YOCO_PUBLIC_KEY is correctly set in `.env`

### License Key Not Activating?

1. Check expiry date is in future
2. Verify no typos in key
3. Ensure date format is correct (YYYYMMDD)
4. Test with manually generated key: `npm run generate-key -- --monthly`
5. Check that license key was generated (check server logs)

### Yoco Popup Not Appearing?

1. **Check browser console** for errors (F12)
2. Verify `YOCO_PUBLIC_KEY` is set correctly in `.env`
3. Ensure Yoco SDK is loading: https://js.yoco.com/sdk/v1/yoco-sdk-web.js
4. Try in different browser (Chrome/Edge recommended)
5. Disable browser extensions that might block popups
6. Check server logs for errors

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
heroku config:set EMAIL_USER=your_email
heroku config:set EMAIL_PASSWORD=your_password
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_FROM="NIVTO <noreply@nivto.com>"

# Create Procfile
echo "web: node payment-server.js" > Procfile

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku master

# Open your app
heroku open
```

### DigitalOcean ($5/month - More Control)

1. Create Ubuntu droplet
2. SSH into server: `ssh root@your_ip`
3. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt-get install -y nodejs
   ```
4. Upload your code: `scp -r StaffManager root@your_ip:/root/`
5. Install dependencies: `cd /root/StaffManager && npm install`
6. Install PM2: `npm install -g pm2`
7. Start server: `pm2 start payment-server.js --name nivto-payment`
8. Setup auto-start: `pm2 startup && pm2 save`
9. (Optional) Setup Nginx with SSL:
   ```bash
   apt-get install nginx certbot python3-certbot-nginx
   certbot --nginx -d your-domain.com
   ```

---

## Pricing & Fees

### Yoco Fees

- **Transaction Fee:** 2.95% per transaction (No fixed fee! 🎉)
- **Monthly Fee:** R0
- **Setup Fee:** R0
- **Payout Time:** 1-3 business days

**Example:** Customer pays R349  
- Yoco fee: R10.30  
- **You receive: R338.70** 💰

### Comparison with Other Providers

| Provider | Rate | R349 Fee | You Receive |
|----------|------|----------|-------------|
| **Yoco** | 2.95% | R10.30 | **R338.70** ✅ |
| PayFast | 3.9% + R2 | R15.61 | R333.39 |
| PayGate | 3.5% + R2 | R14.22 | R334.78 |

### Revenue Projections

**With 10 customers/month:**
- Revenue: R3,490
- Yoco fees: -R103
- **Net: R3,387/month** 🚀

**With 50 customers/month:**
- Revenue: R17,450
- Yoco fees: -R515
- **Net: R16,935/month** 💪

**With 100 customers/month:**
- Revenue: R34,900
- Yoco fees: -R1,030
- **Net: R33,870/month** 🎉

**With 500 customers/month:**
- Revenue: R174,500
- Yoco fees: -R5,148
- **Net: R169,352/month** 🤯

---

## Support & Resources

### Need Help?

📞 **NIVTO Support:** 074 353 2291  
📧 **Email:** support@nivto.com  
📚 **Full Guide:** See `PAYMENT_SETUP_GUIDE.md`

### Yoco Resources

- **Portal:** https://portal.yoco.com/
- **Documentation:** https://developer.yoco.com/
- **Support:** support@yoco.com
- **Phone:** +27 87 550 9626
- **Test Cards:** https://developer.yoco.com/online/resources/test-cards

---

## Summary

✅ **5 minutes:** Get Yoco API keys  
✅ **5 minutes:** Configure email  
✅ **5 minutes:** Test payment flow  
✅ **3 minutes:** Test license activation  
✅ **100% automated:** No manual work after setup!

**Total Time:** ~20 minutes to full automation! ⚡

---

## What Happens When Customer Buys?

1. 💳 Customer visits your payment page
2. 🔒 Customer enters card details in secure Yoco popup
3. ✅ Yoco processes payment instantly (no redirect!)
4. 🎟️ Server generates unique license key immediately
5. 📧 License key emailed to customer within seconds
6. 🚀 Customer activates both apps with key
7. 💰 Money deposited to your bank account (1-3 business days)

**Your work:** ZERO! It's all automated! 🎉

**Better than PayFast:**
- ✅ Lower fees (2.95% vs 3.9% + R2)
- ✅ No redirect - customer stays on your site
- ✅ Modern popup interface
- ✅ Instant confirmation
- ✅ Better mobile experience

---

## Yoco Test Cards

Use these for testing different scenarios:

| Card Number | Scenario | Result |
|-------------|----------|--------|
| `4242 4242 4242 4242` | Success | Payment approved ✅ |
| `4000 0000 0000 0002` | Insufficient funds | Payment declined ❌ |
| `4000 0000 0000 0341` | 3D Secure | Requires authentication |
| `4000 0000 0000 0069` | Expired card | Payment declined ❌ |

All test cards:
- **Expiry:** Any future date (e.g., `12/28`)
- **CVV:** Any 3 digits (e.g., `123`)
- **Name:** Any name

---

## Next Steps

1. ✅ **Get Yoco API keys** from portal.yoco.com
2. ✅ **Configure `.env` file** with your keys
3. ✅ **Test email** - Run `npm run test-email`
4. ✅ **Start server** - Run `npm run payment-dev`
5. ✅ **Test payment** - Visit http://localhost:3000
6. ✅ **Verify license** - Activate key in NIVTO app
7. 🚀 **Go live** - Switch to live keys and deploy!

**Ready to accept your first payment?** 

Run `npm run payment-dev` and visit http://localhost:3000! 🎉

---

**Document Version:** 2.0 (Yoco Integration)  
**Last Updated:** March 7, 2026  
**Payment Provider:** Yoco 🇿🇦
