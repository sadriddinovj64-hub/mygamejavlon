import React from 'react';
import { Heart, Pause, Zap, Shield, Magnet, ShoppingBag, Star, Volume2, VolumeX, Footprints, Rocket, Flame } from 'lucide-react';
import { LevelConfig, PlayerStats } from '../types/game';

interface HUDProps {
  stats: PlayerStats;
  levelConfig: LevelConfig;
  highScore: number;
  soundEnabled?: boolean;
  onPause: () => void;
  onOpenShop?: () => void;
  onToggleSound?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  highScore,
  soundEnabled = true,
  onPause,
  onOpenShop,
  onToggleSound,
}) => {
  const paddedScore = String(Math.floor(stats.score)).padStart(6, '0');
  const totalBars = 10;
  const maxDuration =
    stats.activePowerup === 'jetpack' || stats.activePowerup === 'hoverboard' || stats.activePowerup === 'sneakers'
      ? 12
      : stats.activePowerup === 'shield'
      ? 15
      : stats.activePowerup === 'magnet'
      ? 10
      : 8;
  const filledBars = Math.max(
    1,
    Math.min(totalBars, Math.ceil((stats.powerupTimeRemaining / maxDuration) * totalBars))
  );

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-20 select-none">
      {/* TOP BAR: Exact Subway Surfers Layout (Left: Blue Pause & Hearts | Right: xMultiplier + 008040 Score, Coins, TOP RUN) */}
      <div className="flex items-start justify-between w-full">
        {/* TOP-LEFT: Iconic Blue Square Pause Button + Hearts + Sound + Shop */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onPause}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 border-2 border-white shadow-[0_4px_0_#1e3a8a,0_6px_14px_rgba(0,0,0,0.5)] flex items-center justify-center active:scale-95 transition cursor-pointer"
            title="To'xtatish (Pause)"
          >
            <Pause className="w-6 h-6 text-white fill-white drop-shadow" />
          </button>

          {/* Compact Hearts */}
          <div className="flex items-center gap-1 bg-slate-950/60 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/15">
            {Array.from({ length: stats.maxHealth }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-all ${
                  i < stats.health
                    ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                    : 'text-slate-600/70'
                }`}
              />
            ))}
          </div>

          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 border border-white/20 text-white shadow-md active:scale-95 transition cursor-pointer"
              title={soundEnabled ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              )}
            </button>
          )}

          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 border border-amber-400/50 text-amber-300 shadow-md active:scale-95 transition cursor-pointer"
              title="Qahramonlar Do'koni"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </button>
          )}
        </div>

        {/* TOP-RIGHT: Subway Surfers Score Stack (xMultiplier + 6-Digit Score -> Coins -> TOP RUN) */}
        <div className="flex flex-col items-end gap-1.5">
          {/* 1. Multiplier + 6-Digit Score Bar */}
          <div className="flex items-center gap-2 bg-slate-950/65 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/15 shadow-lg">
            <div className="flex items-center gap-0.5 text-yellow-400 font-black text-sm sm:text-base italic drop-shadow">
              <span>x{stats.multiplier}</span>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" />
            </div>
            <span className="font-mono font-black text-white text-xl sm:text-2xl tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {paddedScore}
            </span>
          </div>

          {/* 2. Gold Coins Counter Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950/65 backdrop-blur-sm px-3 py-0.5 rounded-xl border border-white/15 shadow-md">
            <span className="font-mono font-black text-white text-base sm:text-lg drop-shadow">
              {stats.coins}
            </span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 border-2 border-yellow-100 shadow flex items-center justify-center text-[10px] font-black text-amber-950">
              $
            </div>
          </div>

          {/* 3. TOP RUN / HIGH SCORE Box (Matching Images 1, 2, 3, 5) */}
          <div className="flex flex-col items-center bg-slate-950/65 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/15 shadow-md">
            <span className="text-[9px] font-black uppercase tracking-wider text-yellow-400 leading-none mb-1">
              TOP RUN
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-b from-sky-400 to-blue-700 border-2 border-white flex items-center justify-center shadow-inner text-lg">
              🏃
            </div>
            <span className="font-mono font-black text-white text-[11px] sm:text-xs mt-0.5 leading-none drop-shadow">
              {Math.max(highScore, stats.score)}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM-LEFT: Subway Surfers Segmented Powerup Timer Bar (Matching Image 1 & Image 5) */}
      <div className="w-full flex items-end justify-between">
        {stats.activePowerup !== 'none' ? (
          <div className="flex items-center gap-1.5 bg-white/95 p-1 rounded-xl border-2 border-slate-800 shadow-xl">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-amber-400 to-orange-500 border border-amber-200 flex items-center justify-center text-white shadow">
              {stats.activePowerup === 'jetpack' && <Rocket className="w-5 h-5 text-white" />}
              {stats.activePowerup === 'hoverboard' && <Flame className="w-5 h-5 text-white fill-white" />}
              {stats.activePowerup === 'magnet' && <Magnet className="w-5 h-5 text-white" />}
              {stats.activePowerup === 'shield' && <Shield className="w-5 h-5 text-white" />}
              {stats.activePowerup === 'boost' && <Zap className="w-5 h-5 text-white fill-white" />}
              {stats.activePowerup === 'sneakers' && <Footprints className="w-5 h-5 text-white" />}
              {stats.activePowerup !== 'jetpack' &&
                stats.activePowerup !== 'hoverboard' &&
                stats.activePowerup !== 'magnet' &&
                stats.activePowerup !== 'shield' &&
                stats.activePowerup !== 'boost' &&
                stats.activePowerup !== 'sneakers' && <Star className="w-5 h-5 text-white fill-white" />}
            </div>
            <div className="flex items-center gap-0.5 pr-1.5">
              {Array.from({ length: totalBars }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-5 rounded-xs transition-all ${
                    idx < filledBars
                      ? 'bg-gradient-to-b from-lime-400 to-green-600 border border-green-800'
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
