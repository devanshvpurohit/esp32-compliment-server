/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║         WorkBetter ESP32 — Vercel Edition  v2.0                 ║
 ║                                                                  ║
 ║  Features:                                                       ║
 ║   • SPI SSD1306 OLED (128×64) — live clock + compliments        ║
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
 ║                                                                  ║
 ║  Libraries (install via Arduino IDE → Library Manager):         ║
 ║   • Adafruit SSD1306                                            ║
 ║   • Adafruit GFX Library                                        ║
 ║   • ArduinoJson  (by Benoit Blanchon)                           ║
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
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
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
#define OLED_DC      16   // Data/Command select
#define OLED_CS       5   // Chip Select
#define OLED_RESET   17   // Reset (-1 if shared with MCU reset)

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64

// ── Wi-Fi soft-AP (captive portal) ───────────────────────────────────────────
#define AP_SSID     "WorkBetter-Setup"
#define AP_PASSWORD ""              // leave blank for open AP (recommended)

// ── Vercel deployment URL (no trailing slash) ─────────────────────────────────
//    Example: "https://workbetter-abc123.vercel.app"
#define VERCEL_HOST "https://your-app.vercel.app"

// ── Polling interval: how often the ESP32 checks for new messages ─────────────
#define POLL_INTERVAL_MS   30000UL   // 30 seconds  (lower = more responsive)

// ── How long a received message stays on screen before reverting to clock ─────
#define MSG_DISPLAY_MS     60000UL   // 60 seconds

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
Preferences       prefs;
WebServer         httpServer(80);
DNSServer         dnsServer;

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
void oledSplash(const String& l1, const String& l2 = "", const String& l3 = "");
void oledClock();
void oledMessage();

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

String   cleanText(const String& raw);
void     wrapSegment(const String& seg, int maxCh, std::vector<String>& out);
std::vector<String> wordWrap(const String& text, int maxCh = 20);

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);

  setupDisplay();
  oledSplash("WorkBetter", "v2.0  Booting...");

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
      return; // skip the delay below; scrolling drives the refresh cadence
    } else {
      oledMessage();
    }
  } else {
    oledClock();
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
  display.display();
}

// Show up to three status lines with a ruled header
void oledSplash(const String& l1, const String& l2, const String& l3) {
  display.clearDisplay();
  display.setTextSize(1);

  // Branded header
  display.setCursor(0, 0);
  display.println(F("WorkBetter v2.0"));
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
