/**
 * POST /api/history-clear
 * Deletes all message history from KV.
 * The current message (wb:currentMessage) is left intact.
 */

import { clearHistory } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await clearHistory();
    return res.status(200).json({ success: true, message: "History cleared." });
  } catch (err) {
    console.error("[/api/history-clear] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
