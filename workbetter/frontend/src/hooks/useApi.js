/**
 * useApi — polling-based hook that replaces the old Socket.IO useSocket hook.
 *
 * Architecture (Vercel / serverless):
 *   • Polls  GET /api/message + GET /api/status  every POLL_INTERVAL ms.
 *   • Manages the 10-minute auto-compliment countdown entirely in the browser.
 *   • When the countdown reaches 0 it POSTs a random compliment to /api/send.
 *   • Scheduled messages are queued in memory (client-side setTimeout).
 *   • Exposes the same shape as the old useSocket hook so every component
 *     works without modification.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomCompliment } from '../lib/compliments.js';

// ─── Config ────────────────────────────────────────────────────────────────────
// In production (same Vercel domain) leave VITE_API_URL empty → relative paths.
const API_BASE   = import.meta.env.VITE_API_URL ?? '';
const POLL_MS    = 5_000;   // poll every 5 seconds
const AUTO_SECS  = 600;     // 10-minute auto-compliment interval

// ─── Small fetch helpers ───────────────────────────────────────────────────────
async function apiFetch(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useApi() {
  // Connection state
  const [isConnected,   setIsConnected]   = useState(false);
  const [esp32Connected, setEsp32Connected] = useState(false);

  // Message state
  const [currentMessage, setCurrentMessage] = useState(null);
  const [history,        setHistory]         = useState([]);

  // Auto-compliment countdown
  const [countdown, setCountdown] = useState({ seconds: AUTO_SECS, enabled: true });

  // Scheduled messages (client-side only — resets on page reload)
  const [scheduledList, setScheduledList] = useState([]);

  // Refs for values used inside intervals without needing re-renders
  const lastMsgIdRef   = useRef(null);
  const autoEnabledRef = useRef(true);
  const countdownRef   = useRef(AUTO_SECS);

  // ── Internal send function (used by multiple callers) ────────────────────────
  const sendMessage = useCallback(async (text, type = 'custom') => {
    const data = await apiFetch('/api/send', {
      method: 'POST',
      body:   JSON.stringify({ text, type })
    });

    // Optimistically update UI immediately, don't wait for next poll
    const msg = data.data;
    if (msg) {
      setCurrentMessage(msg);
      lastMsgIdRef.current = msg.id;
      setHistory(prev => [msg, ...prev].slice(0, 100));
    }
    return data;
  }, []);

  // ── Polling effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    let pollTimer;

    async function poll() {
      try {
        const [msg, status] = await Promise.all([
          apiFetch('/api/message'),
          apiFetch('/api/status')
        ]);

        setIsConnected(true);
        setEsp32Connected(status.esp32Connected ?? false);

        // Only update message state when the id actually changes
        if (msg?.id && msg.id !== lastMsgIdRef.current) {
          lastMsgIdRef.current = msg.id;
          setCurrentMessage(msg);
        }
      } catch {
        setIsConnected(false);
      }
    }

    async function fetchHistory() {
      try {
        const data = await apiFetch('/api/history');
        setHistory(Array.isArray(data) ? data : []);
      } catch { /* silently ignore initial fetch failure */ }
    }

    fetchHistory();
    poll();
    pollTimer = setInterval(poll, POLL_MS);
    return () => clearInterval(pollTimer);
  }, []); // intentionally empty — run once on mount

  // ── 1-second countdown timer ─────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!autoEnabledRef.current) return;

      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown({ seconds: countdownRef.current, enabled: true });

      if (countdownRef.current === 0) {
        // Reset first so any slow network call doesn't double-fire
        countdownRef.current = AUTO_SECS;
        setCountdown({ seconds: AUTO_SECS, enabled: true });

        try {
          await sendMessage(getRandomCompliment(), 'auto');
        } catch (err) {
          console.error('[Auto-compliment] Failed to send:', err);
        }
      }
    }, 1_000);

    return () => clearInterval(timer);
  }, [sendMessage]);

  // ── Public API (same shape as old useSocket hook) ─────────────────────────────
  const toggleAuto = useCallback((enabled) => {
    autoEnabledRef.current = enabled;
    if (enabled) {
      countdownRef.current = AUTO_SECS;
      setCountdown({ seconds: AUTO_SECS, enabled: true });
    } else {
      setCountdown({ seconds: null, enabled: false });
    }
  }, []);

  const triggerRandom = useCallback(async () => {
    countdownRef.current = AUTO_SECS;
    setCountdown({ seconds: AUTO_SECS, enabled: autoEnabledRef.current });
    return sendMessage(getRandomCompliment(), 'auto');
  }, [sendMessage]);

  const scheduleMessage = useCallback((text, delaySeconds) => {
    const id       = `sched-${Date.now()}`;
    const sendAt   = Date.now() + delaySeconds * 1_000;

    setScheduledList(prev => [
      ...prev,
      { id, text, remainingSeconds: delaySeconds, sendTime: sendAt }
    ]);

    // Update remaining display every second
    const ticker = setInterval(() => {
      const remaining = Math.max(0, Math.round((sendAt - Date.now()) / 1_000));
      setScheduledList(prev =>
        prev.map(item => item.id === id ? { ...item, remainingSeconds: remaining } : item)
      );
    }, 1_000);

    // Fire the message after the delay
    setTimeout(async () => {
      clearInterval(ticker);
      setScheduledList(prev => prev.filter(item => item.id !== id));
      try {
        await sendMessage(text, 'custom');
      } catch (err) {
        console.error('[Scheduler] Failed to send scheduled message:', err);
      }
    }, delaySeconds * 1_000);
  }, [sendMessage]);

  const clearMsgHistory = useCallback(async () => {
    await apiFetch('/api/history-clear', { method: 'POST' });
    setHistory([]);
  }, []);

  const sendCustomMessage = useCallback((text) => sendMessage(text, 'custom'), [sendMessage]);

  return {
    isConnected,
    esp32Connected,
    clientsCount: 1,        // not tracked on Vercel (no persistent server)
    currentMessage,
    history,
    countdown,
    scheduledList,
    toggleAuto,
    triggerRandom,
    scheduleMessage,
    sendCustomMessage,
    clearMsgHistory
  };
}
