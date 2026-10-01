import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface GameControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  activeKey?: string | null;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onLeft,
  onRight,
  onJump,
  onSlide,
  activeKey,
}) => {
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);

  const handleAction = (type: 'left' | 'right' | 'jump' | 'slide') => {
    setPressedBtn(type);
    setTimeout(() => setPressedBtn(null), 180);

    if (type === 'left') onLeft();
    else if (type === 'right') onRight();
    else if (type === 'jump') onJump();
    else if (type === 'slide') onSlide();
  };

  const isLeftActive = pressedBtn === 'left' || activeKey === 'left';
  const isRightActive = pressedBtn === 'right' || activeKey === 'right';
  const isJumpActive = pressedBtn === 'jump' || activeKey === 'jump';
  const isSlideActive = pressedBtn === 'slide' || activeKey === 'slide';

  return (
    <div className="absolute bottom-4 sm:bottom-6 inset-x-0 px-3 sm:px-8 flex items-end justify-between pointer-events-none z-20 select-none">
      {/* Chap (Left) va O'ng (Right) Tugmalari */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {/* CHAP TUGMA (MOVE LEFT) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction('left');
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border transition-all duration-100 shadow-2xl backdrop-blur-md cursor-pointer select-none active:scale-90 ${
            isLeftActive
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-sky-500 border-white text-white shadow-sky-500/50 scale-95 ring-4 ring-sky-400/40'
              : 'w-16 h-16 sm:w-20 sm:h-20 bg-slate-900/85 hover:bg-slate-800/90 border-slate-700/80 text-sky-300 hover:text-white'
          }`}
          aria-label="Chapga yurish (Left)"
          title="Chapga yurish (A / ←)"
        >
          <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-wider mt-0.5">
            CHAP
          </span>
        </button>

        {/* O'NG TUGMA (MOVE RIGHT) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction('right');
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border transition-all duration-100 shadow-2xl backdrop-blur-md cursor-pointer select-none active:scale-90 ${
            isRightActive
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-sky-500 border-white text-white shadow-sky-500/50 scale-95 ring-4 ring-sky-400/40'
              : 'w-16 h-16 sm:w-20 sm:h-20 bg-slate-900/85 hover:bg-slate-800/90 border-slate-700/80 text-sky-300 hover:text-white'
          }`}
          aria-label="O'ngga yurish (Right)"
          title="O'ngga yurish (D / →)"
        >
          <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-wider mt-0.5">
            O'NG
          </span>
        </button>
      </div>

      {/* Tepa (Sakrash / Jump) va Past (Sirg'anish / Slide) Tugmalari */}
      <div className="flex flex-col gap-2 sm:gap-3 pointer-events-auto">
        {/* TEPA TUGMA: SAKRASH (JUMP) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction('jump');
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border transition-all duration-100 shadow-2xl backdrop-blur-md cursor-pointer select-none active:scale-90 ${
            isJumpActive
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500 border-white text-white shadow-indigo-500/50 scale-95 ring-4 ring-indigo-400/40'
              : 'w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600/85 hover:bg-indigo-500/90 border-indigo-400/80 text-white'
          }`}
          aria-label="Tepaga sakrash (Jump)"
          title="Tepaga sakrash (W / ↑ / Space)"
        >
          <ArrowUp className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-wider">
            TEPA
          </span>
        </button>

        {/* PAST TUGMA: SIRG'ANISH (SLIDE) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAction('slide');
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border transition-all duration-100 shadow-2xl backdrop-blur-md cursor-pointer select-none active:scale-90 ${
            isSlideActive
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-amber-500 border-white text-white shadow-amber-500/50 scale-95 ring-4 ring-amber-400/40'
              : 'w-16 h-16 sm:w-20 sm:h-20 bg-amber-600/85 hover:bg-amber-500/90 border-amber-400/80 text-white'
          }`}
          aria-label="Pastga sirg'anish (Slide)"
          title="Pastga sirg'anish (S / ↓)"
        >
          <ArrowDown className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-wider">
            PAST
          </span>
        </button>
      </div>
    </div>
  );
};
