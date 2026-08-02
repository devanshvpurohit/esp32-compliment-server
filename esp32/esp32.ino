/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║         WorkBetter ESP32 — Vercel Edition  v3.0                 ║
 ║                                                                  ║
 ║  Features:                                                       ║
 ║   • SPI SSD1306 OLED (128×64) — live clock + compliments        ║
 ║   • MPU6050 IMU — tap, shake, tilt gestures                     ║
 ║   • Captive-portal Wi-Fi setup (scan → dropdown → save)         ║
 ║   • NTP time sync + periodic resync                             ║
 ║   • HTTPS polling to Vercel API every 30 s                      ║
 ║     - Single request: heartbeat + message fetch                  ║
 ║   • Word-wrap + centred layout + vertical auto-scroll            ║
 ║   • Emoji → ASCII mapping (prevents OLED garbling)              ║
 ║   • Automatic Wi-Fi reconnection                                 ║
 ║   • /reset endpoint to erase saved credentials                  ║
 ║                                                                  ║
 ║  Hardware:                                                       ║
 ║   • ESP32 dev board                                              ║
 ║   • SPI SSD1306 OLED 128×64                                     ║
 ║   • MPU6050 IMU (I2C: SDA=21, SCL=22)                           ║
 ║                                                                  ║
 ║  Libraries (install via Arduino IDE → Library Manager):         ║
 ║   • Adafruit SSD1306                                            ║
 ║   • Adafruit GFX Library                                        ║
 ║   • ArduinoJson  (by Benoit Blanchon)                           ║
 ║   • Adafruit MPU6050                                            ║
 ║   • Adafruit Unified Sensor                                     ║
 ║                                                                  ║
 ║  IMU Gestures:                                                   ║
 ║   • Double-tap → Request random compliment                       ║
 ║   • Shake → Toggle auto-compliment mode                          ║
 ║   • Tilt 90° → Rotate display orientation                        ║
 ║   • Face down → Screen saver / sleep mode                        ║
 ║                                                                  ║
 ║  All other headers (WiFi, HTTPClient, WebServer, DNSServer,     ║
 ║  Preferences, time.h) ship with the ESP32 Arduino core.        ║
 ╚══════════════════════════════════════════════════════════════════╝
*/

// ─────────────────────────────────────────────────────────────────────────────
//  INCLUDES
// ─────────────────────────────────────────────────────────────────────────────
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Optional: IMU support (comment out these lines if you don't have MPU6050)
// To disable IMU: comment the next 3 lines
#define ENABLE_IMU  // ← Comment this line to disable IMU completely
#ifdef ENABLE_IMU
  #include <Adafruit_MPU6050.h>
  #include <Adafruit_Sensor.h>
#endif

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include <vector>

// ─────────────────────────────────────────────────────────────────────────────
//  ★  USER CONFIGURATION  — edit this section to match your setup
// ─────────────────────────────────────────────────────────────────────────────

// ── SPI OLED pin mapping ──────────────────────────────────────────────────────
#define OLED_MOSI    23   // SPI Data  (DIN / SDA)
#define OLED_CLK     18   // SPI Clock (CLK / SCL)
#define OLED_DC      2    // Data/Command select
#define OLED_CS       5   // Chip Select
#define OLED_RESET   4    // Reset (-1 if shared with MCU reset)

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64

// ── I2C IMU pin mapping (MPU6050) ─────────────────────────────────────────────
#define IMU_SDA      21   // I2C Data  (default ESP32)
#define IMU_SCL      22   // I2C Clock (default ESP32)

// ── IMU gesture thresholds ────────────────────────────────────────────────────
#define TAP_THRESHOLD       2.5f   // G-force for tap detection
#define SHAKE_THRESHOLD     3.0f   // G-force for shake detection
#define TILT_THRESHOLD      0.7f   // Normalized axis value for 90° tilt
#define FACEDOWN_THRESHOLD -0.8f   // Z-axis value when face down

// ── Wi-Fi soft-AP (captive portal) ───────────────────────────────────────────
#define AP_SSID     "WorkBetter-Setup"
#define AP_PASSWORD ""              // leave blank for open AP (recommended)

// ── Vercel deployment URL (no trailing slash) ─────────────────────────────────
//    Example: "https://workbetter-abc123.vercel.app"
#define VERCEL_HOST "https://esp32-server-eta.vercel.app"

// ── Polling interval: how often the ESP32 checks for new messages ─────────────
#define POLL_INTERVAL_MS   5000UL    // 5 seconds (fast response)

// ── How long a received message stays on screen before reverting to clock ─────
#define MSG_DISPLAY_MS     60000UL   // 60 seconds

// ── IMU checker mode (for debugging/calibration) ──────────────────────────────
#define IMU_CHECKER_MODE   false     // Set to true to show live IMU data on OLED
#define IMU_CHECKER_INTERVAL_MS  100UL  // Update rate for IMU checker display

// ── NTP / timezone ────────────────────────────────────────────────────────────
#define NTP_SERVER_1        "pool.ntp.org"
#define NTP_SERVER_2        "time.nist.gov"
#define GMT_OFFSET_SEC      19800    // IST +5:30 — change for your timezone
#define DAYLIGHT_OFFSET_SEC 0

// ── Timeouts ─────────────────────────────────────────────────────────────────
#define WIFI_CONNECT_TIMEOUT_MS  15000UL
#define WIFI_RETRY_INTERVAL_MS   30000UL
#define NTP_SYNC_TIMEOUT_MS      15000UL
#define NTP_RESYNC_INTERVAL_MS   (6UL * 60UL * 60UL * 1000UL)  // 6 hours

// ─────────────────────────────────────────────────────────────────────────────
//  GLOBALS
// ─────────────────────────────────────────────────────────────────────────────

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &SPI, OLED_DC, OLED_RESET, OLED_CS);

