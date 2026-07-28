import React, { useState, useEffect } from 'react';
import { useApi } from './hooks/useApi';
import ConnectionStatus from './components/ConnectionStatus';
import MessageForm from './components/MessageForm';
import Favorites from './components/Favorites';
import Scheduler from './components/Scheduler';
import HistoryList from './components/HistoryList';
import OledPreview from './components/OledPreview';
import AutoComplimentTimer from './components/AutoComplimentTimer';
import { Sparkles, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const {
    isConnected,
    esp32Connected,
    clientsCount,
    currentMessage,
    history,
    countdown,
    scheduledList,
    toggleAuto,
    triggerRandom,
    scheduleMessage,
    sendCustomMessage,
    clearMsgHistory
  } = useApi();   // ← now uses HTTP polling (Vercel-compatible)

  const [favorites, setFavorites] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('workbetter_favs');
    if (saved) {
      setFavorites(JSON.parse(saved));
    } else {
      const defaults = [
        "You are doing amazing! \U0001f680",
        "Take a deep breath. You've got this! \u2728",
        "Keep building, you are a star! \U0001f31f",
        "Your code is beautiful today! \U0001f4bb",
        "You make a difference!"
      ];
      setFavorites(defaults);
      localStorage.setItem('workbetter_favs', JSON.stringify(defaults));
    }
  }, []);

  // Fire confetti on every new message id
  useEffect(() => {
    if (!currentMessage?.id) return;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: currentMessage.type === 'auto'
        ? ['#f59e0b', '#3b82f6', '#10b981']
        : ['#22d3ee', '#6366f1', '#ec4899']
    });
  }, [currentMessage?.id]);

  const handleSendMessage = async (text) => {
    setIsSending(true);
    try {
      await sendCustomMessage(text);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveFavorite = (text) => {
    if (favorites.includes(text)) return;
    const updated = [...favorites, text];
    setFavorites(updated);
    localStorage.setItem('workbetter_favs', JSON.stringify(updated));
  };

  const handleDeleteFavorite = (text) => {
    const updated = favorites.filter(f => f !== text);
    setFavorites(updated);
    localStorage.setItem('workbetter_favs', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-sky-500 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
              <Sparkles className="h-6 w-6 text-black font-extrabold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
                WorkBetter
                <span className="text-cyan-400 text-sm font-semibold px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-900/30">
                  Vercel
                </span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium">ESP32 Compliment Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-900 text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            API: {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">

        <ConnectionStatus
          isConnected={isConnected}
          esp32Connected={esp32Connected}
          clientsCount={clientsCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <MessageForm
              onSend={handleSendMessage}
              onTriggerRandom={triggerRandom}
              onSaveFavorite={handleSaveFavorite}
              isSending={isSending}
            />

            <AutoComplimentTimer
              countdown={countdown}
              onToggleAuto={toggleAuto}
              onTriggerRandom={triggerRandom}
            />

            <Scheduler
              scheduledList={scheduledList}
              onSchedule={scheduleMessage}
            />
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <OledPreview
              message={currentMessage}
              isOnline={esp32Connected}
            />

            <Favorites
              favorites={favorites}
              onSendFavorite={handleSendMessage}
              onDeleteFavorite={handleDeleteFavorite}
            />

            <HistoryList
              history={history}
              onClear={clearMsgHistory}
              onResend={handleSendMessage}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 mt-12 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>WorkBetter App &copy; 2026 — Powered by Vercel</span>
          <span className="flex items-center gap-1">
            Made for builders with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
          </span>
        </div>
      </footer>
    </div>
  );
}
