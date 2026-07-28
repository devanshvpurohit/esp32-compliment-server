import React from 'react';
import { History, Trash2, Send, Clock, Sparkles, User } from 'lucide-react';

export default function HistoryList({ history, onClear, onResend }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition duration-300 w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
          <span>Message History</span>
        </h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 px-2.5 py-1.5 rounded-lg border border-rose-950 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear History
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
        {history.slice().reverse().map((msg, index) => (
          <div 
            key={msg.id || index}
            className="group flex justify-between items-center p-3 bg-zinc-950 border border-zinc-850 rounded-lg hover:border-zinc-800 transition"
          >
            <div className="flex flex-col gap-1 flex-1 pr-3 truncate">
              <span className="text-sm text-zinc-200 font-medium select-none truncate">
                {msg.text}
              </span>
              
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatTime(msg.timestamp)}
                </span>
                
                <span>•</span>
                
                {msg.type === 'auto' ? (
                  <span className="flex items-center gap-0.5 text-amber-500 font-semibold bg-amber-950/30 px-1.5 py-0.5 rounded text-[9px] uppercase border border-amber-950/20">
                    <Sparkles className="h-2.5 w-2.5" />
                    Auto
                  </span>
                ) : msg.type === 'custom' ? (
                  <span className="flex items-center gap-0.5 text-cyan-400 font-semibold bg-cyan-950/30 px-1.5 py-0.5 rounded text-[9px] uppercase border border-cyan-950/20">
                    <User className="h-2.5 w-2.5" />
                    Custom
                  </span>
                ) : (
                  <span className="text-zinc-500 font-semibold bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] uppercase border border-zinc-850">
                    System
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onResend(msg.text)}
              title="Resend this message"
              className="p-2 bg-zinc-900 hover:bg-cyan-950 text-zinc-400 hover:text-cyan-400 border border-zinc-850 hover:border-cyan-900/30 rounded-lg opacity-40 group-hover:opacity-100 transition duration-150"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-sm text-zinc-600 font-medium py-10 text-center select-none flex flex-col items-center">
            <History className="h-8 w-8 text-zinc-800 mb-2" />
            No messages sent yet.
            <div className="text-xs text-zinc-700 mt-1">
              Sent messages will appear here in real time.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
