import React from 'react';
import { Play, Pause, RefreshCw, Zap } from 'lucide-react';

export default function AutoComplimentTimer({ countdown, onToggleAuto, onTriggerRandom }) {
  const { seconds, enabled } = countdown;

  const formatTimer = (secs) => {
    if (secs === null || secs === undefined) return "--:--";
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Percentage calculations (for 10 min countdown)
  const maxSeconds = 600;
  const currentSeconds = seconds !== null ? seconds : maxSeconds;
  const percentage = ((maxSeconds - currentSeconds) / maxSeconds) * 100;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition duration-300 w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 fill-amber-500/10" />
          <span>Auto Compliment Scheduler</span>
        </h2>
        
        {/* Toggle Switch */}
        <button
          onClick={() => onToggleAuto(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            enabled ? 'bg-cyan-500' : 'bg-zinc-800 border border-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        {/* Circular/Line Progress and Timer */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            {/* Visual glow indicator */}
            <div className={`text-3xl font-extrabold font-mono tracking-wider ${enabled ? 'text-white' : 'text-zinc-600 animate-pulse'}`}>
              {formatTimer(seconds)}
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-500 uppercase font-mono tracking-wider">
              Next compliment in
            </span>
            <span className="text-sm text-zinc-300 font-medium">
              {enabled ? 'Running - 10 min interval' : 'Paused - Auto mode disabled'}
            </span>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onTriggerRandom}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold rounded-lg transition"
          title="Send a random compliment now and reset the countdown timer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
          Trigger Now
        </button>
      </div>

      {/* Progress Bar */}
      {enabled && seconds !== null && (
        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 transition-all duration-1000 ease-linear"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
