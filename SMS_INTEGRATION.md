# 📱 SMS Integration Guide

Send text messages to your ESP32 display via SMS using popular services!

## 🎯 Overview

The `/api/message` endpoint accepts text messages from multiple sources:
- Direct API calls (web UI, apps, scripts)
- SMS webhooks (Twilio, Vonage, etc.)
- Third-party integrations (Zapier, IFTTT, etc.)

## 🔗 Webhook URL

Your webhook URL:
```
https://your-app.vercel.app/api/message
```

## 📋 API Format

### Request
```bash
POST /api/message
Content-Type: application/json

{
  "message": "Your message here",
  "sender": "Optional sender name/number",
  "type": "text"
}
```

### Response
```json
{
  "success": true,
  "message": "Message sent to ESP32",
  "content": "Your message here",
  "type": "text",
  "sender": "Optional sender",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🚀 Integration Options

### 1. Twilio (SMS Service)

[Twilio](https://www.twilio.com) offers free trial credits and powerful SMS capabilities.

#### Setup:

1. **Sign up** at https://www.twilio.com
2. **Get a phone number** (free trial includes one)
3. **Configure webhook**:
   - Go to Phone Numbers → Active Numbers
   - Click your number
   - Under "Messaging", set:
     - **Webhook URL**: `https://your-app.vercel.app/api/message`
     - **HTTP Method**: POST
   - Save

#### Test:
Send an SMS to your Twilio number, and it will appear on your ESP32!

#### Cost:
- Free trial: $15 credit
- After trial: ~$0.0075 per message (incoming)

---

### 2. Vonage (formerly Nexmo)

