/**
 * Vercel Serverless Function - Webhook for Scheduled Compliments
 * Can be triggered by Vercel Cron Jobs to send compliments at regular intervals
 * 
 * Setup:
 * 1. Set ESP32_IP environment variable in Vercel dashboard
 * 2. Configure Vercel Cron in vercel.json to call this endpoint
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
          resolve({ success: true, statusCode: res.statusCode });
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
  // Verify authorization if secret is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
  }
  
  // Get ESP32 configuration
  const esp32Ip = process.env.ESP32_IP;
  const esp32Port = parseInt(process.env.ESP32_PORT || '80', 10);
  
  if (!esp32Ip) {
    return res.status(500).json({
      success: false,
      error: 'ESP32_IP environment variable not set',
      hint: 'Add ESP32_IP to your Vercel environment variables'
    });
  }
  
  const compliment = getRandomCompliment();
  
  try {
    await sendToESP32(esp32Ip, esp32Port, compliment);
    
    console.log(`[${new Date().toISOString()}] Compliment sent: "${compliment}"`);
    
    res.status(200).json({
      success: true,
      message: 'Compliment sent successfully',
      compliment,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      compliment,
      timestamp: new Date().toISOString()
    });
  }
};
