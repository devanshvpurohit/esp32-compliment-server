/**
 * POST /api/send
 * Body: { "text": "Hello ESP32", "type": "custom" | "auto" }
 *
 * Stores the message in KV as both the current message and an entry
 * in the history list, then returns the stored message object.
 */

import { addMessage, getCurrentMessage } from "./_lib/state.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { text, type = "custom" } = req.body ?? {};

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: 'Missing or empty "text" field in request body.'
    });
  }

  if (!["custom", "auto", "system"].includes(type)) {
    return res.status(400).json({
      error: '"type" must be one of: custom, auto, system.'
    });
  }

  try {
    const message = await addMessage(text.trim(), type);
    return res.status(200).json({
      success: true,
      message: "Message stored and broadcast.",
      data:    message
    });
  } catch (err) {
    console.error("[/api/send] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