#ifdef ENABLE_IMU
  Adafruit_MPU6050 mpu;
#endif

Preferences       prefs;
WebServer         httpServer(80);
DNSServer         dnsServer;

// ── IMU state ─────────────────────────────────────────────────────────────────
bool    imuAvailable        = false;
uint8_t displayRotation     = 0;        // 0=0°, 1=90°, 2=180°, 3=270°
bool    screenSaverActive   = false;
unsigned long lastTapTime   = 0;
unsigned long lastShakeTime = 0;
int     tapCount            = 0;
unsigned long lastIMUCheckerUpdate = 0;
unsigned long gestureNotifyUntil = 0;
String  gestureNotifyMsg    = "";
// ── State machine ─────────────────────────────────────────────────────────────
enum State { S_BOOT, S_CONNECTING, S_CONNECTED, S_AP_MODE };
State sysState = S_BOOT;
bool  apActive = false;

// ── Timing ────────────────────────────────────────────────────────────────────
unsigned long tLastWifiRetry  = 0;
unsigned long tLastNtpSync    = 0;
unsigned long tLastApOledRefresh = 0;
unsigned long tLastPoll       = 0;
unsigned long tLastScroll     = 0;
unsigned long tLastHeartbeat  = 0;
bool          timeSynced      = false;

// ── Message / display state ───────────────────────────────────────────────────
String              lastMsgId   = "";          // detect changes by id
String              msgText     = "";
String              msgType     = "system";    // "system" | "auto" | "custom"
std::vector<String> lines;                     // word-wrapped lines
int                 scrollIdx   = 0;
const int           MAX_VISIBLE = 4;           // lines visible at once
bool                showMsg     = false;       // false = show clock
unsigned long       msgShownAt  = 0;

// ── Captive-portal state ──────────────────────────────────────────────────────
String apNetworkOptions = "";
int    apNetworkCount   = 0;

// ─────────────────────────────────────────────────────────────────────────────
//  FORWARD DECLARATIONS
// ─────────────────────────────────────────────────────────────────────────────
void setupDisplay();
void setupIMU();
void checkIMUGestures();
void handleDoubleTap();
void handleShake();
void handleTilt();
void handleFaceDown(bool faceDown);

void oledSplash(const String& l1, const String& l2 = "", const String& l3 = "");
void oledClock();
void oledMessage();
void oledGestureNotification(const String& gesture);
void oledIMUChecker();

bool wifiConnectSaved();
void startAP();
String buildApNetworkOptions();

void handleRoot();
void handleScan();
void handleConnect();
void handleReset();
void handleNotFound();

void ntpSync();
void pollServer();
void sendGestureTriggeredMessage(const String& gestureType);

