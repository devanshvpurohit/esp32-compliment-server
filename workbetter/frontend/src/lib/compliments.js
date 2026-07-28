/**
 * Compliments list — client-side copy.
 * Used by the React dashboard's auto-compliment countdown timer
 * (which now runs in the browser, not the server).
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

let lastCompliment = "";

/**
 * Returns a random compliment different from the previous one.
 * @returns {string}
 */
export function getRandomCompliment() {
  const available = COMPLIMENTS.filter(c => c !== lastCompliment);
  const selected  = available[Math.floor(Math.random() * available.length)];
  lastCompliment  = selected;
  return selected;
}
