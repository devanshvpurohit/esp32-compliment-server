/*
 * ESP32 Wi-Fi Clock with Message/Compliment Support
 * 
 * Features:
 * - Wi-Fi clock with NTP sync
 * - Captive portal for Wi-Fi setup
 * - Receives compliments and messages from Vercel
 * - Polls Vercel API for messages every 10 minutes
 * - Displays messages with word wrapping
 * 
 * Required Libraries:
 * - Adafruit_GFX
 * - Adafruit_SSD1306
 * - ArduinoJson (v6.x.x)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ------------------------- USER CONFIG -------------------------

// ---- SPI OLED pin mapping (EDIT THESE TO MATCH YOUR WIRING) ----
#define OLED_MOSI   23
#define OLED_CLK    18
#define OLED_DC     2
#define OLED_CS     5
#define OLED_RESET  4
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// ---- AP mode settings ----
const char* AP_SSID = "ESP32-Clock";
const char* AP_PASSWORD = "";   // open AP; set a password (>=8 chars) if you want it secured

// ---- Wi-Fi connect behavior ----
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;   // how long to try STA connect before falling back to AP
const unsigned long WIFI_RETRY_INTERVAL_MS  = 30000;   // how often to retry reconnecting while running normally

// ---- NTP settings ----
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.nist.gov";
long  GMT_OFFSET_SEC   = 19800;  // default: IST (+5:30). Edit for your timezone.
int   DAYLIGHT_OFFSET_SEC = 0;
const unsigned long NTP_SYNC_TIMEOUT_MS = 15000;
const unsigned long NTP_RESYNC_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL; // resync every 6 hours

// ---- DNS/captive portal ----
const byte DNS_PORT = 53;

// ---- MESSAGE/COMPLIMENT SETTINGS ----
// IMPORTANT: Replace with your actual Vercel deployment URL!
const char* VERCEL_API_URL = "https://your-app.vercel.app/api/compliment";
const unsigned long MESSAGE_FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const unsigned long MESSAGE_DISPLAY_DURATION = 60000; // Show message for 60 seconds

// ------------------------- GLOBALS -------------------------

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &SPI, OLED_DC, OLED_RESET, OLED_CS);
Preferences preferences;
WebServer server(80);
DNSServer dnsServer;

enum SystemState {
  STATE_BOOT,
  STATE_SCANNING,
  STATE_CONNECTING,
  STATE_CONNECTED,
  STATE_TIME_SYNCING,
  STATE_TIME_SYNCED,
  STATE_AP_MODE,
  STATE_CONNECT_FAILED
};

SystemState currentState = STATE_BOOT;
bool apModeActive = false;
bool timeSynced = false;
unsigned long lastWifiRetry = 0;
unsigned long lastNtpSync = 0;
unsigned long lastOledUpdate = 0;
String scannedNetworksHtml = "";
int scannedCount = 0;

// Message handling globals
String currentMessage = "";
String messageType = "";
String messageSender = "";
unsigned long messageDisplayTime = 0;
unsigned long lastMessageFetch = 0;

// ------------------------- FORWARD DECLARATIONS -------------------------

void oledStatus(const String& line1, const String& line2 = "", const String& line3 = "");
void oledShowClock();
void displayMessage(const String& message, const String& type, const String& sender = "");
bool tryConnectSavedCredentials();
void startAPMode();
void handleRoot();
void handleScan();
void handleConnect();
void handleReset();
void handleCompliment();
void handleMessage();
void handleNotFound();
void performNtpSync();
void fetchMessageFromVercel();
String scanNetworksAsHtmlOptions();

// ------------------------- SETUP -------------------------

void setup() {
  Serial.begin(115200);
  delay(200);
  
  // Init OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC)) {
    Serial.println("SSD1306 allocation failed");
    // Continue running even without OLED — don't hang the whole device
  }
  display.setTextColor(SSD1306_WHITE);
  oledStatus("Booting...", "ESP32 Message Clock");
  
  preferences.begin("wifi-cfg", false);
  WiFi.mode(WIFI_STA);
  delay(100);
  
  currentState = STATE_SCANNING;
  oledStatus("Checking saved", "credentials...");
  
  if (tryConnectSavedCredentials()) {
    currentState = STATE_CONNECTED;
    oledStatus("Wi-Fi Connected", WiFi.SSID(), WiFi.localIP().toString());
    performNtpSync();
    
    // Register message endpoints after successful connection
    server.on("/compliment", HTTP_POST, handleCompliment);
    server.on("/message", HTTP_POST, handleMessage);
    server.begin();
    
    Serial.println("Message endpoints registered:");
    Serial.println("  POST /compliment");
    Serial.println("  POST /message");
  } else {
    currentState = STATE_CONNECT_FAILED;
    startAPMode();
  }
}

// ------------------------- MAIN LOOP -------------------------

void loop() {
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
    
    // Keep AP-mode status refreshed periodically without spamming the OLED
    if (millis() - lastOledUpdate > 5000) {
      oledStatus("AP Mode Active", AP_SSID, WiFi.softAPIP().toString());
      lastOledUpdate = millis();
    }
    return;
  }
  
  // STA mode normal operation
  server.handleClient();
  
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
      messageSender = "";
      Serial.println("Message display time expired");
    }
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    // Lost connection — try to recover periodically, don't block the OLED clock forever
    if (millis() - lastWifiRetry > WIFI_RETRY_INTERVAL_MS) {
      lastWifiRetry = millis();
      oledStatus("Wi-Fi lost", "Reconnecting...");
      WiFi.reconnect();
      
      unsigned long start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
        delay(250);
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        oledStatus("Reconnected", WiFi.SSID());
        timeSynced = false;
        performNtpSync();
      } else {
        oledStatus("Reconnect failed", "Will retry...");
      }
    } else {
      oledShowClock(); // show last-known time even if disconnected
    }
    return;
  }
  
  // Connected: periodically resync NTP
  if (!timeSynced || (millis() - lastNtpSync > NTP_RESYNC_INTERVAL_MS)) {
    performNtpSync();
  }
  
  // Fetch messages from Vercel periodically
  if (millis() - lastMessageFetch > MESSAGE_FETCH_INTERVAL) {
    fetchMessageFromVercel();
    lastMessageFetch = millis();
  }
  
  oledShowClock();
  delay(200); // gentle pacing; avoids hammering the OLED/CPU
}

// ------------------------- OLED HELPERS -------------------------

void oledStatus(const String& line1, const String& line2, const String& line3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 Message Clock");
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);
  
  display.setCursor(0, 18);
  display.println(line1);
  
  if (line2.length()) {
    display.setCursor(0, 32);
    display.println(line2);
  }
  
  if (line3.length()) {
    display.setCursor(0, 46);
    display.println(line3);
  }
  
  display.display();
}

void oledShowClock() {
  struct tm timeinfo;
  display.clearDisplay();
  
  if (!getLocalTime(&timeinfo, 100)) {
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Time not synced");
    display.setCursor(0, 20);
    display.println(WiFi.status() == WL_CONNECTED ? WiFi.SSID() : "No connection");
    display.display();
    return;
  }
  
  char dateStr[16];
  char timeStr[16];
  strftime(dateStr, sizeof(dateStr), "%d-%m-%Y", &timeinfo);
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(WiFi.status() == WL_CONNECTED ? WiFi.SSID() : "Offline");
  
  display.setTextSize(2);
  display.setCursor(10, 20);
  display.println(timeStr);
  
  display.setTextSize(1);
  display.setCursor(20, 48);
  display.println(dateStr);
  
  display.display();
}

void displayMessage(const String& message, const String& type, const String& sender) {
  display.clearDisplay();
  
  // Header based on message type
  display.setTextSize(1);
  display.setCursor(0, 0);
  
  if (type == "sms" || type == "text") {
    display.println("=== TEXT MESSAGE ===");
  } else if (type == "compliment") {
    display.println("=== COMPLIMENT ===");
  } else if (type == "email") {
    display.println("==== EMAIL ====");
  } else {
    display.println("=== MESSAGE ===");
  }
  
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);
  
  // Word wrap the message
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
        if (currentY > SCREEN_HEIGHT - 15) break; // Stop if we run out of space
        currentX = 4;
        display.setCursor(currentX, currentY);
      }
      
      display.setCursor(currentX, currentY);
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
  
  if (sender.length() > 0 && sender != "Unknown") {
    display.setCursor(2, SCREEN_HEIGHT - 8);
    display.print("From: ");
    display.print(sender.substring(0, 12)); // Truncate long names
  } else if (type == "sms" || type == "text") {
    display.setCursor(30, SCREEN_HEIGHT - 8);
    display.print("New message!");
  } else {
    display.setCursor(30, SCREEN_HEIGHT - 8);
    display.print("Stay awesome!");
  }
  
  display.display();
}

// ------------------------- WIFI: STA CONNECT -------------------------

bool tryConnectSavedCredentials() {
  String savedSsid = preferences.getString("ssid", "");
  String savedPass = preferences.getString("pass", "");
  
  if (savedSsid.length() == 0) {
    Serial.println("No saved SSID found.");
    return false;
  }
  
  Serial.printf("Attempting connection to saved SSID: %s\n", savedSsid.c_str());
  oledStatus("Connecting to", savedSsid);
  
  WiFi.begin(savedSsid.c_str(), savedPass.c_str());
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  
  Serial.println("Failed to connect with saved credentials.");
  WiFi.disconnect(true);
  return false;
}

// ------------------------- WIFI: AP MODE + CAPTIVE PORTAL -------------------------

void startAPMode() {
  apModeActive = true;
  currentState = STATE_AP_MODE;
  WiFi.mode(WIFI_AP);
  
  bool apOk;
  if (strlen(AP_PASSWORD) >= 8) {
    apOk = WiFi.softAP(AP_SSID, AP_PASSWORD);
  } else {
    apOk = WiFi.softAP(AP_SSID);
  }
  
  IPAddress apIP = WiFi.softAPIP();
  Serial.printf("AP started: %s, IP: %s (ok=%d)\n", AP_SSID, apIP.toString().c_str(), apOk);
  
  // Captive portal DNS: redirect all domains to our IP
  dnsServer.start(DNS_PORT, "*", apIP);
  
  // Pre-scan networks once so the first page load is fast
  scannedNetworksHtml = scanNetworksAsHtmlOptions();
  
  server.on("/", HTTP_GET, handleRoot);
  server.on("/scan", HTTP_GET, handleScan);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/reset", HTTP_GET, handleReset);
  server.onNotFound(handleNotFound); // captive portal probes land here -> redirected to "/"
  
  server.begin();
  oledStatus("AP Mode Active", AP_SSID, apIP.toString());
}

String scanNetworksAsHtmlOptions() {
  Serial.println("Scanning Wi-Fi networks...");
  int n = WiFi.scanNetworks();
  scannedCount = n;
  String options = "";
  
  if (n <= 0) {
    options = "<option value=\"\">No networks found - tap Rescan</option>";
    return options;
  }
  
  // Deduplicate SSIDs, keep strongest RSSI
  struct Net { String ssid; int rssi; bool secure; };
  Net nets[64];
  int count = 0;
  
  for (int i = 0; i < n && count < 64; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) continue;
    
    bool found = false;
    for (int j = 0; j < count; j++) {
      if (nets[j].ssid == ssid) {
        found = true;
        if (WiFi.RSSI(i) > nets[j].rssi) nets[j].rssi = WiFi.RSSI(i);
        break;
      }
    }
    
    if (!found) {
      nets[count].ssid = ssid;
      nets[count].rssi = WiFi.RSSI(i);
      nets[count].secure = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
      count++;
    }
  }
  
  // Simple sort by signal strength, strongest first
  for (int i = 0; i < count - 1; i++) {
    for (int j = i + 1; j < count; j++) {
      if (nets[j].rssi > nets[i].rssi) {
        Net tmp = nets[i]; 
        nets[i] = nets[j]; 
        nets[j] = tmp;
      }
    }
  }
  
  for (int i = 0; i < count; i++) {
    options += "<option value=\"" + nets[i].ssid + "\">";
    options += nets[i].ssid;
    options += " (" + String(nets[i].rssi) + " dBm)";
    options += nets[i].secure ? " [secured]" : " [open]";
    options += "</option>";
  }
  
  WiFi.scanDelete();
  return options;
}

// ------------------------- WEB HANDLERS -------------------------

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32 Wi-Fi Setup</title><style>";
  html += "body{font-family:Arial,Helvetica,sans-serif;background:#111;color:#eee;margin:0;padding:20px;}";
  html += "h2{color:#4fc3f7;} .card{background:#1e1e1e;padding:20px;border-radius:10px;max-width:420px;margin:auto;}";
  html += "select,input{width:100%;padding:10px;margin:8px 0;border-radius:6px;border:1px solid #444;background:#2a2a2a;color:#eee;box-sizing:border-box;}";
  html += "button{width:100%;padding:12px;margin-top:10px;border:none;border-radius:6px;background:#4fc3f7;color:#000;font-weight:bold;font-size:16px;}";
  html += "a{color:#4fc3f7;}";
  html += "</style></head><body><div class='card'>";
  html += "<h2>ESP32 Clock Setup</h2>";
  html += "<form id='wifiForm' action='/connect' method='POST'>";
  html += "<label>Select Wi-Fi network:</label>";
  html += "<select name='ssid' id='ssid'>" + scannedNetworksHtml + "</select>";
  html += "<label>Password:</label>";
  html += "<input type='password' name='password' placeholder='Wi-Fi password (leave blank if open)'>";
  html += "<button type='submit'>Connect</button>";
  html += "</form>";
  html += "<button onclick=\"window.location='/'\" style='background:#555;color:#eee;margin-top:14px;'>Rescan Networks</button>";
  html += "<p style='margin-top:16px;font-size:13px;color:#999;'>Found " + String(scannedCount) + " networks. ";
  html += "<a href='/reset'>Erase saved credentials</a></p>";
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
}

void handleScan() {
  scannedNetworksHtml = scanNetworksAsHtmlOptions();
  server.sendHeader("Location", "/");
  server.send(303);
}

void handleConnect() {
  if (!server.hasArg("ssid") || server.arg("ssid").length() == 0) {
    server.send(400, "text/html", "<html><body><h3>No SSID selected. <a href='/'>Go back</a></h3></body></html>");
    return;
  }
  
  String ssid = server.arg("ssid");
  String password = server.hasArg("password") ? server.arg("password") : "";
  
  preferences.putString("ssid", ssid);
  preferences.putString("pass", password);
  
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;background:#111;color:#eee;text-align:center;padding-top:60px;}</style>";
  html += "</head><body><h2>Saved!</h2><p>Restarting and connecting to<br><b>" + ssid + "</b>...</p></body></html>";
  
  server.send(200, "text/html", html);
  oledStatus("Credentials saved", ssid, "Restarting...");
  delay(1500);
  ESP.restart();
}

void handleReset() {
  preferences.remove("ssid");
  preferences.remove("pass");
  
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;background:#111;color:#eee;text-align:center;padding-top:60px;}</style>";
  html += "</head><body><h2>Credentials erased</h2><p>Restarting into setup mode...</p></body></html>";
  
  server.send(200, "text/html", html);
  oledStatus("Credentials erased", "Restarting...");
  delay(1500);
  ESP.restart();
}

void handleNotFound() {
  // Captive portal detection on phones/laptops hits random URLs — send them to the setup page
  server.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/", true);
  server.send(302, "text/plain", "");
}

// ------------------------- MESSAGE HANDLERS -------------------------

void handleCompliment() {
  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"success\":false,\"error\":\"Method Not Allowed\"}");
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
  messageSender = "";
  messageDisplayTime = millis();
  
  Serial.printf("Compliment: %s\n", message);
  displayMessage(currentMessage, messageType, messageSender);
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Compliment displayed\"}");
}

void handleMessage() {
  if (server.method() != HTTP_POST) {
    server.send(405, "application/json", "{\"success\":false,\"error\":\"Method Not Allowed\"}");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Received message:");
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
  const char* sender = doc["sender"] | "Unknown";
  
  if (message == nullptr || strlen(message) == 0) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing message field\"}");
    return;
  }
  
  currentMessage = String(message);
  messageType = String(type);
  messageSender = String(sender);
  messageDisplayTime = millis();
  
  Serial.printf("Message: %s (type: %s, from: %s)\n", message, type, sender);
  displayMessage(currentMessage, messageType, messageSender);
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Message displayed\"}");
}

// ------------------------- FETCH MESSAGE FROM VERCEL -------------------------

void fetchMessageFromVercel() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping message fetch");
    return;
  }
  
  Serial.println("Fetching message from Vercel...");
  Serial.printf("URL: %s\n", VERCEL_API_URL);
  
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
      if (compliment && strlen(compliment) > 0) {
        currentMessage = String(compliment);
        messageType = "compliment";
        messageSender = "Vercel";
        messageDisplayTime = millis();
        
        Serial.printf("New compliment fetched: %s\n", compliment);
        displayMessage(currentMessage, messageType, messageSender);
      }
    } else {
      Serial.print("JSON parse error: ");
      Serial.println(error.c_str());
    }
  } else if (httpCode > 0) {
    Serial.printf("HTTP GET failed, code: %d\n", httpCode);
  } else {
    Serial.printf("HTTP GET failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

// ------------------------- NTP -------------------------

void performNtpSync() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  currentState = STATE_TIME_SYNCING;
  oledStatus("Syncing time...", "via NTP");
  
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
  
  struct tm timeinfo;
  unsigned long start = millis();
  bool ok = false;
  
  while (millis() - start < NTP_SYNC_TIMEOUT_MS) {
    if (getLocalTime(&timeinfo, 500)) {
      ok = true;
      break;
    }
  }
  
  if (ok) {
    timeSynced = true;
    lastNtpSync = millis();
    currentState = STATE_TIME_SYNCED;
    
    char buf[32];
    strftime(buf, sizeof(buf), "%H:%M:%S %d-%m-%Y", &timeinfo);
    Serial.printf("NTP synced: %s\n", buf);
    oledStatus("Time synced", buf);
    delay(800);
  } else {
    Serial.println("NTP sync failed/timed out. Will retry later.");
    oledStatus("NTP sync failed", "Will retry soon");
    delay(800);
    // Don't mark timeSynced -> loop() will retry on next iteration
  }
}