String   cleanText(const String& raw);
void     wrapSegment(const String& seg, int maxCh, std::vector<String>& out);
std::vector<String> wordWrap(const String& text, int maxCh = 20);

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);

  // Initialize I2C for IMU
  Wire.begin(IMU_SDA, IMU_SCL);

  setupDisplay();
  setupIMU();
  
  oledSplash("WorkBetter", "v3.0  Booting...");

  prefs.begin("wb-wifi", false);
  WiFi.mode(WIFI_STA);
  delay(100);

  oledSplash("Connecting Wi-Fi...");

  if (wifiConnectSaved()) {
    sysState = S_CONNECTED;
    oledSplash("Connected!", WiFi.SSID(), WiFi.localIP().toString());

    // Register /reset in STA mode so user can wipe credentials from a browser
    httpServer.on("/reset", HTTP_GET, handleReset);
    httpServer.begin();

    ntpSync();

    // First poll happens immediately so the OLED shows the current message
    // as soon as the device connects (don't wait 30 s for the first tick)
    pollServer();
    tLastPoll = millis();
  } else {
    startAP();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // ── AP mode ─────────────────────────────────────────────────────────────────
  if (apActive) {
    dnsServer.processNextRequest();
    httpServer.handleClient();

    // Refresh OLED every 5 s so the IP is always visible
    if (millis() - tLastApOledRefresh > 5000) {
      oledSplash("Setup Mode", AP_SSID, WiFi.softAPIP().toString());
      tLastApOledRefresh = millis();
    }
    return;
  }

  // ── STA mode ────────────────────────────────────────────────────────────────
  httpServer.handleClient();

  // Check IMU for gestures
  if (imuAvailable && !screenSaverActive) {
    checkIMUGestures();
  }

  // Wi-Fi watchdog — reconnect if connection drops
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - tLastWifiRetry > WIFI_RETRY_INTERVAL_MS) {
      tLastWifiRetry = millis();
      oledSplash("Wi-Fi lost", "Reconnecting...");
      WiFi.reconnect();

      unsigned long t = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - t < WIFI_CONNECT_TIMEOUT_MS) {
        delay(300);
      }

      if (WiFi.status() == WL_CONNECTED) {
        oledSplash("Reconnected!", WiFi.SSID());
        timeSynced = false;
        ntpSync();
      } else {
        oledSplash("Reconnect failed", "Retrying soon...");
      }
    } else {
      oledClock(); // show last-known time while waiting to retry
    }
    return;
  }

  // Periodic NTP resync
  if (!timeSynced || millis() - tLastNtpSync > NTP_RESYNC_INTERVAL_MS) {
    ntpSync();
  }

  // Poll Vercel API for new messages
  if (millis() - tLastPoll >= POLL_INTERVAL_MS) {
    tLastPoll = millis();
    pollServer();
  }

  // ── Display logic ─────────────────────────────────────────────────────────
  if (screenSaverActive) {
    // Screen is off/dimmed when face down
    display.clearDisplay();
    display.display();
    return;
  }

  if (millis() < gestureNotifyUntil) {
    oledGestureNotification(gestureNotifyMsg);
    return;
  }

  // ── IMU Checker Mode ──────────────────────────────────────────────────────
  #ifdef ENABLE_IMU
  if (IMU_CHECKER_MODE && imuAvailable) {
    if (millis() - lastIMUCheckerUpdate >= IMU_CHECKER_INTERVAL_MS) {
      lastIMUCheckerUpdate = millis();
      oledIMUChecker();
    }
    return;  // Skip normal display logic
  }
  #endif

  if (showMsg) {
    // Revert to clock after MSG_DISPLAY_MS milliseconds
    if (millis() - msgShownAt > MSG_DISPLAY_MS) {
      showMsg = false;
    }
    // Auto-scroll long messages every 2 s
    else if ((int)lines.size() > MAX_VISIBLE) {
      if (millis() - tLastScroll >= 2000) {
        tLastScroll = millis();
        scrollIdx++;
        if (scrollIdx > (int)lines.size() - MAX_VISIBLE) scrollIdx = 0;
        oledMessage();
      }
    } else {
      oledMessage();
    }
  } else {
    oledClock();
  }

  // ── Periodic Serial Debug Info (Every 5 Seconds) ────────────────────────
  if (millis() - tLastHeartbeat >= 5000) {
    tLastHeartbeat = millis();
    Serial.print(F("[System Status] WiFi: "));
    Serial.print(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    Serial.print(F(" | IMU: "));
    Serial.println(imuAvailable ? "Detected & Active" : "NOT FOUND / DISABLED");
  }

  delay(200); // gentle pacing — keeps the OLED from flickering
}

// ─────────────────────────────────────────────────────────────────────────────
//  DISPLAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

void setupDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC)) {
    Serial.println(F("[OLED] Init failed — continuing without display"));
    return;
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setRotation(displayRotation);
  display.display();
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMU SETUP & GESTURE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

void setupIMU() {
#ifdef ENABLE_IMU
  Serial.println(F("[IMU] Initializing MPU6050..."));
  
  if (!mpu.begin()) {
    Serial.println(F("[IMU] MPU6050 not found — continuing without IMU"));
    imuAvailable = false;
    return;
  }

  Serial.println(F("[IMU] MPU6050 found!"));
  
  // Configure accelerometer range (±2G, ±4G, ±8G, or ±16G)
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  
  // Configure gyroscope range
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  
  // Configure filter bandwidth
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  
  imuAvailable = true;
  Serial.println(F("[IMU] MPU6050 configured successfully"));
#else
  Serial.println(F("[IMU] IMU support disabled in code (ENABLE_IMU not defined)"));
  imuAvailable = false;
#endif
}

void checkIMUGestures() {
#ifdef ENABLE_IMU
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  
  // Calculate total acceleration magnitude
  float accelMag = sqrt(
    accel.acceleration.x * accel.acceleration.x +
    accel.acceleration.y * accel.acceleration.y +
    accel.acceleration.z * accel.acceleration.z
  );
  
  // Normalize acceleration vector (for orientation detection)
  float accelX = accel.acceleration.x / accelMag;
  float accelY = accel.acceleration.y / accelMag;
  float accelZ = accel.acceleration.z / accelMag;
  
  // ── FACE DOWN DETECTION (screen saver) ───────────────────────────────────
  bool currentlyFaceDown = (accelZ < FACEDOWN_THRESHOLD);
  if (currentlyFaceDown != screenSaverActive) {
    handleFaceDown(currentlyFaceDown);
  }
  
  // Skip other gestures if screen saver is active
  if (screenSaverActive) return;
  
  // ── TAP DETECTION ─────────────────────────────────────────────────────────
  // Look for sudden acceleration spike
  if (accelMag > (9.8f + TAP_THRESHOLD)) {
    unsigned long now = millis();
    
    // Double-tap window: 500ms
    if (now - lastTapTime < 500) {
      tapCount++;
      if (tapCount >= 2) {
        handleDoubleTap();
        tapCount = 0;
      }
    } else {
      tapCount = 1;
    }
    lastTapTime = now;
  }
  
  // ── SHAKE DETECTION ───────────────────────────────────────────────────────
  if (accelMag > (9.8f + SHAKE_THRESHOLD)) {
    unsigned long now = millis();
    // Debounce: minimum 2 seconds between shakes
    if (now - lastShakeTime > 2000) {
      handleShake();
      lastShakeTime = now;
    }
  }
  
  // ── TILT DETECTION (orientation change) ──────────────────────────────────
  // Check if device is tilted significantly on X or Y axis
  static unsigned long lastTiltCheck = 0;
  if (millis() - lastTiltCheck > 1000) {  // Check every second
    lastTiltCheck = millis();
    
    if (abs(accelX) > TILT_THRESHOLD || abs(accelY) > TILT_THRESHOLD) {
      handleTilt();
    }
  }
#endif
}

void handleDoubleTap() {
  Serial.println(F("[IMU] Double-tap detected → Requesting compliment"));
  gestureNotifyMsg = "TAP!";
  gestureNotifyUntil = millis() + 800;
  
  if (WiFi.status() == WL_CONNECTED) {
    sendGestureTriggeredMessage("doubletap");
  }
}

void handleShake() {
  Serial.println(F("[IMU] Shake detected → Toggling features & requesting compliment"));
  gestureNotifyMsg = "SHAKE!";
  gestureNotifyUntil = millis() + 800;
  
  // Option 1: Toggle between message/clock
  showMsg = !showMsg;
  if (showMsg) {
    msgShownAt = millis();
  }
  
  // Option 2: Request new message
  if (WiFi.status() == WL_CONNECTED) {
    sendGestureTriggeredMessage("shake");
  }
}

void handleTilt() {
  // Rotate display 90 degrees clockwise
  displayRotation = (displayRotation + 1) % 4;
  display.setRotation(displayRotation);
  
  Serial.printf("[IMU] Tilt detected → Rotation: %d°\n", displayRotation * 90);
  gestureNotifyMsg = "ROTATE!";
  gestureNotifyUntil = millis() + 500;
}

void handleFaceDown(bool faceDown) {
  screenSaverActive = faceDown;
  
  if (faceDown) {
    Serial.println(F("[IMU] Face down → Screen saver ON"));
    display.clearDisplay();
    display.display();
  } else {
    Serial.println(F("[IMU] Face up → Screen saver OFF"));
    // Force redraw
    if (showMsg) {
      oledMessage();
    } else {
      oledClock();
    }
  }
}

void oledGestureNotification(const String& gesture) {
  display.clearDisplay();
  display.setTextSize(2);
  
  int16_t x = (SCREEN_WIDTH - gesture.length() * 12) / 2;
  int16_t y = (SCREEN_HEIGHT - 16) / 2;
  
  display.setCursor(x, y);
  display.print(gesture);
  display.display();
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMU CHECKER — Live sensor data display for debugging/calibration
// ─────────────────────────────────────────────────────────────────────────────

void oledIMUChecker() {
#ifdef ENABLE_IMU
  if (!imuAvailable) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println(F("IMU Checker Mode"));
    display.println();
    display.println(F("ERROR:"));
    display.println(F("MPU6050 not found!"));
    display.println();
    display.println(F("Check wiring:"));
    display.println(F("SDA=21 SCL=22"));
    display.display();
    return;
  }

  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  
  // Calculate derived values
  float accelMag = sqrt(
    accel.acceleration.x * accel.acceleration.x +
    accel.acceleration.y * accel.acceleration.y +
    accel.acceleration.z * accel.acceleration.z
  );
  
  float accelX = accel.acceleration.x / accelMag;
  float accelY = accel.acceleration.y / accelMag;
  float accelZ = accel.acceleration.z / accelMag;
  
  float gyroMag = sqrt(
    gyro.gyro.x * gyro.gyro.x +
    gyro.gyro.y * gyro.gyro.y +
    gyro.gyro.z * gyro.gyro.z
  );
  
  // Display
  display.clearDisplay();
  display.setTextSize(1);
  
  // Header
  display.setCursor(0, 0);
  display.println(F("=== IMU CHECKER ==="));
  
  // Acceleration (raw)
  display.setCursor(0, 10);
  display.print(F("Acc: "));
  display.print(accel.acceleration.x, 1);
  display.print(F(","));
  display.print(accel.acceleration.y, 1);
  display.print(F(","));
  display.print(accel.acceleration.z, 1);
  
  // Magnitude & normalized Z
  display.setCursor(0, 19);
  display.print(F("Mag: "));
  display.print(accelMag, 1);
  display.print(F("  Nz:"));
  display.print(accelZ, 2);
  
  // Gyroscope
  display.setCursor(0, 28);
  display.print(F("Gyr: "));
  display.print(gyro.gyro.x, 1);
  display.print(F(","));
  display.print(gyro.gyro.y, 1);
  display.print(F(","));
  display.print(gyro.gyro.z, 1);
  
  // Temperature
  display.setCursor(0, 37);
  display.print(F("Temp: "));
  display.print(temp.temperature, 1);
  display.print(F(" C"));
  
  // Gesture indicators
  display.setCursor(0, 46);
  if (accelMag > (9.8f + TAP_THRESHOLD)) {
    display.print(F("[TAP] "));
  }
  if (accelMag > (9.8f + SHAKE_THRESHOLD)) {
    display.print(F("[SHAKE]"));
  }
  
  display.setCursor(0, 55);
  if (accelZ < FACEDOWN_THRESHOLD) {
    display.print(F("[FACE DOWN]"));
  } else if (abs(accelX) > TILT_THRESHOLD || abs(accelY) > TILT_THRESHOLD) {
    display.print(F("[TILT]"));
  }
  
  display.display();
  
  // Also print to serial for data logging
  Serial.printf("[IMU] Acc:(%.2f,%.2f,%.2f) Mag:%.2f Nz:%.2f Gyr:(%.2f,%.2f,%.2f) Temp:%.1fC\n",
    accel.acceleration.x, accel.acceleration.y, accel.acceleration.z,
    accelMag, accelZ,
    gyro.gyro.x, gyro.gyro.y, gyro.gyro.z,
    temp.temperature
  );
#endif
}

void sendGestureTriggeredMessage(const String& gestureType) {
  // This function sends a signal to your API that a gesture occurred
  // You can extend your API to handle gesture-triggered actions
  
  String url = String(VERCEL_HOST) + F("/api/gesture");
  Serial.printf("[Gesture] POST %s (type: %s)\n", url.c_str(), gestureType.c_str());

  WiFiClientSecure tlsClient;
  tlsClient.setInsecure();

  HTTPClient http;
  if (!http.begin(tlsClient, url)) {
    Serial.println(F("[Gesture] http.begin() failed"));
    return;
  }
  
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WorkBetter-ESP32/3.0");

  String payload = "{\"gesture\":\"" + gestureType + "\"}";
  int code = http.POST(payload);
  
  if (code == 200) {
    Serial.println(F("[Gesture] Successfully sent to server"));
    // The server can respond with a new message if needed
    String response = http.getString();
    Serial.printf("[Gesture] Response: %s\n", response.c_str());
  } else {
    Serial.printf("[Gesture] HTTP %d\n", code);
  }
  
  http.end();
}

// Show up to three status lines with a ruled header
void oledSplash(const String& l1, const String& l2, const String& l3) {
  display.clearDisplay();
  display.setTextSize(1);

  // Branded header
  display.setCursor(0, 0);
  display.println(F("WorkBetter v3.0"));
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);

  display.setCursor(0, 18);  display.println(l1);
  if (l2.length()) { display.setCursor(0, 30); display.println(l2); }
  if (l3.length()) { display.setCursor(0, 44); display.println(l3); }

  display.display();
}

