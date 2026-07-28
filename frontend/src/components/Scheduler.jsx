import React, { useState } from 'react';
import { Clock, Calendar, Play, X, Trash2 } from 'lucide-react';

export default function Scheduler({ scheduledList, onSchedule }) {
  const [text, setText] = useState("");
  const [delayVal, setDelayVal] = useState("60"); // default 1 min (60 seconds)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || !delayVal) return;
    
    const delaySecs = parseInt(delayVal, 10);
    if (isNaN(delaySecs) || delaySecs <= 0) return;

    onSchedule(text.trim(), delaySecs);
    setText("");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition duration-300 w-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-500" />
        <span>Schedule Message</span>
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message to schedule..."
          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          required
        />
        
        <div className="flex gap-2">
          <select
            value={delayVal}
            onChange={(e) => setDelayVal(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
          >
            <option value="10">In 10 seconds</option>
            <option value="30">In 30 seconds</option>
            <option value="60">In 1 minute</option>
            <option value="300">In 5 minutes</option>
            <option value="600">In 10 minutes</option>
            <option value="1800">In 30 minutes</option>
            <option value="3600">In 1 hour</option>
          </select>

          <button
            type="submit"
            disabled={!text.trim()}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition ${
              text.trim()
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-850'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Schedule
          </button>
        </div>
      </form>

      {/* Pending Scheduled List */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="text-xs font-semibold text-zinc-500 font-mono uppercase tracking-wider">
          Pending Queue
        </div>
        
        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
          {scheduledList.map((item) => (
            <div 
              key={item.id}
              className="flex justify-between items-center p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg"
            >
              <div className="flex flex-col flex-1 pr-3 truncate">
                <span className="text-sm text-zinc-300 truncate">{item.text}</span>
                <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 animate-spin" />
                  Sends in {item.remainingSeconds}s
                </span>
              </div>
            </div>
          ))}

          {scheduledList.length === 0 && (
            <div className="text-xs text-zinc-600 italic py-2 text-center select-none">
              No messages currently scheduled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
