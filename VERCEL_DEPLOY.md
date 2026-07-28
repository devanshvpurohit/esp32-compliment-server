# 🚀 Vercel Deployment Guide

Deploy your ESP32 Message Center to Vercel in minutes!

## 📋 Prerequisites

- GitHub account (✓ Already have your repo!)
- Vercel account (free tier works great)
- ESP32 with Wi-Fi connection

## 🌐 Step 1: Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/devanshvpurohit/esp32-compliment-server)

### Option B: Manual Deploy

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `devanshvpurohit/esp32-compliment-server`
4. Click **"Deploy"**

That's it! Vercel will automatically detect the configuration from `vercel.json`

## ⚙️ Step 2: Configure Environment Variables

After deployment, add your ESP32's IP address:

1. Go to your project dashboard on Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `ESP32_IP` | `192.168.x.x` | Your ESP32's local IP address (REQUIRED) |
| `ESP32_PORT` | `80` | ESP32 web server port (optional, defaults to 80) |
| `CRON_SECRET` | `your-secret-key` | Optional secret for webhook authentication |

**Important:** Your ESP32 must be on the same network or publicly accessible for Vercel to reach it.

### Finding Your ESP32's IP Address

- Check the OLED display when connected to Wi-Fi
- Look at your router's device list
- Check the Arduino Serial Monitor

## 🔄 Step 3: Enable Automatic Messages (Optional)

The `vercel.json` is already configured with a cron job that runs every 10 minutes.

To verify it's active:

1. Go to **"Settings"** → **"Cron Jobs"**
2. You should see: `*/10 * * * *` → `/api/webhook`

### Change the Interval

Edit `vercel.json` and redeploy:

```json
"crons": [
  {
    "path": "/api/webhook",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }
]
```

Cron schedule examples:
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 9,12,15,18 * * *` - At 9am, 12pm, 3pm, and 6pm
- `0 9 * * *` - Every day at 9am

## 🎨 Step 4: Use Your Web App

Once deployed, Vercel gives you a URL like:
```
https://esp32-compliment-server.vercel.app
```

Open it in your browser to:
- ✉️ Send custom messages to your ESP32
- 🎲 Send random compliments
- 📱 Access from any device (phone, tablet, computer)

## 🔧 ESP32 Configuration

### Network Requirements

**For Vercel to reach your ESP32, you have two options:**

#### Option 1: Port Forwarding (Home Network)
1. Set up port forwarding on your router
2. Forward external port (e.g., 8080) to ESP32's IP:80
3. Use your public IP in `ESP32_IP` environment variable
4. Update ESP32 code to handle requests from external IPs

#### Option 2: Cloud Proxy (Recommended)
Use a service like:
- **ngrok** - Easy tunneling solution
- **Cloudflare Tunnel** - Free, secure tunneling
- **Tailscale** - Private network mesh

Example with ngrok:
```bash
ngrok http 192.168.1.100:80
```
Then use the ngrok URL as `ESP32_IP` (e.g., `abc123.ngrok.io`)

#### Option 3: Polling (Easier Alternative)
Instead of Vercel pushing to ESP32, have your ESP32 pull from Vercel:

```cpp
// In your ESP32 loop(), poll every 10 minutes
unsigned long lastPoll = 0;
const unsigned long POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

void loop() {
  if (millis() - lastPoll > POLL_INTERVAL) {
    HTTPClient http;
    http.begin("https://your-app.vercel.app/api/compliment");
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      // Parse JSON and display message
    }
    
    http.end();
    lastPoll = millis();
  }
  
  // ... rest of your code
}
```

## 📊 Testing Your Deployment

### Test the API:
```bash
# Get random compliment
curl https://your-app.vercel.app/api/compliment

# Send to ESP32
curl -X POST https://your-app.vercel.app/api/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from Vercel!"}'
```

### Test the Webhook (Cron):
```bash
curl https://your-app.vercel.app/api/webhook
```

## 🐛 Troubleshooting

### "ESP32_IP environment variable not set"
- Add `ESP32_IP` in Vercel's Environment Variables settings
- Redeploy after adding variables

### "Failed to send compliment to ESP32"
- Verify ESP32 is online: `ping YOUR_ESP32_IP`
- Check if ESP32 is accessible from internet (if using cloud deployment)
- Verify `/compliment` endpoint is working on ESP32
- Check Vercel Function logs for detailed errors

### Cron Job Not Running
- Check **"Settings"** → **"Cron Jobs"** in Vercel
- Note: Cron jobs only work on production deployments, not preview deployments
- View logs in **"Deployments"** → Select deployment → **"Functions"**

### ESP32 Not Receiving Messages
- Ensure ESP32 is not in AP mode (must be connected to Wi-Fi)
- Check Serial Monitor for incoming request logs
- Verify the `/compliment` endpoint handler is registered
- Test locally first: `curl -X POST http://ESP32_IP/compliment -d '{"message":"test"}'`

## 📱 Custom Domain (Optional)

1. Go to **"Settings"** → **"Domains"**
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

Example: `compliments.yourdomain.com`

## 🔒 Security Tips

1. **Set CRON_SECRET** to protect webhook endpoint
2. **Use HTTPS** for all requests (Vercel provides this automatically)
3. **Don't commit** `.env` files (already in `.gitignore`)
4. **Restrict ESP32 endpoint** to only accept requests from known IPs if possible

## 🎉 Next Steps

- Customize compliments in `api/compliment.py` and `api/send.js`
- Modify the UI in `api/index.js`
- Add authentication for the web interface
- Create a mobile app that uses your API
- Share your deployment URL with friends!

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [GitHub Repository](https://github.com/devanshvpurohit/esp32-compliment-server)

---

**Need help?** Open an issue on GitHub or check the logs in Vercel's dashboard.