// Full-screen clock (SSID top-left, big HH:MM:SS, date bottom)
void oledClock() {
  struct tm ti;
  display.clearDisplay();

  if (!getLocalTime(&ti, 100)) {
    // No time yet — show a "waiting" indicator
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println(WiFi.status() == WL_CONNECTED ? WiFi.SSID() : F("Offline"));
    display.setCursor(0, 24);
    display.println(F("Syncing time..."));
    display.display();
    return;
  }

  char hms[9], dmy[11];
  strftime(hms, sizeof(hms), "%H:%M:%S",   &ti);
  strftime(dmy, sizeof(dmy), "%d-%m-%Y",   &ti);

  // Row 0 — SSID (small)
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(WiFi.status() == WL_CONNECTED ? WiFi.SSID() : F("Offline"));

  // Row 1 — Time (large)
  display.setTextSize(2);
  display.setCursor(10, 18);
  display.println(hms);

  // Row 2 — Date (small)
  display.setTextSize(1);
  display.setCursor(22, 50);
  display.println(dmy);

  display.display();
}

// Message display: labelled header + centred word-wrapped body + footer rule
void oledMessage() {
  display.clearDisplay();
  display.setTextSize(1);

  // ── Header label ─────────────────────────────────────────────
  const char* label =
    (msgType == "auto")   ? "=== COMPLIMENT ===" :
    (msgType == "custom") ? "===  MESSAGE   ===" :
                             "===   NOTICE   ===";
  display.setCursor(0, 0);
  display.print(label);
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);

  // ── Body ─────────────────────────────────────────────────────
  const int yStart     = 12;
  const int lineH      = 10;
  const int bodyPixels = 40;   // pixels between ruler and footer rule
  int totalLines       = lines.size();

  if (totalLines <= MAX_VISIBLE) {
    // Centre the text block vertically within the body area
    int blockH    = totalLines * lineH;
    int topOffset = (bodyPixels - blockH) / 2;

    for (int i = 0; i < totalLines; i++) {
      const String& ln = lines[i];
      int xOff = max(0, (SCREEN_WIDTH - (int)ln.length() * 6) / 2);
      display.setCursor(xOff, yStart + topOffset + i * lineH);
      display.print(ln);
    }
  } else {
    // Scrolling window — MAX_VISIBLE lines visible at a time
    for (int i = 0; i < MAX_VISIBLE; i++) {
      int idx = scrollIdx + i;
      if (idx >= totalLines) break;
      const String& ln = lines[idx];
      int xOff = max(0, (SCREEN_WIDTH - (int)ln.length() * 6) / 2);
      display.setCursor(xOff, yStart + 2 + i * lineH);
      display.print(ln);
    }
  }

  // ── Footer ───────────────────────────────────────────────────
  display.drawLine(0, 53, SCREEN_WIDTH - 1, 53, SSD1306_WHITE);
  display.setCursor(28, 56);
  display.print(F("Stay awesome!"));

  display.display();
}

