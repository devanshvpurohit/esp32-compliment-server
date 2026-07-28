/**
 * Vercel Serverless Function - Send Text Message to ESP32
 * This endpoint receives text messages and forwards them to ESP32
 * Can be used with SMS services, webhooks, or direct API calls
 */

const http = require('http');

function sendToESP32(ip, port, message, type = 'message') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ 
      message,
      type,
      timestamp: new Date().toISOString()
    });
    
    const options = {
      hostname: ip,
      port: port,
      path: '/message',
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  // Get ESP32 configuration from environment variables
  const esp32Ip = process.env.ESP32_IP;
  const esp32Port = parseInt(process.env.ESP32_PORT || '80', 10);
  
  if (!esp32Ip) {
    return res.status(200).json({
      success: false,
      error: 'ESP32_IP not configured',
      hint: 'Set ESP32_IP environment variable in Vercel settings, or use the polling method'
    });
  }
  
  // Get message from request body
  let message = '';
  let sender = 'Unknown';
  let messageType = 'text';
  
  try {
    if (req.body) {
      // Handle different input formats
      if (typeof req.body === 'string') {
        message = req.body;
      } else if (req.body.message) {
        message = req.body.message;
        sender = req.body.sender || req.body.from || sender;
        messageType = req.body.type || messageType;
      } else if (req.body.text) {
        // SMS webhook format
        message = req.body.text;
        sender = req.body.from || sender;
        messageType = 'sms';
      } else if (req.body.Body) {
        // Twilio format
        message = req.body.Body;
        sender = req.body.From || sender;
        messageType = 'sms';
      }
    }
  } catch (e) {
    console.error('Error parsing request body:', e);
  }
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No message provided',
      hint: 'Send JSON with "message" field or plain text'
    });
  }
  
  // Format the message with sender info
  const formattedMessage = sender !== 'Unknown' 
    ? `From ${sender}: ${message}` 
    : message;
  
  try {
    // Send to ESP32
    await sendToESP32(esp32Ip, esp32Port, formattedMessage, messageType);
    
    console.log(`[${new Date().toISOString()}] Message sent: "${formattedMessage}" (type: ${messageType})`);
    
    res.status(200).json({
      success: true,
      message: 'Message sent to ESP32',
      content: formattedMessage,
      type: messageType,
      sender,
      esp32: `${esp32Ip}:${esp32Port}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    res.status(200).json({
      success: false,
      error: error.message,
      message: formattedMessage,
      esp32: `${esp32Ip}:${esp32Port}`,
      hint: 'Make sure ESP32 is online and accessible',
      timestamp: new Date().toISOString()
    });
  }
};
