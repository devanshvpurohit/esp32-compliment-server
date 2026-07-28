/**
 * Vercel Serverless Function - Send Compliment to ESP32
 * Requires ESP32_IP environment variable to be set in Vercel
 */

const http = require('http');

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
];

function getRandomCompliment() {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

function sendToESP32(ip, port, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message });
    
    const options = {
      hostname: ip,
      port: port,
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, statusCode: res.statusCode, data });
        } else {
          reject(new Error(`ESP32 returned status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get ESP32 configuration from environment variables
  const esp32Ip = process.env.ESP32_IP;
  const esp32Port = parseInt(process.env.ESP32_PORT || '80', 10);
  
  // Check if ESP32_IP is configured
  if (!esp32Ip) {
    return res.status(200).json({
      success: false,
      error: 'ESP32_IP not configured',
      message: 'Set ESP32_IP environment variable in Vercel settings, or use the polling method (ESP32 fetches from /api/compliment)',
      hint: 'Your ESP32 can poll /api/compliment endpoint instead'
    });
  }
  
  // Get custom message from request body or use random
  let message = getRandomCompliment();
  
  if (req.method === 'POST' && req.body && req.body.message) {
    message = req.body.message;
  }
  
  try {
    // Send to ESP32
    const result = await sendToESP32(esp32Ip, esp32Port, message);
    
    res.status(200).json({
      success: true,
      message: 'Compliment sent to ESP32',
      compliment: message,
      esp32: `${esp32Ip}:${esp32Port}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error sending to ESP32:', error);
    
    res.status(200).json({
      success: false,
      error: error.message,
      message: 'Failed to send compliment to ESP32',
      compliment: message,
      esp32: `${esp32Ip}:${esp32Port}`,
      hint: 'Make sure ESP32 is online and accessible. Check ESP32_IP is correct.',
      timestamp: new Date().toISOString()
    });
  }
};
