/**
 * GET /api/history
 * Returns the full history list (newest-first, up to 100 messages).
 */

import { getHistory } from "./_lib/kv.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const history = await getHistory();
    return res.status(200).json(history);
  } catch (err) {
    console.error("[/api/history] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
