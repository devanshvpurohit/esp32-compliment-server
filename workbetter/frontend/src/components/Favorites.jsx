import React from 'react';
import { Heart, Send, Trash2, Star } from 'lucide-react';

export default function Favorites({ favorites, onSendFavorite, onDeleteFavorite }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition duration-300 w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Star className="h-5 w-5 text-rose-500 fill-rose-500/10" />
          <span>Favorite Messages</span>
        </h2>
        <span className="text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
          {favorites.length} saved
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {favorites.map((fav, index) => (
          <div 
            key={index}
            className="group flex justify-between items-center p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-lg hover:border-zinc-800 transition duration-150"
          >
            <div className="text-sm text-zinc-300 truncate flex-1 pr-3 select-none">
              {fav}
            </div>
            
            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition duration-150">
              <button
                onClick={() => onSendFavorite(fav)}
                title="Send immediately"
                className="p-1.5 hover:bg-cyan-950 hover:text-cyan-400 rounded-md text-zinc-400 transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              
              <button
                onClick={() => onDeleteFavorite(fav)}
                title="Remove from favorites"
                className="p-1.5 hover:bg-rose-950 hover:text-rose-400 rounded-md text-zinc-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-zinc-600 font-medium text-sm text-center">
            <Heart className="h-8 w-8 text-zinc-800 mb-2" />
            No favorites saved yet.
            <div className="text-xs text-zinc-700 mt-1">
              Click the plus (+) icon when writing to save one!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
