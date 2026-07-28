#!/usr/bin/env node
/**
 * Compliment Server for ESP32 Clock
 * Sends random compliments to the ESP32 display every 10 minutes
 */

const http = require('http');
const https = require('https');

// ===================== CONFIGURATION =====================

const CONFIG = {
  // Server settings
  SERVER_PORT: 3000,
  
  // ESP32 settings
  ESP32_IP: '192.168.4.1',  // Change to your ESP32's IP address
  ESP32_PORT: 80,
  
  // Timing
  COMPLIMENT_INTERVAL: 10 * 60 * 1000,  // 10 minutes in milliseconds
  
  // Optional: Use external API for compliments
  USE_EXTERNAL_API: false,
  EXTERNAL_API_URL: 'https://your-vercel-app.vercel.app/api/compliment'
};

// ===================== COMPLIMENTS =====================

const COMPLIMENTS = [
  "You're doing great!",
  "Your code is awesome!",
  "Keep up the good work!",
  "You're a star!",
  "Believe in yourself!",
  "You're amazing!",
  "You light up the room!",
  "Your smile is contagious!",
  "You're one of a kind!",
  "You're making a difference!",
  "You're inspiring!",
  "You're a genius!",
  "You're unstoppable!",
  "You're brilliant!",
  "You rock!",
  "You're fantastic!",
  "You're wonderful!",
  "You're incredible!",
  "You're spectacular!",
  "You're phenomenal!",
  "Stay positive!",
  "You've got this!",
  "You're a champion!",
  "You're exceptional!",
  "You're magnificent!",
  "You're outstanding!",
  "You're remarkable!",
  "You're superb!",
  "You're terrific!",
  "You're fabulous!",
  "Dream big!",
  "Shine bright!",
  "Be awesome today!",
  "You're creative!",
  "You're talented!",
  "You're unique!",
  "You're valued!",
  "You're appreciated!",
  "You're capable!",
  "You're strong!",
  "Today is your day!",
  "Keep shining!",
  "You inspire others!",
  "You're limitless!",
  "You're a rockstar!",
  "Magic happens!",
  "You're unstoppable!",
  "Believe & achieve!",
  "You're incredible!",
  "Success is yours!"
];

// ===================== UTILITY FUNCTIONS =====================

/**
 * Get current timestamp formatted as HH:MM:SS
 */
function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * Get a random compliment from the list
 */
function getRandomCompliment() {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

/**
 * Fetch compliment from external API
 */
function fetchExternalCompliment() {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.EXTERNAL_API_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    protocol.get(CONFIG.EXTERNAL_API_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.compliment || getRandomCompliment());
        } catch (e) {
          console.error('Error parsing external API response:', e.message);
          resolve(getRandomCompliment());
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching from external API:', err.message);
      resolve(getRandomCompliment());
    });
  });
}

/**
 * Send compliment to ESP32 via HTTP POST
 */
function sendComplimentToESP32(compliment) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message: compliment });
    
    const options = {
      hostname: CONFIG.ESP32_IP,
      port: CONFIG.ESP32_PORT,
      path: '/compliment',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`ESP32 responded with status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request to ESP32 timed out'));
    });
    
    req.write(postData);
    req.end();
  });
}

// ===================== COMPLIMENT DELIVERY =====================

let deliveryCount = 0;
let successCount = 0;
let failCount = 0;

/**
 * Main function to send compliment
 */
async function deliverCompliment() {
  deliveryCount++;
  const timestamp = getTimestamp();
  
  console.log(`\n[${ timestamp }] 🎁 Delivering compliment #${deliveryCount}...`);
  
  try {
    // Get compliment (from external API or local list)
    const compliment = CONFIG.USE_EXTERNAL_API 
      ? await fetchExternalCompliment()
      : getRandomCompliment();
    
    console.log(`   Message: "${compliment}"`);
    
    // Send to ESP32
    await sendComplimentToESP32(compliment);
    
    successCount++;
    console.log(`   ✓ Successfully sent to ESP32!`);
    console.log(`   Stats: ${successCount} sent, ${failCount} failed`);
    
  } catch (error) {
    failCount++;
    console.error(`   ✗ Failed to send compliment: ${error.message}`);
    console.log(`   Stats: ${successCount} sent, ${failCount} failed`);
  }
  
  // Calculate next delivery time
  const nextDelivery = new Date(Date.now() + CONFIG.COMPLIMENT_INTERVAL);
  console.log(`   Next delivery at: ${nextDelivery.toLocaleTimeString()}`);
}

