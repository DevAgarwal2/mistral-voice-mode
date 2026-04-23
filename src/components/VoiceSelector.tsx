"use client";

import { Voice } from "@/lib/voices";

interface VoiceSelectorProps {
  voices: Voice[];
  selected: Voice;
  onSelect: (voice: Voice) => void;
}

export default function VoiceSelector({ voices, selected, onSelect }: VoiceSelectorProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-2xl bg-white border border-[#e5e2de] shadow-sm">
      {voices.map((voice) => {
        const isActive = voice.id === selected.id;
        return (
          <button
            key={voice.id}
            onClick={() => onSelect(voice)}
            className={`
              relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-300
              ${isActive 
                ? "bg-[#f7f5f2] scale-105 shadow-sm" 
                : "hover:bg-[#fafafa] opacity-60 hover:opacity-100"
              }
            `}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: voice.color }}
            >
              {voice.name[0]}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-[#1a1a1a]">{voice.name}</span>
              <span className="text-[10px] text-[#aaaaaa]">{voice.accent}</span>
            </div>
            {isActive && (
              <div
                className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                style={{ backgroundColor: voice.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