// ─────────────────────────────────────────────────────────────────────────────
//  VERCEL API POLLING
// ─────────────────────────────────────────────────────────────────────────────

/*
 * GET /api/esp32-ping
 *
 * This single HTTPS request does two things:
 *   1. Tells the server the ESP32 is alive (heartbeat key stored in Redis).
 *   2. Returns the current message so we can detect changes by comparing ids.
 *
 * Response JSON:
 *   { "id": "…", "text": "…", "type": "auto|custom|system", "timestamp": "…" }
 *
 * NOTE: setInsecure() skips TLS certificate verification.
 * For a production deployment, pin the Vercel/Let's Encrypt root CA instead.
 */
void pollServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(VERCEL_HOST) + F("/api/esp32-ping");
  Serial.printf("[Poll] GET %s\n", url.c_str());

  WiFiClientSecure tlsClient;
  tlsClient.setInsecure();

  HTTPClient http;
  if (!http.begin(tlsClient, url)) {
    Serial.println(F("[Poll] http.begin() failed"));
    return;
  }
  http.setTimeout(10000);
  http.addHeader("User-Agent", "WorkBetter-ESP32/2.0");

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[Poll] HTTP %d — skipping\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();
  Serial.printf("[Poll] Payload: %s\n", payload.c_str());

  // ── Parse JSON ───────────────────────────────────────────────
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload)) {
    Serial.println(F("[Poll] JSON parse error"));
    return;
  }

  const char* id   = doc["id"]   | "";
  const char* text = doc["text"] | "";
  const char* type = doc["type"] | "custom";

  // Only refresh the display when the message has actually changed
  if (strlen(id) == 0 || String(id) == lastMsgId || strlen(text) == 0) return;

  lastMsgId = String(id);
  msgType   = String(type);
  msgText   = String(text);

  String cleaned = cleanText(msgText);
  lines     = wordWrap(cleaned, 20);
  scrollIdx = 0;
  showMsg   = true;
  msgShownAt = tLastScroll = millis();

  Serial.printf("[OLED] Displaying: \"%s\"\n", cleaned.c_str());
  oledMessage();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEXT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Replace common multi-byte emoji sequences with compact ASCII equivalents,
 * then strip any remaining non-printable bytes.
 * This prevents garbled rectangles appearing on the OLED font renderer.
 */
String cleanText(const String& raw) {
  String s = raw;

  // Common emoji → ASCII
  s.replace("\xe2\x9d\xa4\xef\xb8\x8f", "<3");   // ❤️
  s.replace("\xf0\x9f\x98\x8a",         ":)");   // 😊
  s.replace("\xf0\x9f\x8c\x9f",         "*");    // 🌟
  s.replace("\xf0\x9f\x9a\x80",         "^^");   // 🚀
  s.replace("\xe2\x9c\xa8",             "*");    // ✨
  s.replace("\xf0\x9f\x94\xa5",         "!");    // 🔥
  s.replace("\xf0\x9f\x8e\x89",         ":D");   // 🎉
  s.replace("\xf0\x9f\x92\xaa",         "!");    // 💪
  s.replace("\xf0\x9f\x91\x8d",         "(y)");  // 👍
  s.replace("\xf0\x9f\x92\xa1",         "(i)");  // 💡
  s.replace("\xf0\x9f\x98\x8d",         ":D");   // 😍
  s.replace("\xf0\x9f\x99\x8c",         "/\\");  // 🙌
  s.replace("\xf0\x9f\x8f\x86",         "[#1]"); // 🏆

  // Strip anything outside printable ASCII and newline
  String out;
  out.reserve(s.length());
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    if (c == '\n' || (c >= ' ' && c <= '~')) out += c;
  }
  return out;
}

