# WorkBetter: ESP32 OLED Compliment System — Vercel Edition ⚡

A full-stack system for sending real-time compliments and custom messages to an **ESP32 SSD1306 OLED display**, with a beautiful React dashboard deployed on **Vercel**.

---

## 🏗️ Architecture

```
React Dashboard (Vercel Static)
        │  HTTP polling every 5 s
        ▼
Vercel Serverless API  /api/*
        │  Reads / writes state
        ▼
Upstash Redis  (free tier)
        ▲  HTTPS polling every 30 s
        │
ESP32 Wi-Fi Client
        │  I²C / SPI
        ▼
SSD1306 OLED (128 × 64)
```

---

## 📂 Project Structure

```
workbetter/
├── .env.example              ← copy to .env.local and fill in your values
├── vercel.json               ← Vercel routing + build config
├── package.json              ← root: @upstash/redis for API routes
│
├── api/                      ← Vercel Serverless Functions
│   ├── _lib/
│   │   ├── compliments.js    ← compliments list + random picker
│   │   └── kv.js             ← Upstash Redis helpers
│   ├── message.js            ← GET  /api/message
│   ├── send.js               ← POST /api/send
│   ├── history.js            ← GET  /api/history
│   ├── history-clear.js      ← POST /api/history-clear
│   ├── status.js             ← GET  /api/status
│   └── esp32-ping.js         ← GET  /api/esp32-ping  (ESP32 heartbeat + message)
│
├── frontend/                 ← React + Vite (built to frontend/dist)
│   ├── package.json
│   ├── vite.config.js        ← proxies /api/* to localhost:3000 in local dev
│   └── src/
│       ├── lib/
│       │   └── compliments.js ← client-side compliments (for countdown timer)
│       ├── hooks/
│       │   └── useApi.js      ← polling hook (replaces Socket.IO)
│       ├── Dashboard.jsx
│       └── components/
│           ├── ConnectionStatus.jsx
│           ├── MessageForm.jsx
│           ├── Favorites.jsx
│           ├── Scheduler.jsx
│           ├── HistoryList.jsx
│           ├── OledPreview.jsx
│           └── AutoComplimentTimer.jsx
│
└── esp32/
    └── esp32.ino             ← HTTPS polling firmware (no WebSockets needed)
```

---

## 🚀 Deploy to Vercel — Step by Step

### 1. Create a free Upstash Redis database

1. Go to **https://console.upstash.com** → Sign up / log in (free).
2. Click **Create Database** → choose a region close to you → **Create**.
3. Open the database → **REST API** tab → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. Push to GitHub

```bash
# From the workbetter/ folder (or the repo root):
git add .
git commit -m "feat: WorkBetter Vercel edition"
git push
```

### 3. Import into Vercel

1. Go to **https://vercel.com/new** → **Import Git Repository**.
2. Select your repo → Vercel auto-detects `vercel.json`.
3. Before deploying, add your environment variables under **Environment Variables**:

| Name | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://your-db.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | `your-token` |

4. Click **Deploy** → Vercel builds the React frontend and deploys the API routes.
5. Your app is live at `https://your-app.vercel.app` 🎉

---

## 💻 Local Development

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link the project (first time only)
cd workbetter
vercel link

# 3. Pull environment variables from Vercel
vercel env pull .env.local

# 4. Install dependencies
npm install                          # root (@upstash/redis for API)
cd frontend && npm install && cd ..  # React deps

# 5. Start local dev server
vercel dev    # serves API on :3000 + frontend on :3000 (same origin)
```

Open **http://localhost:3000** in your browser.

---

## 🔌 REST API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/message` | Current message `{id, text, type, timestamp}` |
| `POST` | `/api/send` | Body `{"text":"…","type":"custom"}` → saves + returns message |
| `GET` | `/api/history` | Array of last 100 messages, newest first |
| `POST` | `/api/history-clear` | Deletes all history (current message preserved) |
| `GET` | `/api/status` | `{"esp32Connected": true/false}` |
| `GET` | `/api/esp32-ping` | ESP32 heartbeat → returns current message |

### Quick test with curl

```bash
BASE=https://your-app.vercel.app

# Check status
curl $BASE/api/status

# Send a message
curl -X POST $BASE/api/send \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello ESP32!","type":"custom"}'

# Read current message
curl $BASE/api/message

# Simulate ESP32 ping
curl $BASE/api/esp32-ping
```

---

## 🔧 ESP32 Configuration

Open [esp32.ino](file:///Users/devanshvpurohit/work/workbetter/esp32/esp32.ino) and change:

```cpp
// ← Your Vercel deployment URL (no trailing slash)
const char* VERCEL_HOST = "https://your-app.vercel.app";
```

### Required Libraries (Arduino IDE → Library Manager)

| Library | Author |
|---|---|
| Adafruit SSD1306 | Adafruit |
| Adafruit GFX Library | Adafruit |
| ArduinoJson | Benoit Blanchon |

> `WiFi.h`, `HTTPClient.h`, `WiFiClientSecure.h`, `WebServer.h`, `DNSServer.h`, `Preferences.h`, `time.h` are all part of the **ESP32 Arduino Core** (no separate install needed).

### SPI OLED Wiring

| OLED Pin | ESP32 GPIO |
|---|---|
| VCC | 3.3V |
| GND | GND |
| MOSI / SDA | 23 |
| CLK / SCL | 18 |
| DC | 16 |
| CS | 5 |
| RES / RESET | 17 |

### First Boot — Wi-Fi Setup

1. Flash the sketch. The ESP32 boots into **AP mode** → SSID: `ESP32-Clock`.
2. Connect your phone/laptop to that network.
3. A setup page opens automatically (or navigate to `192.168.4.1`).
4. Select your home Wi-Fi from the dropdown, enter the password, press **Save & Connect**.
5. Credentials are saved to NVS — the ESP32 auto-connects on every subsequent boot.
6. To reset Wi-Fi: visit `http://<ESP32-IP>/reset` from any browser on the same network.

---

## ✨ Features

| Feature | Notes |
|---|---|
| **10-min auto compliments** | Countdown runs in the browser; dashboard tab must be open |
| **Custom messages** | Sent instantly via `POST /api/send` |
| **Favorites** | Saved to `localStorage` — persists across page reloads |
| **Scheduler** | Client-side `setTimeout`; tab must be open |
| **OLED preview** | Pixel-perfect 128×64 emulator with scroll animation |
| **History** | Last 100 messages stored in Upstash Redis |
| **ESP32 status** | Green if pinged within last 60 s |
| **Confetti** | Fires on every new message 🎉 |

---

## ⚠️ Differences vs. Local Node.js Server

| Feature | Local | Vercel |
|---|---|---|
| ESP32 message latency | ✅ Instant (WebSocket) | ⚠️ ≤30 s (polling) |
| Dashboard update latency | ✅ Instant (Socket.IO) | ⚠️ ≤5 s (polling) |
| Auto-compliment timer | ✅ Always-on (server) | ⚠️ Browser tab must be open |
| Scheduled messages | ✅ Always-on (server) | ⚠️ Browser tab must be open |
| History persistence | ✅ JSON file | ✅ Upstash Redis |
| Accessible on internet | ❌ Local only | ✅ Global HTTPS URL |
