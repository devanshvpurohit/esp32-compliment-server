/**
 * Upstash Redis state helpers for WorkBetter.
 *
 * Uses @upstash/redis — the current Vercel-recommended Redis client.
 *
 * Required environment variables (set in Vercel Dashboard → Project → Settings → Environment Variables,
 * or pulled locally with `vercel env pull .env.local`):
 *
 *   UPSTASH_REDIS_REST_URL    — e.g. https://us1-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  — your Upstash REST token
 *
 * To get these:
 *   1. Go to https://console.upstash.com → create a free Redis database.
 *   2. Copy the REST URL and REST Token from the database dashboard.
 *   3. Add both to Vercel: Project → Settings → Environment Variables.
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ─── Key names ────────────────────────────────────────────────────────────────
const K_CURRENT  = "wb:currentMessage";
const K_HISTORY  = "wb:history";
const K_ESP32    = "wb:esp32LastSeen";
const HISTORY_MAX = 100;

// ─── Default message shown before anything is sent ───────────────────────────
const DEFAULT_MESSAGE = {
  id:        "welcome",
  text:      "Welcome to WorkBetter! \u2b50",
  type:      "system",
  timestamp: "2026-01-01T00:00:00.000Z",
};

// ─── Message helpers ──────────────────────────────────────────────────────────

/**
 * Returns the current (most recent) message.
 * Falls back to the welcome message if Redis is empty.
 */
export async function getCurrentMessage() {
  const msg = await redis.get(K_CURRENT);
  return msg ?? DEFAULT_MESSAGE;
}

/**
 * Stores a new message as the current message AND prepends it to the
 * history list (capped at HISTORY_MAX entries).
 *
 * @param {string} text
 * @param {"auto"|"custom"|"system"} type
 * @returns {Promise<object>} The newly created message object.
 */
export async function addMessage(text, type = "custom") {
  const msg = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    type,
    timestamp: new Date().toISOString(),
  };

  await Promise.all([
    redis.set(K_CURRENT, msg),
    redis.lpush(K_HISTORY, JSON.stringify(msg)),
  ]);

  // Trim so the list never grows unbounded
  await redis.ltrim(K_HISTORY, 0, HISTORY_MAX - 1);

  console.log(`[${msg.timestamp}] [${type}] "${text}"`);
  return msg;
}

/**
 * Returns the full history list, newest-first.
 */
export async function getHistory() {
  const items = await redis.lrange(K_HISTORY, 0, HISTORY_MAX - 1);
  return items.map((item) =>
    typeof item === "string" ? JSON.parse(item) : item
  );
}

/**
 * Deletes all history entries. The current message is left intact.
 */
export async function clearHistory() {
  await redis.del(K_HISTORY);
}

// ─── ESP32 heartbeat helpers ──────────────────────────────────────────────────

/**
 * Updates the ESP32 last-seen timestamp.
 * The key expires automatically after 2 minutes so the ESP32 is correctly
 * reported as offline if it stops sending pings.
 */
export async function pingEsp32() {
  await redis.set(K_ESP32, Date.now(), { ex: 120 });
}

/**
 * Returns true if the ESP32 pinged within the last 60 seconds.
 */
export async function isEsp32Connected() {
  const lastSeen = await redis.get(K_ESP32);
  if (!lastSeen) return false;
  return Date.now() - Number(lastSeen) < 60_000;
}