/*
 * Word-wrap a single line segment into runs of at most maxCh characters,
 * breaking only at word boundaries.
 */
void wrapSegment(const String& seg, int maxCh, std::vector<String>& out) {
  if (seg.length() == 0) { out.push_back(""); return; }

  String curLine, word;

  auto flush = [&]() {
    if (curLine.length() == 0) {
      curLine = word;
    } else if ((int)(curLine.length() + 1 + word.length()) <= maxCh) {
      curLine += ' '; curLine += word;
    } else {
      out.push_back(curLine);
      curLine = word;
    }
    word = "";
  };

  for (unsigned int i = 0; i < seg.length(); i++) {
    char c = seg.charAt(i);
    if (c == ' ') { if (word.length()) flush(); }
    else            word += c;
  }
  if (word.length()) flush();
  if (curLine.length()) out.push_back(curLine);
}

/*
 * Splits text on '\n' then word-wraps each segment.
 */
std::vector<String> wordWrap(const String& text, int maxCh) {
  std::vector<String> result;
  int start = 0, end;

  while ((end = text.indexOf('\n', start)) != -1) {
    wrapSegment(text.substring(start, end), maxCh, result);
    start = end + 1;
  }
  if (start < (int)text.length())
    wrapSegment(text.substring(start), maxCh, result);
  else if (text.endsWith("\n"))
    result.push_back("");

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WI-FI: STA CONNECT
// ─────────────────────────────────────────────────────────────────────────────

bool wifiConnectSaved() {
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");

  if (ssid.length() == 0) {
    Serial.println(F("[Wi-Fi] No saved credentials"));
    return false;
  }

  Serial.printf("[Wi-Fi] Connecting to \"%s\"...\n", ssid.c_str());
  oledSplash("Connecting to", ssid);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[Wi-Fi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println(F("[Wi-Fi] Failed to connect"));
  WiFi.disconnect(true);
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  WI-FI: SOFT-AP + CAPTIVE PORTAL
// ─────────────────────────────────────────────────────────────────────────────

void startAP() {
  apActive  = true;
  sysState  = S_AP_MODE;

  WiFi.mode(WIFI_AP);
  bool ok = (strlen(AP_PASSWORD) >= 8)
    ? WiFi.softAP(AP_SSID, AP_PASSWORD)
    : WiFi.softAP(AP_SSID);

  IPAddress ip = WiFi.softAPIP();
  Serial.printf("[AP] SSID: %s  IP: %s  ok=%d\n", AP_SSID, ip.toString().c_str(), ok);

  // Redirect every DNS query to our IP so phones auto-open the captive portal
  dnsServer.start(53, "*", ip);

  // Pre-scan so the first page load is instant
  apNetworkOptions = buildApNetworkOptions();

  httpServer.on("/",        HTTP_GET,  handleRoot);
  httpServer.on("/scan",    HTTP_GET,  handleScan);
  httpServer.on("/connect", HTTP_POST, handleConnect);
  httpServer.on("/reset",   HTTP_GET,  handleReset);
  httpServer.onNotFound(handleNotFound);
  httpServer.begin();

  oledSplash("Setup Mode", AP_SSID, ip.toString());
}

String buildApNetworkOptions() {
  Serial.println(F("[Scan] Scanning Wi-Fi networks..."));
  int n = WiFi.scanNetworks();
  apNetworkCount = n;
  if (n <= 0) return F("<option value=''>No networks found — tap Rescan</option>");

  // De-duplicate SSIDs, keep the strongest RSSI per SSID
  struct Net { String ssid; int rssi; bool secure; };
  const int MAX_NETS = 64;
  Net nets[MAX_NETS];
  int count = 0;

  for (int i = 0; i < n && count < MAX_NETS; i++) {
    String s = WiFi.SSID(i);
    if (s.length() == 0) continue;

    bool found = false;
    for (int j = 0; j < count; j++) {
      if (nets[j].ssid == s) {
        if (WiFi.RSSI(i) > nets[j].rssi) nets[j].rssi = WiFi.RSSI(i);
        found = true; break;
      }
    }
    if (!found) {
      nets[count++] = { s, WiFi.RSSI(i), WiFi.encryptionType(i) != WIFI_AUTH_OPEN };
    }
  }

  // Sort: strongest signal first (simple bubble sort — small N)
  for (int i = 0; i < count - 1; i++)
    for (int j = i + 1; j < count; j++)
      if (nets[j].rssi > nets[i].rssi) { Net tmp = nets[i]; nets[i] = nets[j]; nets[j] = tmp; }

  String html;
  for (int i = 0; i < count; i++) {
    html += "<option value='" + nets[i].ssid + "'>"
          + nets[i].ssid
          + " (" + String(nets[i].rssi) + " dBm)"
          + (nets[i].secure ? " \xf0\x9f\x94\x92" : " \xe2\x9c\x93")
          + "</option>";
  }

  WiFi.scanDelete();
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP HANDLERS  (captive portal + /reset)
// ─────────────────────────────────────────────────────────────────────────────

static const char HTML_STYLE[] PROGMEM =
  "<style>"
  "body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#e8e8e8;"
        "display:flex;justify-content:center;padding:24px;margin:0}"
  ".card{background:#1c1c1c;border:1px solid #333;border-radius:14px;"
         "padding:28px;width:100%;max-width:400px;box-shadow:0 4px 24px #0008}"
  "h2{margin:0 0 20px;color:#38bdf8;font-size:1.25rem}"
  "label{display:block;font-size:.8rem;color:#888;margin-bottom:4px;margin-top:12px}"
  "select,input{width:100%;padding:10px 12px;border:1px solid #333;"
               "border-radius:8px;background:#272727;color:#e8e8e8;"
               "font-size:1rem;box-sizing:border-box}"
  ".btn{display:block;width:100%;margin-top:18px;padding:12px;border:none;"
        "border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer}"
  ".btn-primary{background:#38bdf8;color:#000}"
  ".btn-secondary{background:#2a2a2a;color:#aaa;border:1px solid #444;margin-top:10px}"
  ".footer{margin-top:18px;font-size:.78rem;color:#555;text-align:center}"
  "a{color:#38bdf8}"
  "</style>";

void handleRoot() {
  String html = F("<!DOCTYPE html><html lang='en'><head>"
    "<meta charset='UTF-8'>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>WorkBetter Setup</title>");
  html += FPSTR(HTML_STYLE);
  html += F("</head><body><div class='card'>"
    "<h2>\xf0\x9f\x93\xb6 WorkBetter Setup</h2>"
    "<form action='/connect' method='POST'>"
    "<label>Select your Wi-Fi network</label>"
    "<select name='ssid'>");
  html += apNetworkOptions;
  html += F("</select>"
    "<label>Password</label>"
    "<input type='password' name='password' placeholder='Leave blank if open network'>"
    "<button class='btn btn-primary' type='submit'>Save &amp; Connect</button>"
    "</form>"
    "<button class='btn btn-secondary' onclick=\"location='/scan'\">&#8635; Rescan networks</button>"
    "<p class='footer'>Found ");
  html += apNetworkCount;
  html += F(" network(s) &nbsp;&middot;&nbsp; <a href='/reset'>Erase saved credentials</a></p>"
    "</div></body></html>");

  httpServer.send(200, F("text/html"), html);
}

void handleScan() {
  apNetworkOptions = buildApNetworkOptions();
  httpServer.sendHeader("Location", "/");
  httpServer.send(303);
}

void handleConnect() {
  if (!httpServer.hasArg("ssid") || httpServer.arg("ssid").length() == 0) {
    httpServer.send(400, "text/plain", "No SSID provided");
    return;
  }

  String ssid = httpServer.arg("ssid");
  String pass = httpServer.hasArg("password") ? httpServer.arg("password") : "";

  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);

  String html = F("<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>");
  html += FPSTR(HTML_STYLE);
  html += F("</head><body><div class='card'>"
    "<h2>\xe2\x9c\x85 Saved!</h2><p>Restarting and connecting to <b>");
  html += ssid;
  html += F("</b>&hellip;</p></div></body></html>");

  httpServer.send(200, "text/html", html);
  oledSplash("Saved!", ssid, "Restarting...");
  delay(1500);
  ESP.restart();
}

void handleReset() {
  prefs.remove("ssid");
  prefs.remove("pass");

  String html = F("<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>");
  html += FPSTR(HTML_STYLE);
  html += F("</head><body><div class='card'>"
    "<h2>\xf0\x9f\x97\x91 Credentials erased</h2>"
    "<p>Restarting into setup mode&hellip;</p>"
    "</div></body></html>");

  httpServer.send(200, "text/html", html);
  oledSplash("Credentials erased", "Restarting...");
  delay(1500);
  ESP.restart();
}

void handleNotFound() {
  // Captive-portal redirect — any unknown URL → setup page
  httpServer.sendHeader("Location",
    "http://" + WiFi.softAPIP().toString() + "/", true);
  httpServer.send(302, "text/plain", "");
}

// ─────────────────────────────────────────────────────────────────────────────
//  NTP SYNC
// ─────────────────────────────────────────────────────────────────────────────

void ntpSync() {
  if (WiFi.status() != WL_CONNECTED) return;

  oledSplash("Syncing time...", "via NTP");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

  struct tm ti;
  unsigned long t = millis();
  bool ok = false;
  while (millis() - t < NTP_SYNC_TIMEOUT_MS) {
    if (getLocalTime(&ti, 500)) { ok = true; break; }
  }

  if (ok) {
    timeSynced  = true;
    tLastNtpSync = millis();
    char buf[32];
    strftime(buf, sizeof(buf), "%H:%M:%S  %d-%m-%Y", &ti);
    Serial.printf("[NTP] Synced: %s\n", buf);
    oledSplash("Time synced", buf);
  } else {
    Serial.println(F("[NTP] Sync timed out — will retry"));
    oledSplash("NTP failed", "Will retry soon");
  }
  delay(800);
}
