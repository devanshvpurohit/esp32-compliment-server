# 🚀 Quick Start Guide

Get your ESP32 receiving compliments in 5 minutes!

## Step 1: Update ESP32 IP Address

Edit `compliment-server.js` line 15:

```javascript
ESP32_IP: '192.168.4.1',  // ← Change this to your ESP32's actual IP
```

To find your ESP32's IP:
- Check the OLED display when connected to Wi-Fi
- Look in your router's device list
- Check the Serial Monitor in Arduino IDE

## Step 2: Start the Server

```bash
node compliment-server.js
```

You should see:
```
📡 Web API server listening on http://localhost:3000
🚀 Starting compliment delivery...
```

## Step 3: Test the Server

Open http://localhost:3000 in your browser to see the dashboard.

Or test the API:
```bash
curl http://localhost:3000/api/compliment
```

## Step 4: Update Your ESP32 Code

### Quick Method (if you don't want to modify your existing code):

Create a simple endpoint tester. Add this to your ESP32 code in `setup()`:

```cpp
server.on("/compliment", HTTP_POST, []() {
  String body = server.arg("plain");
  Serial.println("Received: " + body);
  
  // Display on OLED (simple version)
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Compliment:");
  display.println(body);
  display.display();
  
  server.send(200, "text/plain", "OK");
});
```

### Full Method (with JSON parsing):

1. Install ArduinoJson library in Arduino IDE
2. Follow instructions in `ESP32_Compliment_Endpoint.ino`

## Step 5: Test ESP32 Connection

Send a test compliment:

```bash
curl -X POST http://YOUR_ESP32_IP/compliment \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from command line!"}'
```

Or use the dashboard "Send Now" button.

## Troubleshooting

### "Failed to send compliment: ECONNREFUSED"

- ESP32 is not reachable
- Check the IP address
- Make sure ESP32 is connected to Wi-Fi (not in AP mode)
- Ping the ESP32: `ping YOUR_ESP32_IP`

### "Failed to send compliment: ETIMEDOUT"

- ESP32 web server might not be responding
- Check if the `/compliment` endpoint is registered
- Look at ESP32 Serial Monitor for errors

### ESP32 receives but doesn't display

- Check if ArduinoJson is installed correctly
- Verify the JSON parsing in your ESP32 code
- Check Serial Monitor for parse errors

## Next Steps

- **Customize compliments**: Edit the `COMPLIMENTS` array in `compliment-server.js`
- **Change interval**: Modify `COMPLIMENT_INTERVAL` (in milliseconds)
- **Run as background service**: See README.md for launchd/systemd setup
- **Monitor stats**: Visit http://localhost:3000

## Need Help?

Run the test suite:
```bash
npm test
```

This will test all endpoints and ESP32 connectivity.

---

**Tip:** Leave the server running in a terminal, and your ESP32 will receive motivational compliments every 10 minutes! 🎁
