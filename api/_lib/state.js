/**
 * In-memory state manager for Vercel Serverless.
 *
 * NOTE: Vercel functions are stateless and memory resets when the function
 * spins down (goes to sleep). However, because the React app polls every
 * 5 seconds and the ESP32 polls every 30 seconds, the function stays "warm".
 *
 * If the server does restart (e.g. Vercel scales it or re-deploys),
 * these variables will reset to their default values.
 */

const HISTORY_MAX = 100;

const DEFAULT_MESSAGE = {
  id:        "welcome",
  text:      "Welcome to WorkBetter! \u2b50",
  type:      "system",
  timestamp: "2026-01-01T00:00:00.000Z"
};

// Global state variables
let currentMessage = { ...DEFAULT_MESSAGE };
let history        = [];
let esp32LastSeen  = 0;

/**
 * Returns the current (most recent) message.
 */
export async function getCurrentMessage() {
  return currentMessage;
}

/**
 * Stores a new message as the current message AND prepends it to the history list.
 */
export async function addMessage(text, type = "custom") {
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
  return msg;
}

/**
 * Returns the full history list, newest-first.
 */
export async function getHistory() {
  return history;
}

/**
 * Deletes all history entries, but keeps the current message intact.
 */
export async function clearHistory() {
  history = [];
}

/**
 * Updates the ESP32 last-seen timestamp.
 */
export async function pingEsp32() {
  esp32LastSeen = Date.now();
}

/**
 * Returns true if the ESP32 sent a ping within the last 60 seconds.
 */
export async function isEsp32Connected() {
  return (Date.now() - esp32LastSeen) < 60_000;
}
