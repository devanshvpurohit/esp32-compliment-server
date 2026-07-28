import React, { useState } from 'react';
import { Send, Sparkles, Copy, Heart, Check, Plus } from 'lucide-react';

const QUICK_EMOJIS = ["❤️", "😊", "✨", "🔥", "🚀", "🌟", "🎉", "💪", "👍", "💡"];

export default function MessageForm({ onSend, onTriggerRandom, onSaveFavorite, isSending }) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const maxLimit = 120;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleCopy = () => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveFavorite = () => {
    if (!text.trim()) return;
    onSaveFavorite(text.trim());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const addEmoji = (emoji) => {
    if (text.length + emoji.length <= maxLimit) {
      setText(prev => prev + emoji);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition duration-300 w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>Compose Message</span>
        </h2>
        <div className="text-xs text-zinc-500 font-mono">
          {text.length}/{maxLimit} chars
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxLimit))}
            onKeyDown={handleKeyDown}
            placeholder="Type a compliment or message to display on the ESP32 screen..."
            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition duration-200"
            disabled={isSending}
          />
          {text && (
            <div className="absolute bottom-2 right-2 flex gap-1 bg-zinc-950/80 p-1 rounded-md">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy message text"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleSaveFavorite}
                title="Add to Favorites"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-500 transition"
              >
                {justSaved ? <Check className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Quick Emoji Bar */}
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          <span className="text-xs text-zinc-500 font-medium mr-1">Quick Emojis:</span>
          {QUICK_EMOJIS.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addEmoji(emoji)}
              disabled={isSending}
              className="text-sm px-2 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 rounded hover:scale-105 transition"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            type="button"
            onClick={onTriggerRandom}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-850 hover:bg-zinc-800 text-amber-400 font-semibold rounded-lg text-sm border border-zinc-800 hover:border-amber-900/30 transition duration-200"
            disabled={isSending}
          >
            <Sparkles className="h-4 w-4" />
            Random Compliment
          </button>
          
          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm text-black transition duration-200 ${
              text.trim() && !isSending
                ? 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:opacity-90 shadow-md shadow-cyan-950/20'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-850'
            }`}
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
