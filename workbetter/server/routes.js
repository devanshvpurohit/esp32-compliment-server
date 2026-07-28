import express from 'express';
import { getCurrentMessage, getHistory, clearHistory } from './compliments.js';
import { getStatus, triggerMessage } from './websocket.js';

const router = express.Router();

// GET /message - returns latest message
router.get('/message', (req, res) => {
  const current = getCurrentMessage();
  res.json({
    text: current.text,
    type: current.type,
    timestamp: current.timestamp
  });
});

// POST /send - body { "text": "Hello ESP32" } - updates current message
router.post('/send', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" field in request body' });
  }

  try {
    await triggerMessage(text, 'custom');
    res.json({ success: true, message: 'Message sent successfully', data: getCurrentMessage() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history - returns all messages
router.get('/history', (req, res) => {
  res.json(getHistory());
});

// POST /history/clear - clears all history
router.post('/history/clear', async (req, res) => {
  try {
    await clearHistory();
    // Broadcast clear event or update to React
    const { broadcastToReact } = await import('./websocket.js');
    broadcastToReact('history', []);
    broadcastToReact('currentMessage', getCurrentMessage());
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /status - returns { esp32Connected: true, clients: 1 }
router.get('/status', (req, res) => {
  res.json(getStatus());
});

export default router;
