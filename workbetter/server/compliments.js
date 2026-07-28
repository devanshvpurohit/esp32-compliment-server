import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, 'data', 'history.json');

export const COMPLIMENTS = [
  "You are amazing ❤️",
  "Keep building!",
  "You are enough.",
  "Today is your day.",
  "You've got this!",
  "Believe in yourself.",
  "Never stop learning.",
  "One step at a time.",
  "You make people smile.",
  "Keep smiling 😊"
];

let lastCompliment = "";
let currentMessage = {
  text: "Welcome to Compliment Server! 🌟",
  timestamp: new Date().toISOString(),
  type: "system"
};

let messageHistory = [];

// Initialize history from file
export async function initHistory() {
  try {
    // Ensure data directory exists
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    messageHistory = JSON.parse(data);
    
    // Set the current message to the latest custom/auto message from history if it exists
    if (messageHistory.length > 0) {
      currentMessage = messageHistory[messageHistory.length - 1];
    }
    console.log(`[Compliments] History loaded. Total messages: ${messageHistory.length}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log("[Compliments] History file not found. Initializing empty history.");
      messageHistory = [];
      await saveHistoryToFile();
    } else {
      console.error("[Compliments] Error reading history file:", err.message);
    }
  }
}

async function saveHistoryToFile() {
  try {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    await fs.writeFile(HISTORY_FILE, JSON.stringify(messageHistory, null, 2), 'utf-8');
  } catch (err) {
    console.error("[Compliments] Error saving history file:", err.message);
  }
}

export function getCurrentMessage() {
  return currentMessage;
}

export function getHistory() {
  return messageHistory;
}

export async function addMessage(text, type = 'custom') {
  const timestamp = new Date().toISOString();
  const newMessage = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    type,
    timestamp
  };
  
  currentMessage = newMessage;
  messageHistory.push(newMessage);
  
  // Log message with timestamp
  console.log(`[${timestamp}] 📢 New message [${type}]: "${text}"`);
  
  await saveHistoryToFile();
  return newMessage;
}

export function getRandomCompliment() {
  // Filter out the last one if we have more than 1 option
  const available = COMPLIMENTS.filter(c => c !== lastCompliment);
  const selected = available[Math.floor(Math.random() * available.length)];
  lastCompliment = selected;
  return selected;
}

export async function clearHistory() {
  messageHistory = [];
  await saveHistoryToFile();
  console.log(`[${new Date().toISOString()}] 🧹 History cleared.`);
}
