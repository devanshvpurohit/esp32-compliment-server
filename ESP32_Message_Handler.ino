/*
 * ESP32 Message Handler - Enhanced version with SMS/Text message support
 * 
 * This code handles both compliments and text messages from Vercel
 * 
 * REQUIRED LIBRARY: ArduinoJson (install via Library Manager)
 */

#include <ArduinoJson.h>
#include <HTTPClient.h>

// Global variables for messages
String currentMessage = "";
String messageType = "";
unsigned long messageDisplayTime = 0;
const unsigned long MESSAGE_DISPLAY_DURATION = 60000; // Show message for 60 seconds

// Configuration
const char* VERCEL_API_URL = "https://your-app.vercel.app/api/compliment";
unsigned long lastMessageFetch = 0;
const unsigned long FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// ========================= SETUP =========================
void setupMessageEndpoints() {
  // Register both endpoints
  server.on("/compliment", HTTP_POST, handleCompliment);
  server.on("/message", HTTP_POST, handleMessage);
  
  Serial.println("Message endpoints registered:");
  Serial.println("  POST /compliment - for compliments");
  Serial.println("  POST /message - for text messages");
}

// ========================= COMPLIMENT HANDLER (Original) =========================
void handleCompliment() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Received compliment:");
  Serial.println(body);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid JSON\"}");
    return;
  }
  
  const char* message = doc["message"];
  
  if (message == nullptr || strlen(message) == 0) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing message field\"}");
    return;
  }
  
  currentMessage = String(message);
  messageType = "compliment";
  messageDisplayTime = millis();
  
  Serial.print("Compliment: ");
  Serial.println(currentMessage);
  
  displayMessage(currentMessage, messageType);
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Compliment displayed\"}");
}

// ========================= TEXT MESSAGE HANDLER (New) =========================
void handleMessage() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Received text message:");
  Serial.println(body);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid JSON\"}");
    return;
  }
  
  const char* message = doc["message"];
  const char* type = doc["type"] | "text";
  const char* timestamp = doc["timestamp"] | "";
  
  if (message == nullptr || strlen(message) == 0) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing message field\"}");
    return;
  }
  
  currentMessage = String(message);
  messageType = String(type);
  messageDisplayTime = millis();
  
  Serial.printf("Message: %s (type: %s)\n", message, type);
  
  displayMessage(currentMessage, messageType);
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Text message displayed\"}");
}

// ========================= DISPLAY MESSAGE ON OLED =========================
void displayMessage(const String& message, const String& type) {
  display.clearDisplay();
  
  // Header based on message type
  display.setTextSize(1);
  display.setCursor(0, 0);
  
  if (type == "sms" || type == "text") {
    display.println("=== TEXT MESSAGE ===");
  } else if (type == "compliment") {
    display.println("=== COMPLIMENT ===");
  } else {
    display.println("=== MESSAGE ===");
  }
  
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);
  
  // Word wrap the message
  display.setCursor(4, 18);
  display.setTextSize(1);
  
  int lineHeight = 10;
  int maxWidth = 120;
  int currentY = 18;
  int currentX = 4;
  
  String word = "";
  for (unsigned int i = 0; i < message.length(); i++) {
    char c = message.charAt(i);
    
    if (c == ' ' || c == '\n' || i == message.length() - 1) {
      if (i == message.length() - 1 && c != ' ' && c != '\n') {
        word += c;
      }
      
      if (c == '\n') {
        // Force new line
        currentY += lineHeight;
        currentX = 4;
        display.setCursor(currentX, currentY);
        word = "";
        continue;
      }
      
      // Check if word fits on current line
      int16_t x1, y1;
      uint16_t w, h;
      display.getTextBounds(word.c_str(), currentX, currentY, &x1, &y1, &w, &h);
      
      if (currentX + w > maxWidth && currentX > 4) {
        // Move to next line
        currentY += lineHeight;
        currentX = 4;
        display.setCursor(currentX, currentY);
      }
      
      display.print(word);
      display.print(" ");
      currentX = display.getCursorX();
      word = "";
    } else {
      word += c;
    }
  }
  
  // Footer
  display.drawLine(0, SCREEN_HEIGHT - 12, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 12, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(30, SCREEN_HEIGHT - 8);
  
  if (type == "sms" || type == "text") {
    display.print("New message!");
  } else {
    display.print("Stay awesome!");
  }
  
  display.display();
}

