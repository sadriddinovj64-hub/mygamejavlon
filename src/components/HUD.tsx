import React from 'react';
import { Heart, Pause, Zap, Shield, Magnet, ShoppingBag } from 'lucide-react';
import { LevelConfig, PlayerStats } from '../types/game';

interface HUDProps {
  stats: PlayerStats;
  levelConfig: LevelConfig;
  highScore: number;
  onPause: () => void;
  onOpenShop?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  levelConfig,
  highScore,
  onPause,
  onOpenShop,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-2 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Distance & Current Biome */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-sky-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CHEKSIZ YUGURISH
              </span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300">
                {stats.currentBiomeName || levelConfig.biome.name}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow font-mono">
              {stats.distance.toLocaleString()} <span className="text-xs text-sky-300 font-normal">metr</span>
            </div>
          </div>

          {/* Heart Lives */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-md">
            {Array.from({ length: stats.maxHealth }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 transition-all duration-300 ${
                  i < stats.health
                    ? 'text-rose-500 fill-rose-500 animate-pulse'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Score & Coins */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="text-right">
              <div className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider flex items-center justify-end gap-1.5">
                <span>SCORE</span>
                {stats.multiplier > 1 && (
                  <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                    {stats.multiplier}x
                  </span>
                )}
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono leading-none">
                {stats.score.toLocaleString()}
              </div>
              {highScore > 0 && (
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                  BEST: {highScore.toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl">
              <div className="w-4 h-4 rounded-full bg-amber-400 border border-amber-200 shadow-sm flex items-center justify-center text-[10px] font-black text-amber-950">
                ¢
              </div>
              <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                {stats.coins}
              </span>
            </div>

            {/* Shop Button */}
            {onOpenShop && (
              <button
                onClick={onOpenShop}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-2.5 sm:px-3 py-1.5 rounded-xl pointer-events-auto transition active:scale-95 shadow-md cursor-pointer"
                title="Do'kon: Qahramonlar va Kiyimlar"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono hidden sm:inline">DO'KON</span>
              </button>
            )}

            {/* Pause Button */}
            <button
              onClick={onPause}
              className="p-2 sm:p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 pointer-events-auto transition active:scale-95 shadow-lg cursor-pointer"
              title="Pause Game (Esc / P)"
            >
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Police Chaser Proximity Alert Banner */}
        {stats.chaserClose && (
          <div className="w-full flex items-center justify-center animate-bounce">
            <div className="bg-gradient-to-r from-blue-700 via-slate-900 to-rose-700 border-2 border-amber-400 text-white font-mono font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-xl shadow-blue-900/50 flex items-center gap-2">
              <span className="animate-pulse text-base">🚨</span>
              <span className="tracking-wide">POLITSIYACHI QUVALAMOQDA! TEZROQ QOCHING!</span>
              <span className="animate-pulse text-base">🚨</span>
            </div>
          </div>
        )}
      </div>

        {/* Active Power-up Banner */}
        {stats.activePowerup !== 'none' && (
          <div className="self-center mt-1 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/80 shadow-lg animate-bounce">
            {stats.activePowerup === 'magnet' && (
              <>
                <Magnet className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-300">MAGNET</span>
              </>
            )}
            {stats.activePowerup === 'shield' && (
              <>
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">ENERGY SHIELD</span>
              </>
            )}
            {stats.activePowerup === 'boost' && (
              <>
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">SUPER BOOST</span>
              </>
            )}
            <span className="text-xs font-mono font-semibold text-slate-300">
              {Math.ceil(stats.powerupTimeRemaining)}s
            </span>
          </div>
        )}

      {/* Low Health Critical Warning */}
      {stats.health === 1 && (
        <div className="self-center bg-rose-950/80 border border-rose-500/50 text-rose-200 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase animate-pulse">
          Critical Health: Avoid Obstacles!
        </div>
      )}

      {/* Bottom spacer for mobile controls */}
      <div className="h-2" />
    </div>
  );
};
