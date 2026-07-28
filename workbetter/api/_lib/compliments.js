/**
 * Compliments list shared between the API (random auto-send)
 * and the ESP32-ping endpoint (which may send a compliment preview).
 */

export const COMPLIMENTS = [
  "You are amazing \u2764\ufe0f",
  "Keep building!",
  "You are enough.",
  "Today is your day.",
  "You've got this!",
  "Believe in yourself.",
  "Never stop learning.",
  "One step at a time.",
  "You make people smile.",
  "Keep smiling \U0001f60a",
  "You're doing great!",
  "Your code is awesome!",
  "Keep up the good work!",
  "You are a star!",
  "You light up the room!",
  "You're one of a kind!",
  "You're making a difference!",
  "Dream big, build bigger.",
  "Shine bright today!",
  "You inspire others!"
];

// Tracks the last compliment sent to prevent back-to-back duplicates.
// NOTE: This lives in module scope — it persists within the same
// function instance on Vercel but resets on cold starts. That is fine
// for a personal project; consecutive-duplicate protection is best-effort.
let lastCompliment = "";

/**
 * Returns a random compliment that is different from the previous one.
 * @returns {string}
 */
export function getRandomCompliment() {
  const available = COMPLIMENTS.filter(c => c !== lastCompliment);
  const selected  = available[Math.floor(Math.random() * available.length)];
  lastCompliment  = selected;
  return selected;
}