/**
 * Start the compliment delivery service
 */
function startComplimentService() {
  console.log('\n' + '='.repeat(60));
  console.log('ESP32 Compliment Delivery Service');
  console.log('='.repeat(60));
  console.log(`Server Port:      ${CONFIG.SERVER_PORT}`);
  console.log(`ESP32 Address:    http://${CONFIG.ESP32_IP}:${CONFIG.ESP32_PORT}`);
  console.log(`Interval:         ${CONFIG.COMPLIMENT_INTERVAL / 60000} minutes`);
  console.log(`Total Messages:   ${COMPLIMENTS.length}`);
  console.log(`External API:     ${CONFIG.USE_EXTERNAL_API ? 'Yes' : 'No'}`);
  console.log('='.repeat(60));
  console.log('\n🚀 Starting compliment delivery...\n');
  
  // Send first compliment immediately
  deliverCompliment();
  
  // Schedule regular deliveries
  setInterval(deliverCompliment, CONFIG.COMPLIMENT_INTERVAL);
}

// ===================== WEB API SERVER =====================

/**
 * Create HTTP server for API endpoints
 */
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route: GET /
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32 Compliment Server</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
          h1 { color: #333; }
          .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .stat:last-child { border-bottom: none; }
          button { background: #4fc3f7; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
          button:hover { background: #29b6f6; }
        </style>
      </head>
      <body>
        <h1>🎁 ESP32 Compliment Server</h1>
        <div class="stats">
          <div class="stat"><strong>Status:</strong> <span>Running</span></div>
          <div class="stat"><strong>Deliveries:</strong> <span>${deliveryCount}</span></div>
          <div class="stat"><strong>Successful:</strong> <span>${successCount}</span></div>
          <div class="stat"><strong>Failed:</strong> <span>${failCount}</span></div>
          <div class="stat"><strong>Interval:</strong> <span>${CONFIG.COMPLIMENT_INTERVAL / 60000} minutes</span></div>
        </div>
        <button onclick="fetch('/api/trigger', {method: 'POST'}).then(() => location.reload())">Send Now</button>
        <button onclick="location.reload()" style="background: #777; margin-left: 10px;">Refresh Stats</button>
      </body>
      </html>
    `);
    return;
  }
  
  // Route: GET /api/compliment
  if (req.url === '/api/compliment' && req.method === 'GET') {
    const compliment = getRandomCompliment();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      compliment,
      total: COMPLIMENTS.length,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Route: POST /api/trigger (manually trigger a compliment)
  if (req.url === '/api/trigger' && req.method === 'POST') {
    deliverCompliment().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Compliment triggered' }));
    }).catch(() => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Failed to send' }));
    });
    return;
  }
  
  // Route: GET /api/stats
  if (req.url === '/api/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      deliveries: deliveryCount,
      successful: successCount,
      failed: failCount,
      intervalMinutes: CONFIG.COMPLIMENT_INTERVAL / 60000,
      esp32: `${CONFIG.ESP32_IP}:${CONFIG.ESP32_PORT}`,
      uptime: process.uptime()
    }));
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ===================== MAIN =====================

// Start the web server
server.listen(CONFIG.SERVER_PORT, () => {
  console.log(`\n📡 Web API server listening on http://localhost:${CONFIG.SERVER_PORT}`);
  console.log(`   Dashboard: http://localhost:${CONFIG.SERVER_PORT}`);
  console.log(`   API: http://localhost:${CONFIG.SERVER_PORT}/api/compliment`);
  
  // Start the compliment delivery service
  startComplimentService();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  console.log(`Final stats: ${successCount} sent, ${failCount} failed`);
  server.close(() => {
    console.log('Server closed. Goodbye!');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
