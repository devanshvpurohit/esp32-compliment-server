import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import routes from './routes.js';
import { initHistory } from './compliments.js';
import { initWebsocket } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP Request] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/', routes);

// Add healthcheck route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize compliments history and WebSocket server
async function startServer() {
  await initHistory();
  initWebsocket(server);

  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` 🌟 COMPLIMENT SERVER RUNNING ON PORT ${PORT} 🌟`);
    console.log(`==================================================`);
    console.log(` - REST API: http://localhost:${PORT}`);
    console.log(` - React Socket.IO: ws://localhost:${PORT}`);
    console.log(` - ESP32 WebSocket: ws://localhost:${PORT}/esp32`);
    console.log(`==================================================`);
  });
}

startServer().catch(err => {
  console.error("Failed to start compliment server:", err);
  process.exit(1);
});
