import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { getCurrentMessage, getHistory, addMessage, getRandomCompliment } from './compliments.js';

let io = null;
let wss = null;
let esp32Socket = null;
let autoComplimentsEnabled = true;
let countdownSeconds = 600; // 10 minutes
let timerInterval = null;

// Track scheduled messages in memory
const scheduledMessages = [];

export function initWebsocket(httpServer) {
  // 1. Initialize Socket.IO for React clients
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] React client connected: ${socket.id}`);
    
    // Send initial state on connection
    socket.emit('currentMessage', getCurrentMessage());
    socket.emit('history', getHistory());
    socket.emit('status', getStatus());
    socket.emit('countdown', { seconds: autoComplimentsEnabled ? countdownSeconds : null, enabled: autoComplimentsEnabled });

    socket.on('toggleAuto', (enabled) => {
      autoComplimentsEnabled = enabled;
      if (enabled) {
        countdownSeconds = 600; // Reset
      }
      console.log(`[Timer] Auto compliments toggled to: ${enabled}`);
      broadcastToReact('countdown', { seconds: autoComplimentsEnabled ? countdownSeconds : null, enabled: autoComplimentsEnabled });
      broadcastToReact('status', getStatus());
    });

    socket.on('triggerRandom', async () => {
      console.log(`[Compliments] Manual random compliment requested from React`);
      await sendNewCompliment();
    });

    socket.on('scheduleMessage', (data) => {
      const { text, delaySeconds } = data;
      const sendTime = Date.now() + (delaySeconds * 1000);
      const scheduledItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text,
        sendTime,
        delaySeconds
      };
      
      scheduledMessages.push(scheduledItem);
      console.log(`[Scheduler] Scheduled message in ${delaySeconds}s: "${text}"`);
      broadcastToReact('scheduledList', getScheduledList());
      
      setTimeout(async () => {
        // Remove from list
        const idx = scheduledMessages.findIndex(m => m.id === scheduledItem.id);
        if (idx !== -1) {
          scheduledMessages.splice(idx, 1);
        }
        broadcastToReact('scheduledList', getScheduledList());
        
        // Send message
        await triggerMessage(text, 'custom');
      }, delaySeconds * 1000);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] React client disconnected: ${socket.id}`);
      broadcastToReact('status', getStatus());
    });
  });

  // 2. Initialize raw WebSocket Server for ESP32
  wss = new WebSocketServer({ noServer: true });

  // Handle server upgrade event
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/esp32') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, request) => {
    const clientIp = request.socket.remoteAddress;
    console.log(`[WebSocket] ESP32 connected from IP: ${clientIp}`);

    // If another ESP32 is already connected, close the previous one
    if (esp32Socket) {
      console.log(`[WebSocket] Disconnecting existing ESP32 client to enforce single-client limit.`);
      esp32Socket.close();
    }

    esp32Socket = ws;
    
    // Broadcast status to React immediately
    broadcastToReact('status', getStatus());

    // Send current message to ESP32 immediately on connection
    const currentMsg = getCurrentMessage();
    ws.send(JSON.stringify({ text: currentMsg.text }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        console.log(`[WebSocket] Received message from ESP32:`, parsed);
      } catch (err) {
        console.log(`[WebSocket] Received raw text from ESP32: ${message}`);
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] ESP32 disconnected.`);
      if (esp32Socket === ws) {
        esp32Socket = null;
      }
      broadcastToReact('status', getStatus());
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] ESP32 socket error:`, err.message);
    });
  });

  // 3. Start Auto Compliments Timer
  startCountdownTimer();
}

function startCountdownTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(async () => {
    if (autoComplimentsEnabled) {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        countdownSeconds = 600;
        await sendNewCompliment();
      }
      broadcastToReact('countdown', { seconds: countdownSeconds, enabled: autoComplimentsEnabled });
    }
  }, 1000);
}

async function sendNewCompliment() {
  const compliment = getRandomCompliment();
  await triggerMessage(compliment, 'auto');
}

export async function triggerMessage(text, type = 'custom') {
  // Store in history
  const newMessage = await addMessage(text, type);
  
  // Broadcast to React
  broadcastToReact('currentMessage', newMessage);
  broadcastToReact('history', getHistory());
  
  // Send to ESP32
  if (esp32Socket && esp32Socket.readyState === 1) { // OPEN state
    esp32Socket.send(JSON.stringify({ text }));
    console.log(`[WebSocket] Sent message to ESP32: "${text}"`);
  } else {
    console.warn(`[WebSocket] ESP32 offline, could not deliver: "${text}"`);
  }
}

export function broadcastToReact(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

export function getStatus() {
  return {
    esp32Connected: esp32Socket !== null,
    clients: io ? io.engine.clientsCount : 0
  };
}

export function getScheduledList() {
  return scheduledMessages.map(m => ({
    id: m.id,
    text: m.text,
    remainingSeconds: Math.max(0, Math.round((m.sendTime - Date.now()) / 1000))
  }));
}
