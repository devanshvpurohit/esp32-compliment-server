# 🆓 Free Tier Solutions for Frequent Messages

Vercel's free (Hobby) plan only allows **daily cron jobs**. Here are the best ways to send frequent messages to your ESP32 without upgrading:

## ✅ Solution 1: ESP32 Pulls from Vercel (Recommended)

Instead of Vercel pushing to your ESP32, have your ESP32 poll the API every 10 minutes.

### Add to Your ESP32 Code:

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuration
const char* VERCEL_API_URL = "https://your-app.vercel.app/api/compliment";
unsigned long lastComplimentFetch = 0;
const unsigned long FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// In your loop() function:
void loop() {
  // Your existing code...
  
  // Check if it's time to fetch a new compliment
  if (millis() - lastComplimentFetch > FETCH_INTERVAL) {
    fetchAndDisplayCompliment();
    lastComplimentFetch = millis();
  }
  
  // Rest of your loop code...
  delay(100);
}

void fetchAndDisplayCompliment() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping compliment fetch");
    return;
  }
  
  HTTPClient http;
  http.begin(VERCEL_API_URL);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("Received: " + payload);
    
    // Parse JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      const char* compliment = doc["compliment"];
      if (compliment) {
        displayCompliment(String(compliment));
      }
    }
  } else {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
  }
  
  http.end();
}
```

**Pros:**
- ✅ Works on Vercel free tier
- ✅ No additional services needed
- ✅ ESP32 controls the timing
- ✅ Works even when ESP32 is behind NAT/firewall

**Cons:**
- ❌ Uses a tiny bit of ESP32 power/bandwidth
- ❌ Requires modifying ESP32 code

---

## ✅ Solution 2: Use GitHub Actions (100% Free)

GitHub Actions offers free cron jobs that can trigger your Vercel API.

### Create `.github/workflows/send-compliment.yml`:

```yaml
name: Send ESP32 Compliment

on:
  schedule:
    # Runs every 10 minutes
    - cron: '*/10 * * * *'
  workflow_dispatch: # Allows manual triggering

jobs:
  send-compliment:
    runs-on: ubuntu-latest
    steps:
      - name: Send compliment to ESP32
        run: |
          curl -X POST https://your-app.vercel.app/api/send \
            -H "Content-Type: application/json" \
            -d '{"message":"Auto message from GitHub Actions"}'
```

**Setup:**
1. Create the file in your repository
2. Commit and push
3. GitHub will automatically run it every 10 minutes

**Pros:**
- ✅ Completely free
- ✅ Runs in the cloud
- ✅ Very reliable
- ✅ Can customize schedule easily

**Cons:**
- ❌ Requires ESP32 to be publicly accessible

---

## ✅ Solution 3: Use cron-job.org (Free Service)

[cron-job.org](https://cron-job.org) offers free scheduled HTTP requests.

### Setup:
1. Go to https://cron-job.org
2. Create a free account
3. Create a new cron job:
   - **URL**: `https://your-app.vercel.app/api/send`
   - **Method**: POST
   - **Schedule**: Every 10 minutes
   - **Request Body**: `{"message":"Your message here"}`

**Pros:**
- ✅ No code changes needed
- ✅ Easy web interface
- ✅ Free tier is generous

**Cons:**
- ❌ Depends on third-party service

---

## ✅ Solution 4: EasyCron (Free Tier)

[EasyCron](https://www.easycron.com) offers free cron jobs with more flexibility.

### Setup:
1. Sign up at https://www.easycron.com
2. Add new cron job:
   - **URL**: `https://your-app.vercel.app/api/webhook`
   - **Execution schedule**: Every 10 minutes
   - Free tier: 1 job with unlimited executions

**Pros:**
- ✅ Simple setup
- ✅ Free unlimited executions

**Cons:**
- ❌ Only 1 cron job on free tier

---

## ✅ Solution 5: Uptime Monitoring Services

Services like UptimeRobot can "ping" your API regularly.

### UptimeRobot Setup:
1. Sign up at https://uptimerobot.com (free)
2. Create HTTP(S) monitor:
   - **URL**: `https://your-app.vercel.app/api/webhook`
   - **Interval**: 5 minutes (minimum on free tier)

**Pros:**
- ✅ Free
- ✅ Also monitors your app's uptime
- ✅ Email alerts if API goes down

**Cons:**
- ❌ Minimum interval is 5 minutes
- ❌ Limited to GET requests on free tier

---

## ✅ Solution 6: Run Local Server

Use the Node.js server on a device that's always on (Raspberry Pi, old laptop, etc.)

```bash
# On your always-on device
cd /path/to/project
node compliment-server.js
```

**Pros:**
- ✅ Full control
- ✅ Any interval you want
- ✅ Works on local network

**Cons:**
- ❌ Requires always-on device
- ❌ Not accessible from outside your network

---

## 📊 Comparison Table

| Solution | Cost | Interval | Setup Difficulty | Reliability |
|----------|------|----------|------------------|-------------|
| **ESP32 Pulls** | Free | Any | Medium | ⭐⭐⭐⭐⭐ |
| **GitHub Actions** | Free | 5+ min | Easy | ⭐⭐⭐⭐⭐ |
| **cron-job.org** | Free | 1+ min | Easy | ⭐⭐⭐⭐ |
| **EasyCron** | Free | 1+ min | Easy | ⭐⭐⭐⭐ |
| **UptimeRobot** | Free | 5+ min | Easy | ⭐⭐⭐⭐ |
| **Local Server** | Free | Any | Medium | ⭐⭐⭐ |
| **Vercel Cron** | $20/mo | Any | Easy | ⭐⭐⭐⭐⭐ |

---

## 🏆 Recommended Approach

For most users, I recommend **Solution 1 (ESP32 Pulls)** because:

1. ✅ **Free forever** - no dependency on external cron services
2. ✅ **Most reliable** - ESP32 controls its own schedule
3. ✅ **Works anywhere** - no need for public IP or port forwarding
4. ✅ **Simple** - just fetch from Vercel API every 10 minutes

### Quick Implementation:

The ESP32 code I provided above will:
- Fetch a new compliment every 10 minutes
- Display it on the OLED
- Work with Vercel's free tier
- Require minimal changes to your existing code

---

## 🎯 Using Multiple Solutions Together

You can combine approaches! For example:

- **ESP32 polls every 10 minutes** (automatic compliments)
- **GitHub Actions runs daily** (morning motivation)
- **Use web UI** for instant custom messages

This gives you:
- Regular automated messages
- Special scheduled messages
- Manual control when needed

---

## 📝 Current Vercel Configuration

The `vercel.json` is now configured for:
```json
"schedule": "0 9 * * *"  // Daily at 9:00 AM
```

This works on Vercel's free tier and gives you one compliment per day from the cloud, plus you can use any of the solutions above for more frequent messages!

---

## 🆘 Need Help?

Open an issue on GitHub or check the main README.md for more information!
