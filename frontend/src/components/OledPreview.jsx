import React, { useState, useEffect } from 'react';

export default function OledPreview({ message, isOnline }) {
  const [scrollIndex, setScrollIndex] = useState(0);
  
  // Custom font-wrapping logic matching the ESP32 logic
  const wrapText = (text, maxChars = 20) => {
    if (!text) return [];
    
    // Clean emojis & non-ASCII characters to emulate the screen limitations
    const cleanedText = text
      .replace(/❤️/g, '<3')
      .replace(/😊/g, ':)')
      .replace(/[^\x00-\x7F]/g, ''); // Remove other emojis/non-ascii
      
    const words = cleanedText.split(' ');
    const wrappedLines = [];
    let currentLine = '';

    for (let word of words) {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        wrappedLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    return wrappedLines;
  };

  const textToDisplay = isOnline ? (message?.text || "Connected") : "Connecting...";
  const wrappedLines = wrapText(textToDisplay);
  const maxVisibleLines = 4;

  useEffect(() => {
    if (wrappedLines.length <= maxVisibleLines) {
      setScrollIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setScrollIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex > wrappedLines.length - maxVisibleLines ? 0 : nextIndex;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [wrappedLines.length]);

  const visibleLines = wrappedLines.slice(scrollIndex, scrollIndex + maxVisibleLines);
  
  // Decide title header based on state
  let headerText = "=== CONNECTING ===";
  if (isOnline) {
    if (message?.type === 'auto') {
      headerText = "=== COMPLIMENT ===";
    } else if (message?.type === 'custom') {
      headerText = "=== CUSTOM MSG ===";
    } else {
      headerText = "=== STATUS ===";
    }
  }

  // Calculate vertical centering if lines <= 4
  const needsScroll = wrappedLines.length > maxVisibleLines;
  
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
        OLED Display Live Preview
      </div>
      
      {/* Outer bezel */}
      <div className="relative p-4 bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl shadow-cyan-900/20 max-w-xs w-full">
        {/* Connection LED Indicator */}
        <div className="absolute top-2 right-4 flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} shadow-md`} />
          <span className="text-[10px] text-zinc-400 font-mono">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        
        {/* Yellow top screen / Blue bottom screen emulation */}
        <div className="w-full aspect-[2/1] bg-black border-4 border-zinc-900 rounded-md p-1.5 font-mono select-none overflow-hidden flex flex-col justify-between text-white relative shadow-inner">
          
          {/* Header (Yellow-ish color on SSD1306) */}
          <div className="text-[10px] text-amber-400 font-bold text-center tracking-tight truncate border-b border-zinc-800 pb-0.5 select-none uppercase">
            {headerText}
          </div>

          {/* Text Content Area (Blue-ish color on SSD1306) */}
          <div 
            className="flex-1 flex flex-col justify-center py-1 text-xs text-sky-400 text-center font-bold tracking-normal leading-4"
            style={{ minHeight: '38px' }}
          >
            {visibleLines.map((line, idx) => (
              <div key={idx} className="truncate select-none">
                {line}
              </div>
            ))}
            
            {visibleLines.length === 0 && (
              <div className="animate-pulse text-zinc-600 text-[10px]">NO MESSAGE</div>
            )}
          </div>

          {/* Footer separator and text */}
          <div className="border-t border-zinc-850 pt-0.5 text-[9px] text-sky-400 font-semibold text-center select-none truncate">
            {isOnline ? 'Stay awesome!' : 'Connecting Wi-Fi...'}
          </div>
        </div>
        
        {/* Details underneath */}
        <div className="mt-3 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
          <span>SSD1306 I2C 0x3C</span>
          {needsScroll && (
            <span className="flex items-center gap-1 animate-pulse text-amber-500">
              ⚡ Scrolling ({wrappedLines.length} lines)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