// ========================= FETCH MESSAGE FROM VERCEL (Pull Method) =========================
void fetchMessageFromVercel() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping message fetch");
    return;
  }
  
  Serial.println("Fetching message from Vercel...");
  
  HTTPClient http;
  http.begin(VERCEL_API_URL);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    Serial.println("Received: " + payload);
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      const char* compliment = doc["compliment"];
      if (compliment) {
        currentMessage = String(compliment);
        messageType = "compliment";
        messageDisplayTime = millis();
        displayMessage(currentMessage, messageType);
      }
    } else {
      Serial.print("JSON parse error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
  }
  
  http.end();
}

// ========================= UPDATE YOUR MAIN LOOP() =========================
void loop() {
  // Your existing loop code...
  
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }
  
  // Handle web requests (for push messages)
  server.handleClient();
  
  // Check if we should fetch a new message (pull method)
  if (millis() - lastMessageFetch > FETCH_INTERVAL) {
    fetchMessageFromVercel();
    lastMessageFetch = millis();
  }
  
  // Check if we should still display message
  if (currentMessage.length() > 0) {
    if (millis() - messageDisplayTime < MESSAGE_DISPLAY_DURATION) {
      // Still showing message, don't update display with clock
      delay(200);
      return;
    } else {
      // Message display time expired, clear it
      currentMessage = "";
      messageType = "";
    }
  }
  
  // Your existing connection/time sync logic...
  if (WiFi.status() != WL_CONNECTED) {
    // Reconnection logic...
  }
  
  // Connected: show clock
  if (!timeSynced || (millis() - lastNtpSync > NTP_RESYNC_INTERVAL_MS)) {
    performNtpSync();
  }
  
  oledShowClock();
  delay(200);
}

/* 
 * ========================= INSTALLATION STEPS =========================
 * 
 * 1. Install ArduinoJson library:
 *    - Open Arduino IDE
 *    - Go to Tools > Manage Libraries
 *    - Search for "ArduinoJson" by Benoit Blanchon
 *    - Install version 6.x.x
 * 
 * 2. Add #include <ArduinoJson.h> and #include <HTTPClient.h> at the top
 * 
 * 3. Add global variables at the top of your sketch:
 *    String currentMessage = "";
 *    String messageType = "";
 *    unsigned long messageDisplayTime = 0;
 *    const unsigned long MESSAGE_DISPLAY_DURATION = 60000;
 *    const char* VERCEL_API_URL = "https://your-app.vercel.app/api/compliment";
 *    unsigned long lastMessageFetch = 0;
 *    const unsigned long FETCH_INTERVAL = 10 * 60 * 1000;
 * 
 * 4. In setup(), after server.begin(), add:
 *    server.on("/compliment", HTTP_POST, handleCompliment);
 *    server.on("/message", HTTP_POST, handleMessage);
 * 
 * 5. Copy all the handler functions into your sketch
 * 
 * 6. Update your loop() as shown above
 * 
 * 7. Upload to your ESP32
 * 
 * 8. Test with curl:
 *    # Send compliment:
 *    curl -X POST http://YOUR_ESP32_IP/compliment \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":"You are awesome!"}'
 *    
 *    # Send text message:
 *    curl -X POST http://YOUR_ESP32_IP/message \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":"From Mom: Don'\''t forget dinner!","type":"sms"}'
 * 
 * ========================= FEATURES =========================
 * 
 * ✅ Handles both compliments and text messages
 * ✅ Pulls messages from Vercel every 10 minutes
 * ✅ Receives pushed messages via webhooks
 * ✅ Displays sender info for text messages
 * ✅ Auto-dismisses messages after 60 seconds
 * ✅ Word wrapping for long messages
 * ✅ Different headers for different message types
 * 
 * ========================= DONE! =========================
 */
