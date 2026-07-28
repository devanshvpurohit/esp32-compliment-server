import React from 'react';
import { Server, Cpu, CheckCircle, XCircle } from 'lucide-react';

export default function ConnectionStatus({ isConnected, esp32Connected, clientsCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Server Status Card */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition duration-300">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isConnected ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
            <Server className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold text-white">Node.js Server</div>
            <div className="text-xs text-zinc-500 font-mono">
              {isConnected ? `${clientsCount} dashboard client(s) active` : 'Disconnected'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800">
          {isConnected ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-mono">Connected</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-rose-400 font-mono">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* ESP32 Status Card */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition duration-300">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${esp32Connected ? 'bg-cyan-950 text-cyan-400' : 'bg-zinc-950 text-zinc-500'}`}>
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold text-white">ESP32 Device</div>
            <div className="text-xs text-zinc-500 font-mono">
              {esp32Connected ? 'WebSocket Active' : 'Waiting for connection...'}
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${esp32Connected ? 'bg-cyan-950/40' : 'bg-zinc-800'}`}>
          {esp32Connected ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
              <span className="text-cyan-400 font-mono">Connected</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-zinc-500 font-mono">Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
