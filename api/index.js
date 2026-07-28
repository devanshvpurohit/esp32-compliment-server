/**
 * Vercel Serverless Function - Main Dashboard
 */

module.exports = (req, res) => {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Send HTML response
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ESP32 Message Center</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px;display:flex;align-items:center;justify-content:center}
.container{background:#fff;padding:40px;border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,.25);max-width:650px;width:100%;animation:slideUp .5s ease-out}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
h1{color:#333;font-size:28px;text-align:center;margin-bottom:10px}
.subtitle{color:#666;font-size:14px;text-align:center;margin-bottom:30px}
.card{background:#f8f9fb;padding:25px;border-radius:16px;margin-bottom:20px}
label{display:block;color:#333;font-weight:600;margin-bottom:8px;font-size:14px}
input,textarea{width:100%;padding:14px;border:2px solid #e0e0e0;border-radius:10px;font-size:15px;font-family:inherit;background:#fff}
input:focus,textarea:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.1)}
textarea{resize:vertical;min-height:100px}
.btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;box-shadow:0 4px 15px rgba(102,126,234,.4);margin-top:15px}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(102,126,234,.5)}
.btn:disabled{opacity:.6;cursor:not-allowed;transform:none!important}
.result{margin-top:15px;padding:12px;border-radius:8px;font-size:14px;display:none}
.result.success{background:#d4edda;color:#155724;border:2px solid #c3e6cb}
.result.error{background:#f8d7da;color:#721c24;border:2px solid #f5c6cb}
.info-box{background:#e7f3ff;padding:15px;border-radius:10px;border-left:4px solid #007bff;margin-top:15px;font-size:14px;color:#004085}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
.url-display{background:#2d2d2d;color:#4fc3f7;padding:12px;border-radius:8px;font-family:monospace;word-break:break-all;margin:10px 0;font-size:13px}
.copy-btn{padding:8px 16px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-top:8px}
.copy-btn:hover{background:#5568d3}
</style>
</head>
<body>
<div class="container">
<h1>💌 ESP32 Message Center</h1>
<p class="subtitle">Send messages to your ESP32 display</p>

<div class="card">
<label>Message</label>
<textarea id="message" placeholder="Type your message here..." maxlength="200"></textarea>
<button class="btn" onclick="sendMsg()">📤 Send to ESP32</button>
<div id="result" class="result"></div>
</div>

<div class="card">
<label>ESP32 Polling URL (Recommended)</label>
<p style="color:#666;font-size:13px;margin-bottom:10px">Your ESP32 should poll this URL every 10 minutes:</p>
<div class="url-display" id="apiUrl">Loading...</div>
<button class="copy-btn" onclick="copyUrl()">📋 Copy URL</button>
</div>

<div class="info-box">
<strong>💡 Setup Instructions:</strong><br>
1. Get random compliments: <code>GET /api/compliment</code><br>
2. Send custom message: <code>POST /api/send</code><br>
3. ESP32 polls the compliment URL every 10 minutes<br>
4. No ESP32_IP env variable needed for polling!
</div>
</div>

<script>
window.addEventListener('DOMContentLoaded',function(){
document.getElementById('apiUrl').textContent=window.location.origin+'/api/compliment';
});

function copyUrl(){
const url=document.getElementById('apiUrl').textContent;
navigator.clipboard.writeText(url).then(()=>{
alert('✅ URL copied to clipboard!');
}).catch(()=>{
prompt('Copy this URL:',url);
});
}

function showResult(msg,type){
const el=document.getElementById('result');
el.textContent=msg;
el.className='result '+type;
el.style.display='block';
setTimeout(()=>{el.style.display='none';},5000);
}

async function sendMsg(){
const msg=document.getElementById('message').value.trim();
if(!msg){
showResult('⚠️ Please enter a message','error');
return;
}

const btn=event.target;
btn.disabled=true;
btn.textContent='⏳ Sending...';

try{
const res=await fetch('/api/send',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({message:msg})
});
const data=await res.json();

if(data.success){
showResult('✅ Message sent successfully!','success');
document.getElementById('message').value='';
}else{
showResult('❌ '+data.error,'error');
}
}catch(e){
showResult('❌ Error: '+e.message,'error');
}finally{
btn.disabled=false;
btn.textContent='📤 Send to ESP32';
}
}
</script>
</body>
</html>`);
  } catch (error) {
    console.error('Error in index handler:', error);
    return res.status(200).send('<h1>ESP32 Message Center</h1><p>Loading...</p>');
  }
};
