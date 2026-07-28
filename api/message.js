/**
 * GET /api/message
 * Returns the current message stored in KV.
 */

import { getCurrentMessage } from "./_lib/state.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const message = await getCurrentMessage();
    return res.status(200).json(message);
  } catch (err) {
    console.error("[/api/message] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
