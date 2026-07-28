/**
 * GET /api/esp32-ping
 *
 * Called by the ESP32 every ~30 seconds.
 * Does two things in one round-trip to minimise ESP32 HTTPS requests:
 *   1. Records that the ESP32 is alive (updates KV heartbeat key).
 *   2. Returns the current message so the ESP32 can detect changes.
 *
 * Response:
 * {
 *   "id":        "<message-id>",
 *   "text":      "<message text>",
 *   "type":      "auto" | "custom" | "system",
 *   "timestamp": "<ISO 8601>"
 * }
 *
 * The ESP32 compares the received `id` to the last-seen id.
 * If they differ, a new message is on screen.
 */

import { pingEsp32, getCurrentMessage } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Accept GET (simple polling) — no request body needed
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Run heartbeat update and message fetch in parallel
    const [, message] = await Promise.all([
      pingEsp32(),
      getCurrentMessage()
    ]);

    return res.status(200).json(message);
  } catch (err) {
    console.error("[/api/esp32-ping] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
