/**
 * Vercel Serverless Function - Main Dashboard with Beautiful UI/UX
 */

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ESP32 Message Center 💌</title>
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .container { 
          background: white;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.25);
          max-width: 650px;
          width: 100%;
          animation: slideUp 0.5s ease-out;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
          text-align: center;
          margin-bottom: 35px;
        }
        
        h1 { 
          color: #333;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .emoji { font-size: 36px; }
        
        .subtitle {
          color: #666;
          font-size: 15px;
          font-weight: 400;
        }
        
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .tab {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #666;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .tab:hover {
          color: #667eea;
        }
        
        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }
        
        .tab-content {
          display: none;
          animation: fadeIn 0.3s ease-in;
        }
        
        .tab-content.active {
          display: block;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .card {
          background: #f8f9fb;
          padding: 25px;
          border-radius: 16px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          color: #333;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        input, textarea, select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.3s;
          background: white;
        }
        
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        textarea {
          resize: vertical;
          min-height: 100px;
          font-family: inherit;
        }
        
        .char-count {
          text-align: right;
          color: #999;
          font-size: 13px;
          margin-top: 5px;
        }
        
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .btn-primary:active {
          transform: translateY(0);
        }
        
        .btn-secondary {
          background: #f0f0f0;
          color: #666;
        }
        
        .btn-secondary:hover {
          background: #e0e0e0;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .quick-messages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .quick-msg {
          padding: 12px;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
        }
        
        .quick-msg:hover {
          border-color: #667eea;
          background: #f8f9fb;
          transform: translateY(-2px);
        }
        
        .result {
          margin-top: 20px;
          padding: 16px;
          border-radius: 12px;
          font-size: 14px;
          display: none;
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .result.success {
          background: #d4edda;
          color: #155724;
          border: 2px solid #c3e6cb;
        }
        
        .result.error {
          background: #f8d7da;
          color: #721c24;
          border: 2px solid #f5c6cb;
        }
        
        .result.info {
          background: #d1ecf1;
          color: #0c5460;
          border: 2px solid #bee5eb;
        }
        
        .compliment-preview {
          background: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          color: #667eea;
          margin-top: 15px;
          border: 2px dashed #667eea;
        }
        
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 20px;
        }
        
        .stat {
          background: white;
          padding: 15px;
          border-radius: 12px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
          display: block;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #f0f0f0;
          color: #999;
          font-size: 13px;
        }
        
        @media (max-width: 600px) {
          .container { 
            padding: 25px; 
          }
          h1 { 
            font-size: 24px; 
          }
          .stats {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1><span class="emoji">💌</span> ESP32 Message Center</h1>
          <p class="subtitle">Send personalized messages to your ESP32 display</p>
        </div>

        <div class="tabs">
          <button class="tab active" onclick="switchTab('send')">✉️ Send Message</button>
          <button class="tab" onclick="switchTab('sms')">📱 Text/SMS</button>
          <button class="tab" onclick="switchTab('random')">🎲 Random</button>
          <button class="tab" onclick="switchTab('about')">ℹ️ About</button>
        </div>

        <!-- Send Custom Message Tab -->
        <div id="tab-send" class="tab-content active">
          <div class="card">
            <div class="form-group">
              <label>Quick Messages</label>
              <div class="quick-messages">
                <div class="quick-msg" onclick="setMessage('You are amazing! ⭐')">You are amazing! ⭐</div>
                <div class="quick-msg" onclick="setMessage('Keep going! 💪')">Keep going! 💪</div>
                <div class="quick-msg" onclick="setMessage('Great job! 🎉')">Great job! 🎉</div>
                <div class="quick-msg" onclick="setMessage('Stay positive! ☀️')">Stay positive! ☀️</div>
                <div class="quick-msg" onclick="setMessage('You rock! 🎸')">You rock! 🎸</div>
                <div class="quick-msg" onclick="setMessage('Believe in yourself! 🌟')">Believe! 🌟</div>
              </div>
            </div>

            <div class="form-group">
              <label>Custom Message</label>
              <textarea 
                id="customMessage" 
                placeholder="Type your personal message here..." 
                maxlength="200"
                oninput="updateCharCount()"
              ></textarea>
              <div class="char-count"><span id="charCount">0</span>/200</div>
            </div>

            <button class="btn btn-primary" onclick="sendMessage()">
              <span>📤</span> Send to ESP32
            </button>

            <div id="sendResult" class="result"></div>
          </div>
        </div>

        <!-- Text/SMS Message Tab -->
        <div id="tab-sms" class="tab-content">
          <div class="card">
            <div class="form-group">
              <label>From (Optional)</label>
              <input 
                type="text" 
                id="senderName" 
                placeholder="Your name or phone number"
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label>Text Message</label>
              <textarea 
                id="textMessage" 
                placeholder="Type your text message here...&#10;&#10;💡 Tip: This endpoint works with SMS webhooks from Twilio, Vonage, etc." 
                maxlength="300"
                oninput="updateTextCharCount()"
              ></textarea>
              <div class="char-count"><span id="textCharCount">0</span>/300</div>
            </div>

            <button class="btn btn-primary" onclick="sendTextMessage()">
              <span>📱</span> Send Text to ESP32
            </button>

            <div id="textResult" class="result"></div>
          </div>

          <div class="card" style="margin-top: 20px; background: #f0f9ff; border-left: 4px solid #007bff;">
            <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">📞 SMS Integration</h4>
            <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0 0 10px 0;">
              You can send messages to your ESP32 via SMS using services like Twilio or Vonage.
            </p>
            <div style="background: white; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-top: 10px;">
              <div style="color: #666; margin-bottom: 5px;">Webhook URL:</div>
              <div id="webhookUrl" style="color: #007bff; word-break: break-all; font-weight: bold;">
                Loading...
              </div>
              <button onclick="copyWebhookUrl()" style="margin-top: 10px; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: inherit;">
                📋 Copy Webhook URL
              </button>
            </div>
          </div>
        </div>

        <!-- Random Compliment Tab -->
        <div id="tab-random" class="tab-content">
          <div class="card">
            <div class="form-group">
              <label>Get Random Compliment</label>
              <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                Preview a random compliment or send it directly to your ESP32
              </p>
              <button class="btn btn-secondary" onclick="getRandomCompliment()" style="margin-bottom: 10px;">
                🎲 Get Random Compliment
              </button>
              <div id="complimentPreview"></div>
            </div>

            <button class="btn btn-primary" onclick="sendRandomCompliment()">
              <span>📤</span> Send Random to ESP32
            </button>

            <div id="randomResult" class="result"></div>
          </div>
        </div>

        <!-- About Tab -->
        <div id="tab-about" class="tab-content">
          <div class="card" style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border: 2px solid #667eea;">
            <h3 style="margin-bottom: 15px; color: #333;">🔗 ESP32 Connection URL</h3>
            <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Use this URL in your ESP32 code:</div>
              <div id="apiUrl" style="font-family: monospace; font-size: 14px; color: #667eea; font-weight: bold; word-break: break-all;">
                Loading...
              </div>
              <button onclick="copyToClipboard()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; width: auto;">
                📋 Copy URL
              </button>
            </div>
            
            <h4 style="margin: 20px 0 10px 0; color: #333; font-size: 14px;">📝 ESP32 Code Snippet:</h4>
            <div style="background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 12px; overflow-x: auto; position: relative;">
              <button onclick="copyCode()" style="position: absolute; top: 10px; right: 10px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">Copy</button>
              <pre id="codeSnippet" style="margin: 0; white-space: pre; line-height: 1.5;">const char* API_URL = "LOADING...";

void fetchCompliment() {
  HTTPClient http;
  http.begin(API_URL);
  int code = http.GET();
  
  if (code == 200) {
    String json = http.getString();
    // Parse and display
  }
  http.end();
}</pre>
            </div>
          </div>

          <div class="card">
            <h3 style="margin-bottom: 15px; color: #333;">📡 How It Works</h3>
            <p style="color: #666; margin-bottom: 15px; line-height: 1.6;">
              This web app sends messages directly to your ESP32 clock display via HTTP. 
              Your ESP32 can also pull messages from this server every 10 minutes.
            </p>

            <h3 style="margin-bottom: 15px; margin-top: 25px; color: #333;">🔧 Two-Way Setup</h3>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; border-left: 4px solid #667eea; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">✅ Option 1: ESP32 Pulls (Recommended)</h4>
              <p style="color: #666; margin: 0; font-size: 13px; line-height: 1.6;">
                Your ESP32 fetches messages from this server every 10 minutes. No port forwarding needed!
                Use the URL shown above in your ESP32 code.
              </p>
            </div>

            <div style="background: #fff4e6; padding: 15px; border-radius: 10px; border-left: 4px solid #ff9800; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">⚙️ Option 2: Server Pushes to ESP32</h4>
              <p style="color: #666; margin: 0; font-size: 13px; line-height: 1.6;">
                This server sends messages to your ESP32. Requires setting <code style="background: white; padding: 2px 6px; border-radius: 4px;">ESP32_IP</code> in Vercel settings and port forwarding.
              </p>
            </div>

            <h3 style="margin-bottom: 15px; margin-top: 25px; color: #333;">🌐 API Endpoints</h3>
            <div style="background: white; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 13px;">
              <div style="margin-bottom: 10px;">
                <span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">GET</span>
                <span style="margin-left: 10px; color: #667eea;">/api/compliment</span>
                <div style="font-size: 11px; color: #666; margin-left: 60px; margin-top: 3px;">Get random compliment JSON</div>
              </div>
              <div>
                <span style="background: #007bff; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">POST</span>
                <span style="margin-left: 10px; color: #667eea;">/api/send</span>
                <div style="font-size: 11px; color: #666; margin-left: 60px; margin-top: 3px;">Send message to ESP32</div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top: 20px;">
            <h3 style="margin-bottom: 15px; color: #333;">⏰ Automatic Delivery</h3>
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              Vercel free tier: Daily compliment at 9 AM
            </p>
            <p style="color: #666; line-height: 1.6; font-size: 13px;">
              💡 For messages every 10 minutes, use ESP32 pulling method (see URL above).
              Check <a href="https://github.com/devanshvpurohit/esp32-compliment-server/blob/main/FREE_TIER_SOLUTIONS.md" target="_blank" style="color: #667eea;">FREE_TIER_SOLUTIONS.md</a> for more options.
            </p>
          </div>
        </div>

        <div class="footer">
          Powered by Vercel Serverless Functions ⚡
        </div>
      </div>

      <script>
        let currentCompliment = '';
        let apiBaseUrl = '';

        // Get the current URL and set API base URL
        window.addEventListener('DOMContentLoaded', function() {
          apiBaseUrl = window.location.origin;
          const apiUrl = apiBaseUrl + '/api/compliment';
          const webhookUrl = apiBaseUrl + '/api/message';
          
          // Update the API URL display
          document.getElementById('apiUrl').textContent = apiUrl;
          document.getElementById('webhookUrl').textContent = webhookUrl;
          
          // Update the code snippet
          const codeSnippet = `const char* API_URL = "${apiUrl}";

void fetchCompliment() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(API_URL);
  int code = http.GET();
  
  if (code == 200) {
    String json = http.getString();
    
    // Parse JSON
    StaticJsonDocument<512> doc;
    deserializeJson(doc, json);
    const char* msg = doc["compliment"];
    
    if (msg) {
      displayCompliment(String(msg));
    }
  }
  http.end();
}`;
          
          document.getElementById('codeSnippet').textContent = codeSnippet;
        });

        function copyToClipboard() {
          const url = document.getElementById('apiUrl').textContent;
          navigator.clipboard.writeText(url).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = '#667eea';
            }, 2000);
          }).catch(() => {
            alert('Failed to copy. Please copy manually: ' + url);
          });
        }

        function copyWebhookUrl() {
          const url = document.getElementById('webhookUrl').textContent;
          navigator.clipboard.writeText(url).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = '#007bff';
            }, 2000);
          }).catch(() => {
            alert('Failed to copy. Please copy manually: ' + url);
          });
        }

        function copyCode() {
          const code = document.getElementById('codeSnippet').textContent;
          navigator.clipboard.writeText(code).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = '#28a745';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = '#667eea';
            }, 2000);
          }).catch(() => {
            alert('Failed to copy code to clipboard');
          });
        }

        function switchTab(tabName) {
          // Update tab buttons
          document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
          });
          event.target.classList.add('active');

          // Update tab content
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          document.getElementById('tab-' + tabName).classList.add('active');
        }

        function setMessage(message) {
          document.getElementById('customMessage').value = message;
          updateCharCount();
        }

        function updateCharCount() {
          const textarea = document.getElementById('customMessage');
          const count = textarea.value.length;
          document.getElementById('charCount').textContent = count;
        }

        function updateTextCharCount() {
          const textarea = document.getElementById('textMessage');
          const count = textarea.value.length;
          document.getElementById('textCharCount').textContent = count;
        }

        function showResult(elementId, message, type) {
          const result = document.getElementById(elementId);
          result.textContent = message;
          result.className = 'result ' + type;
          result.style.display = 'block';
          
          setTimeout(() => {
            result.style.display = 'none';
          }, 5000);
        }

        async function sendMessage() {
          const message = document.getElementById('customMessage').value.trim();
          
          if (!message) {
            showResult('sendResult', '⚠️ Please enter a message', 'error');
            return;
          }

          const btn = event.target;
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner"></div> Sending...';

          try {
            const response = await fetch('/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (data.success) {
              showResult('sendResult', '✅ Message sent successfully!', 'success');
              document.getElementById('customMessage').value = '';
              updateCharCount();
            } else {
              showResult('sendResult', '❌ Failed: ' + data.error, 'error');
            }
          } catch (error) {
            showResult('sendResult', '❌ Error: ' + error.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>📤</span> Send to ESP32';
          }
        }

        async function sendTextMessage() {
          const message = document.getElementById('textMessage').value.trim();
          const sender = document.getElementById('senderName').value.trim();
          
          if (!message) {
            showResult('textResult', '⚠️ Please enter a message', 'error');
            return;
          }

          const btn = event.target;
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner"></div> Sending...';

          try {
            const payload = { message };
            if (sender) {
              payload.sender = sender;
            }

            const response = await fetch('/api/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
              showResult('textResult', '✅ Text message sent successfully!', 'success');
              document.getElementById('textMessage').value = '';
              updateTextCharCount();
            } else {
              showResult('textResult', '❌ Failed: ' + data.error, 'error');
            }
          } catch (error) {
            showResult('textResult', '❌ Error: ' + error.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>📱</span> Send Text to ESP32';
          }
        }

        async function getRandomCompliment() {
          const btn = event.target;
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner"></div> Loading...';

          try {
            const response = await fetch('/api/compliment');
            const data = await response.json();
            
            currentCompliment = data.compliment;
            
            const preview = document.getElementById('complimentPreview');
            preview.innerHTML = '<div class="compliment-preview">' + currentCompliment + '</div>';
          } catch (error) {
            showResult('randomResult', '❌ Error: ' + error.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '🎲 Get Random Compliment';
          }
        }

        async function sendRandomCompliment() {
          const btn = event.target;
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner"></div> Sending...';

          try {
            const response = await fetch('/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
              showResult('randomResult', '✅ Compliment sent: "' + data.compliment + '"', 'success');
            } else {
              showResult('randomResult', '❌ Failed: ' + data.error, 'error');
            }
          } catch (error) {
            showResult('randomResult', '❌ Error: ' + error.message, 'error');
          } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>📤</span> Send Random to ESP32';
          }
        }
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};
