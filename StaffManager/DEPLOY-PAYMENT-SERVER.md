# Payment Server Deployment Guide

## Quick Deploy to Render (Recommended - FREE)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub, Google, or Email
3. Verify your email

### Step 2: Prepare Files
Already done! Your payment server is ready with:
- ✅ payment-server.js (with environment variable support)
- ✅ package.json (with dependencies)
- ✅ PORT and BASE_URL configuration

### Step 3: Deploy to Render

**Option A: Deploy from GitHub (Recommended)**
1. Create a GitHub repository for your payment server
2. Push these files to GitHub:
   - payment-server.js
   - package.json
   - package-lock.json (if exists)
3. In Render dashboard, click "New +"
4. Select "Web Service"
5. Connect your GitHub repository
6. Configure:
   - **Name**: nivto-payment-server
   - **Environment**: Node
   - **Build Command**: npm install
   - **Start Command**: node payment-server.js
   - **Plan**: Free

**Option B: Deploy Manually (Alternative)**
1. Zip your payment server files
2. Upload to Render
3. Follow same configuration steps

### Step 4: Set Environment Variables in Render
In Render dashboard, add these environment variables:
```
PORT=10000
NODE_ENV=production
BASE_URL=https://your-app-name.onrender.com
YOCO_SECRET_KEY=your_yoco_secret_key
YOCO_PUBLIC_KEY=your_yoco_public_key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=NIVTO Staff Manager <noreply@nivto.com>
```

### Step 5: Deploy
Click "Create Web Service" - Render will:
- Install dependencies
- Start your server
- Give you a live URL: `https://your-app-name.onrender.com`

### Step 6: Test Your Live Payment Server
Visit: `https://your-app-name.onrender.com`
You should see your payment page!

---

## Alternative: Railway (Also Free)

1. Go to https://railway.app
2. Sign up and create new project
3. Select "Deploy from GitHub repo" or "Empty Project"
4. Configure same environment variables
5. Get your live URL: `https://your-app.railway.app`

---

## Alternative: Heroku (Paid - $5/month minimum)

1. Create account at https://heroku.com
2. Install Heroku CLI: `npm install -g heroku`
3. Run commands:
```bash
cd C:\project\Staff_Management\StaffManager
heroku login
heroku create nivto-payment
git init
git add payment-server.js package.json
git commit -m "Deploy payment server"
git push heroku main
heroku config:set YOCO_SECRET_KEY=your_key
heroku open
```

---

## Which Should You Use?

**Render (Recommended)**
- ✅ FREE forever
- ✅ Easy setup
- ✅ Automatic HTTPS
- ✅ Good for production
- ⚠️ Sleeps after 15 min inactivity (cold starts)

**Railway**
- ✅ FREE tier ($5 credit/month)
- ✅ Very easy
- ✅ Fast deployment
- ⚠️ May need payment method

**Heroku**
- ❌ No free tier (minimum $5/month)
- ✅ Most reliable
- ✅ Best uptime

---

## After Deployment

Once deployed, your live URL will be something like:
- Render: `https://nivto-payment.onrender.com`
- Railway: `https://nivto-payment.railway.app`
- Heroku: `https://nivto-payment.herokuapp.com`

Let me know your live URL and I'll update your website!
