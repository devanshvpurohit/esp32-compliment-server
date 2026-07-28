/*
 * ESP32 Compliment Endpoint - Add this to your existing ESP32 clock code
 * 
 * This code snippet shows how to add the /compliment endpoint handler
 * that receives compliments from the Node.js server.
 * 
 * REQUIRED LIBRARY: ArduinoJson (install via Library Manager)
 */

#include <ArduinoJson.h>

// Global variable to store current compliment
String currentCompliment = "";
unsigned long complimentDisplayTime = 0;
const unsigned long COMPLIMENT_DISPLAY_DURATION = 30000; // Show compliment for 30 seconds

// ========================= ADD TO YOUR SETUP() =========================
void setupComplimentEndpoint() {
  // Add this line in your setup() function after server.begin()
  server.on("/compliment", HTTP_POST, handleCompliment);
  
  Serial.println("Compliment endpoint registered at /compliment");
}

// ========================= COMPLIMENT HANDLER =========================
void handleCompliment() {
  // Only accept POST requests
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  // Get request body
  String body = server.arg("plain");
  Serial.println("Received compliment request:");
  Serial.println(body);
  
  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid JSON\"}");
    return;
  }
  
  // Extract message
  const char* message = doc["message"];
  
  if (message == nullptr || strlen(message) == 0) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing message field\"}");
    return;
  }
  
  // Store the compliment
  currentCompliment = String(message);
  complimentDisplayTime = millis();
  
  Serial.print("Compliment received: ");
  Serial.println(currentCompliment);
  
  // Display immediately
  displayCompliment(currentCompliment);
  
  // Send success response
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Compliment displayed\"}");
}

// ========================= DISPLAY COMPLIMENT ON OLED =========================
void displayCompliment(const String& message) {
  display.clearDisplay();
  
  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("=== COMPLIMENT ===");
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);
  
  // Word wrap the compliment message
  display.setCursor(4, 18);
  display.setTextSize(1);
  
  // Simple word wrapping
  int lineHeight = 10;
  int maxWidth = 120;  // pixels
  int currentY = 18;
  int currentX = 4;
  
  String word = "";
  for (unsigned int i = 0; i < message.length(); i++) {
    char c = message.charAt(i);
    
    if (c == ' ' || i == message.length() - 1) {
      // End of word
      if (i == message.length() - 1 && c != ' ') {
        word += c;
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
  
  // Footer decoration
  display.drawLine(0, SCREEN_HEIGHT - 12, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 12, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(40, SCREEN_HEIGHT - 8);
  display.print("Stay awesome!");
  
  display.display();
}

// ========================= UPDATE YOUR MAIN LOOP() =========================
void loop() {
  // Your existing loop code...
  
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
    // ... existing AP mode code ...
    return;
  }
  
  // Handle web requests
  server.handleClient();
  
  // Check if we should still display compliment
  if (currentCompliment.length() > 0) {
    if (millis() - complimentDisplayTime < COMPLIMENT_DISPLAY_DURATION) {
      // Still showing compliment, don't update display with clock
      delay(200);
      return;
    } else {
      // Compliment display time expired, clear it
      currentCompliment = "";
    }
  }
  
  // Your existing connection/time sync logic...
  if (WiFi.status() != WL_CONNECTED) {
    // ... existing reconnection code ...
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
 * 2. Add #include <ArduinoJson.h> at the top of your main sketch
 * 
 * 3. Add these global variables at the top of your sketch:
 *    String currentCompliment = "";
 *    unsigned long complimentDisplayTime = 0;
 *    const unsigned long COMPLIMENT_DISPLAY_DURATION = 30000;
 * 
 * 4. In setup(), after server.begin(), add:
 *    server.on("/compliment", HTTP_POST, handleCompliment);
 * 
 * 5. Copy the handleCompliment() and displayCompliment() functions into your sketch
 * 
 * 6. Update your loop() to check for active compliment display (see above)
 * 
 * 7. Upload to your ESP32
 * 
 * 8. Test with curl:
 *    curl -X POST http://YOUR_ESP32_IP/compliment \
 *      -H "Content-Type: application/json" \
 *      -d '{"message":"You are awesome!"}'
 * 
 * ========================= DONE! =========================
 */
