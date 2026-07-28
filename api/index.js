/**
 * Single Serverless Express Function for Vercel.
 *
 * Consolidating all routes into one file ensures that Vercel spins up a single
 * Node.js instance to handle all /api/* requests. This allows the in-memory
 * global variables to be shared across all endpoints (e.g. status.js and esp32-ping.js).
 */

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ─── IN-MEMORY STATE ──────────────────────────────────────────────────────────

const HISTORY_MAX = 100;

const DEFAULT_MESSAGE = {
  id:        "welcome",
  text:      "Welcome to WorkBetter! \u2b50",
  type:      "system",
  timestamp: "2026-01-01T00:00:00.000Z"
};

let currentMessage = { ...DEFAULT_MESSAGE };
let history        = [];
let esp32LastSeen  = 0;

// ─── ROUTE: GET /api/message ──────────────────────────────────────────────────
app.get("/api/message", (req, res) => {
  res.status(200).json(currentMessage);
});

// ─── ROUTE: POST /api/send ────────────────────────────────────────────────────
app.post("/api/send", (req, res) => {
  const { text, type = "custom" } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  const msg = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    type,
    timestamp: new Date().toISOString()
  };

  currentMessage = msg;
  history.unshift(msg);
  if (history.length > HISTORY_MAX) {
    history = history.slice(0, HISTORY_MAX);
  }

  console.log(`[${msg.timestamp}] [${type}] "${text}"`);
  res.status(200).json({ success: true, message: "Message stored.", data: msg });
});

// ─── ROUTE: GET /api/history ──────────────────────────────────────────────────
app.get("/api/history", (req, res) => {
  res.status(200).json(history);
});

// ─── ROUTE: POST /api/history-clear ───────────────────────────────────────────
app.post("/api/history-clear", (req, res) => {
  history = [];
  res.status(200).json({ success: true, message: "History cleared." });
});

// ─── ROUTE: GET /api/status ───────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const esp32Connected = (Date.now() - esp32LastSeen) < 60_000;
  res.status(200).json({ esp32Connected });
});

// ─── ROUTE: GET /api/esp32-ping ───────────────────────────────────────────────
app.get("/api/esp32-ping", (req, res) => {
  esp32LastSeen = Date.now();
  res.status(200).json(currentMessage);
});

// ─── FALLBACK ROUTE ───────────────────────────────────────────────────────────
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Export the Express app as a serverless function handler for Vercel
module.exports = app;
