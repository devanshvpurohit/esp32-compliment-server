# ESP32 Compliment Server

A Node.js server that sends motivational compliments to your ESP32 clock display every 10 minutes via HTTP.

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/devanshvpurohit/esp32-compliment-server)

**[📖 Full Vercel Deployment Guide →](VERCEL_DEPLOY.md)**

## Features

- 🎁 Automatically sends compliments every 10 minutes
- 📡 RESTful API for manual triggers and compliment fetching
- 📊 Web dashboard with delivery statistics
- 🔄 Configurable intervals and ESP32 IP
- 💪 Error handling and retry logic
- 🌐 CORS-enabled for web integration

## Prerequisites

- Node.js 14.0.0 or higher
- ESP32 running the clock firmware (must accept POST requests at `/compliment` endpoint)

## Quick Start

1. **Install dependencies** (none required, uses only Node.js built-in modules!)

2. **Configure the server**

   Edit `compliment-server.js` and update the configuration:
   ```javascript
   const CONFIG = {
     ESP32_IP: '192.168.4.1',  // ← Change to your ESP32's IP address
     ESP32_PORT: 80,
     COMPLIMENT_INTERVAL: 10 * 60 * 1000,  // 10 minutes
   };
   ```

3. **Run the server**
   ```bash
   npm start
   # or
   node compliment-server.js
   ```

4. **Access the dashboard**
   
   Open http://localhost:3000 in your browser to see stats and manually trigger compliments.

## API Endpoints

### GET /api/compliment
Get a random compliment
```bash
curl http://localhost:3000/api/compliment
```
Response:
```json
{
  "success": true,
  "compliment": "You're amazing!",
  "total": 50,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/trigger
Manually trigger sending a compliment to ESP32
```bash
curl -X POST http://localhost:3000/api/trigger
```

### GET /api/stats
Get server statistics
```bash
curl http://localhost:3000/api/stats
```
Response:
```json
{
  "deliveries": 42,
  "successful": 40,
  "failed": 2,
  "intervalMinutes": 10,
  "esp32": "192.168.4.1:80",
  "uptime": 7200
}
```

## ESP32 Integration

Your ESP32 firmware needs to handle POST requests at `/compliment` endpoint:

```cpp
// Add this to your ESP32 code:

void handleCompliment() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  
  // Parse JSON
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }
  
  String message = doc["message"];
  
  // Display the compliment on OLED
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("💌 Compliment:");
  display.println();
  display.setTextSize(2);
  display.println(message);
  display.display();
  
  server.send(200, "application/json", "{\"success\":true}");
}

// In setup(), add:
server.on("/compliment", HTTP_POST, handleCompliment);
```

**Note:** You'll need to include `ArduinoJson` library in your ESP32 project.

## Configuration Options

Edit the `CONFIG` object in `compliment-server.js`:

| Option | Default | Description |
|--------|---------|-------------|
| `SERVER_PORT` | 3000 | Port for the web API |
| `ESP32_IP` | `192.168.4.1` | Your ESP32's IP address |
| `ESP32_PORT` | 80 | ESP32 web server port |
| `COMPLIMENT_INTERVAL` | 600000 (10 min) | Time between compliments in milliseconds |
| `USE_EXTERNAL_API` | false | Use external API for compliments |
| `EXTERNAL_API_URL` | - | URL of external compliment API |

## Customizing Compliments

Edit the `COMPLIMENTS` array in `compliment-server.js` to add your own messages:

```javascript
const COMPLIMENTS = [
  "You're doing great!",
  "Your custom message here!",
  // Add more...
];
```

## Running as a Service

### macOS (launchd)

Create `~/Library/LaunchAgents/com.user.compliment-server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.compliment-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/yourusername/work/compliment-server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.user.compliment-server.plist
```

### Linux (systemd)

Create `/etc/systemd/system/compliment-server.service`:

```ini
[Unit]
Description=ESP32 Compliment Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/work
ExecStart=/usr/bin/node /home/youruser/work/compliment-server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable compliment-server
sudo systemctl start compliment-server
```

## Troubleshooting

### ESP32 not receiving compliments

1. Check if the ESP32 IP is correct:
   ```bash
   ping 192.168.4.1
   ```

2. Test the endpoint manually:
   ```bash
   curl -X POST http://192.168.4.1/compliment \
     -H "Content-Type: application/json" \
     -d '{"message":"Test message"}'
   ```

3. Check server logs for error messages

### Port already in use

Change `SERVER_PORT` in the configuration or kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

## License

MIT

## Contributing

Feel free to add more compliments or features! Pull requests welcome.