[Vonage](https://www.vonage.com) provides SMS API with competitive pricing.

#### Setup:

1. **Sign up** at https://dashboard.nexmo.com
2. **Get API credentials** and phone number
3. **Set inbound webhook**:
   - Go to Numbers → Your Numbers
   - Edit your number
   - Set Webhook URL: `https://your-app.vercel.app/api/message`
   - Save

#### Test:
Text your Vonage number to see messages on ESP32

---

### 3. Zapier Integration

[Zapier](https://zapier.com) can connect hundreds of apps to your ESP32.

#### Example Zap: Gmail to ESP32

1. **Trigger**: New email in Gmail with specific label
2. **Action**: Webhook POST to `https://your-app.vercel.app/api/message`
   ```json
   {
     "message": "{{subject}} - {{body}}",
     "sender": "{{from_email}}",
     "type": "email"
   }
   ```

#### Other Zap Ideas:
- Slack message → ESP32 display
- Google Calendar reminder → ESP32
- Weather alert → ESP32
- Todo item added → ESP32
- Social media mention → ESP32

---

### 4. IFTTT Integration

[IFTTT](https://ifttt.com) - "If This Then That" automation platform.

#### Example: iOS Shortcut to ESP32

1. **Create Applet**:
   - If: Button widget pressed
   - Then: Webhooks action
   
2. **Webhook Configuration**:
   - URL: `https://your-app.vercel.app/api/message`
   - Method: POST
   - Content Type: application/json
   - Body:
     ```json
     {
       "message": "{{Text}}",
       "type": "shortcut"
     }
     ```

---

### 5. Direct cURL (Command Line)

Send messages from terminal or scripts:

```bash
# Simple message
curl -X POST https://your-app.vercel.app/api/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from terminal!"}'

# With sender info
curl -X POST https://your-app.vercel.app/api/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Meeting in 5 minutes","sender":"Calendar","type":"reminder"}'
```

---

### 6. Python Script

```python
import requests

def send_message_to_esp32(message, sender=None):
    url = "https://your-app.vercel.app/api/message"
    
    payload = {
        "message": message,
        "type": "text"
    }
    
    if sender:
        payload["sender"] = sender
    
    response = requests.post(url, json=payload)
    return response.json()

# Usage
send_message_to_esp32("Python says hello!", "PythonBot")
```

---

### 7. Node.js Script

```javascript
const fetch = require('node-fetch');

async function sendMessageToESP32(message, sender = null) {
  const url = 'https://your-app.vercel.app/api/message';
  
  const payload = {
    message,
    type: 'text'
  };
  
  if (sender) {
    payload.sender = sender;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

// Usage
sendMessageToESP32('Node.js says hello!', 'NodeBot');
```

---

### 8. iOS Shortcuts

Create an iOS shortcut to send messages from your phone:

1. Open **Shortcuts** app
2. Create new shortcut
3. Add action: **Get Text from Input**
4. Add action: **Get Contents of URL**
   - URL: `https://your-app.vercel.app/api/message`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Request Body: JSON
     ```json
     {
       "message": "[Shortcut Input]",
       "sender": "iPhone",
       "type": "shortcut"
     }
     ```
5. Add to Home Screen or widget

---

### 9. Android Tasker

Use Tasker to automate ESP32 messages:

1. Create new Task
2. Add action: **HTTP Request**
   - Method: POST
   - URL: `https://your-app.vercel.app/api/message`
   - Content Type: application/json
   - Body: `{"message":"Your message","sender":"Android"}`

---

## 🔒 Security Considerations

### Basic Authentication

Add auth to your message endpoint by creating `api/message-secure.js`:

```javascript
module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.MESSAGE_TOKEN;
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Rest of your message handler code...
};
```

Then set `MESSAGE_TOKEN` in Vercel environment variables.

### Rate Limiting

To prevent spam, you can add rate limiting using Vercel's edge config or external services like Upstash.

---

## 📊 Message Format Examples

### Standard Text
```json
{
  "message": "Don't forget to take out the trash!"
}
```

### With Sender
```json
{
  "message": "Meeting moved to 3 PM",
  "sender": "Calendar"
}
```

### SMS Format (Twilio)
Twilio automatically sends:
```json
{
  "Body": "Your message here",
  "From": "+1234567890"
}
```
Your endpoint handles this automatically!

### Email Notification
```json
{
  "message": "New email from John: Can we meet tomorrow?",
  "sender": "john@example.com",
  "type": "email"
}
```

---

## 🎨 Message Types

Your ESP32 can display different headers based on type:

| Type | Header | Use Case |
|------|--------|----------|
| `text` | === TEXT MESSAGE === | General messages |
| `sms` | === TEXT MESSAGE === | SMS/phone messages |
| `email` | === MESSAGE === | Email notifications |
| `reminder` | === MESSAGE === | Calendar reminders |
| `alert` | === MESSAGE === | Important alerts |
| `compliment` | === COMPLIMENT === | Motivational messages |

---

## 🧪 Testing

### Test with curl:
```bash
# Test basic message
curl -X POST https://your-app.vercel.app/api/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message from curl"}'

# Test with sender
curl -X POST https://your-app.vercel.app/api/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Reminder: Take medicine","sender":"HealthApp","type":"reminder"}'
```

### Check Vercel logs:
Go to your Vercel dashboard → Deployments → Functions to see message logs.

---

## 💡 Creative Use Cases

1. **Package Delivery Notifications** - Get alerts when packages arrive
2. **Smart Home Alerts** - Display sensor readings or alerts
3. **Social Media Mentions** - See when someone mentions you
4. **Stock Price Alerts** - Get notified of price changes
5. **Weather Warnings** - Severe weather alerts
6. **Calendar Reminders** - Meeting notifications
7. **Fitness Milestones** - Celebrate achievements
8. **Family Messages** - Quick notes from family members
9. **Pet Cam Alerts** - Motion detection notifications
10. **Server Monitoring** - Uptime alerts and errors

---

## 🐛 Troubleshooting

### Messages not showing on ESP32

1. Check ESP32 has `/message` endpoint handler
2. Verify ESP32_IP is set in Vercel environment
3. Check Vercel function logs for errors
4. Test ESP32 endpoint directly: `curl -X POST http://ESP32_IP/message -d '{"message":"test"}'`

### Twilio webhook not working

1. Verify webhook URL is correct
2. Check it's set to POST method
3. Look at Twilio's request logs
4. Ensure your Vercel app is deployed (not just preview)

### Rate limiting issues

1. Check your service's rate limits
2. Add delays between messages
3. Implement queue system for high volume

---

## 📚 Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Vonage SMS API](https://developer.vonage.com/messaging/sms/overview)
- [Zapier Webhooks](https://zapier.com/apps/webhook/integrations)
- [IFTTT Webhooks](https://ifttt.com/maker_webhooks)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

---

## 🎉 Next Steps

- Add authentication to secure your endpoint
- Create custom message templates
- Build a mobile app for easy messaging
- Set up automated workflows with Zapier
- Integrate with your smart home system

Happy messaging! 📱✨
