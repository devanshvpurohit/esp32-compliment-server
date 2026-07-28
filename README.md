# WorkBetter: ESP32 OLED Compliment System — Vercel Edition ⚡

A full-stack system for sending real-time compliments and custom messages to an **ESP32 SSD1306 OLED display**, with a beautiful React dashboard deployed on **Vercel**.

---

## 🏗️ Architecture (Stateless)

```
React Dashboard (Vercel Static)
        │  HTTP polling every 5 s
        ▼
Vercel Serverless API  /api/*
        │  Reads / writes in-memory state
        │  (kept alive by continuous polling)
        ▲
        │  HTTPS polling every 30 s
ESP32 Wi-Fi Client
        │  I²C / SPI
        ▼
SSD1306 OLED (128 × 64)
```

> [!WARNING]
> **This deployment relies on Vercel's in-memory cache.** Because the dashboard and ESP32 constantly poll the server, the server function never goes to sleep. However, if Vercel restarts the server for maintenance or scaling, the message history will be instantly wiped and the ESP32 will revert to the default "Welcome" message.

---

## 🚀 Deploy to Vercel — Zero Configuration

1. Go to **https://vercel.com/new** → **Import Git Repository**.
2. Select your repo.
3. Click **Deploy**. That's it! No environment variables or databases needed.
4. Your app is live at `https://your-app.vercel.app` 🎉

---

## 💻 Local Development

```bash
# 1. Install dependencies
cd frontend && npm install && cd ..

# 2. Start local dev server (requires Vercel CLI: npm i -g vercel)
vercel dev
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

---

## 🔧 ESP32 Configuration

Open [esp32/esp32.ino](file:///Users/devanshvpurohit/work/esp32/esp32.ino) and change:

```cpp
// ← Your Vercel deployment URL (no trailing slash)
const char* VERCEL_HOST = "https://your-app.vercel.app";
```

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

1. Flash the sketch. The ESP32 boots into **AP mode** → SSID: `WorkBetter-Setup`.
2. Connect your phone/laptop to that network.
3. A setup page opens automatically (or navigate to `192.168.4.1`).
4. Select your home Wi-Fi from the dropdown, enter the password, press **Save & Connect**.
5. Credentials are saved to NVS — the ESP32 auto-connects on every subsequent boot.
6. To reset Wi-Fi: visit `http://<ESP32-IP>/reset` from any browser on the same network.
