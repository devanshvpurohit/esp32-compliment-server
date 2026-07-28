/**
 * GET /api/status
 * Returns the current connection status.
 *
 * Response: { "esp32Connected": boolean }
 *
 * esp32Connected is true if the ESP32 sent a ping (/api/esp32-ping) within
 * the last 60 seconds.  The KV key expires automatically after 2 minutes,
 * so this check is always accurate even after server cold-starts.
 */

import { isEsp32Connected } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const esp32Connected = await isEsp32Connected();
    return res.status(200).json({ esp32Connected });
  } catch (err) {
    console.error("[/api/status] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
