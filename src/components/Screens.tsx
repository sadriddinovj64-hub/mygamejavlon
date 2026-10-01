import React from 'react';
import { Play, RotateCcw, Award, Star, List, Settings, Trophy, Zap, Volume2, VolumeX, ArrowRight, ShoppingBag } from 'lucide-react';
import { LevelConfig, PlayerStats, SavedLevelData } from '../types/game';

interface StartScreenProps {
  currentLevel: number;
  levelConfig: LevelConfig;
  savedData: SavedLevelData;
  soundEnabled: boolean;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onToggleSound: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  levelConfig,
  savedData,
  soundEnabled,
  onStartGame,
  onOpenShop,
  onOpenSettings,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-gradient-to-t from-slate-950/60 via-slate-900/25 to-transparent pointer-events-auto">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
            Cheksiz Yugurish Rejimi (Endless Runner)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition active:scale-95 shadow-md cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition active:scale-95 shadow-md cursor-pointer"
            title="Settings & Controls"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title Hero */}
      <div className="flex flex-col items-center text-center max-w-xl animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold mb-3 shadow-lg">
          <span className="animate-pulse">🚨</span>
          <span>ORQANGIZDAN POLITSIYACHI QUVALAMOQDA!</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
          Apex Endless <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-rose-400">Run</span>
        </h1>

        <p className="text-sm md:text-base text-slate-200 mt-2 max-w-md font-medium">
          To‘xtamasdan o‘lguncha yuguring! To‘siqlardan sakrab va sirg‘anib o‘tib, orqangizdan quvlayotgan politsiyachidan qoching!
        </p>

        {/* Primary Play & Shop Buttons */}
        <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={onStartGame}
            className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 via-indigo-600 to-rose-500 hover:from-sky-400 hover:via-indigo-500 hover:to-rose-400 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>YUGURISHNI BOSHLASH</span>
          </button>

          <button
            onClick={onOpenShop}
            className="w-full py-3.5 px-6 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 font-bold text-sm rounded-xl border border-amber-500/50 flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>QAHRAMONLAR VA DO'KON (SHOP)</span>
          </button>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 text-center">
        <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-sm shadow-md">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">REKORD BALL</div>
          <div className="text-lg font-mono font-black text-amber-400">
            {savedData.highScore.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-sm shadow-md">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">ENG UZOQ MASOFA</div>
          <div className="text-lg font-mono font-black text-sky-400">
            {(savedData.bestDistance || 0).toLocaleString()} m
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseScreenProps {
  currentLevel: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({
  onResume,
  onRestart,
  onOpenShop,
  onOpenSettings,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4">
          <Settings className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-black text-white">O‘YIN TO‘XTATILDI</h2>
        <p className="text-xs font-mono text-slate-400 mt-1 mb-6">Cheksiz Yugurish Rejimi</p>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-base rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            Davom ettirish
          </button>

          <button
            onClick={onOpenShop}
            className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm rounded-xl border border-amber-500/50 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Do'kon (Shop)
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Qayta boshlash
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-sm rounded-xl border border-slate-800 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Sozlamalar va Ovoz
          </button>
        </div>
      </div>
    </div>
  );
};

interface LevelCompleteScreenProps {
  levelConfig: LevelConfig;
  stats: PlayerStats;
  isNewHigh: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  onOpenShop: () => void;
}

export const LevelCompleteScreen: React.FC<LevelCompleteScreenProps> = ({
  levelConfig,
  stats,
  isNewHigh,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onOpenShop,
}) => {
  const isFinalLevel = levelConfig.level === 500;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Victory Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10 animate-bounce">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
          Victory Achieved
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
          Level {levelConfig.level} Complete!
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{levelConfig.biome.name}</p>

        {/* 3 Stars Reveal */}
        <div className="flex items-center gap-2 my-5">
          {[1, 2, 3].map((starIdx) => (
            <div
              key={starIdx}
              className={`p-2 rounded-2xl border transition-all duration-300 ${
                starIdx <= stats.stars
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/40 border-slate-800 text-slate-600'
              }`}
            >
              <Star
                className={`w-7 h-7 ${
                  starIdx <= stats.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 mb-6">
          <div className="text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase">FINAL SCORE</div>
            <div className="text-lg font-mono font-black text-amber-400">
              {stats.score.toLocaleString()}
            </div>
            {isNewHigh && (
              <div className="text-[9px] font-bold text-emerald-400 uppercase">
                ★ NEW HIGH SCORE!
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">COINS COLLECTED</div>
            <div className="text-lg font-mono font-black text-sky-400">
              +{stats.coins}
            </div>
            <div className="text-[9px] text-slate-400">
              Health: {stats.health}/3
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          {!isFinalLevel ? (
            <button
              onClick={onNextLevel}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <span>NEXT LEVEL ({levelConfig.level + 1})</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="py-3 px-4 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-sm rounded-xl">
              🎉 LEVEL 500 CONQUERED! OMEGA CHAMPION!
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              onClick={onOpenShop}
              className="py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              Do'kon
            </button>

            <button
              onClick={onReplay}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Replay
            </button>

            <button
              onClick={onOpenLevelSelect}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <List className="w-4 h-4" />
              Level Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverScreenProps {
  levelConfig: LevelConfig;
  stats: PlayerStats;
  isNewHigh: boolean;
  onRestart: () => void;
  onOpenShop?: () => void;
  onOpenLevelSelect?: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  stats,
  isNewHigh,
  onRestart,
  onOpenShop,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3 animate-pulse">
          <RotateCcw className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black text-white">POLITSIYACHI SIZNI USHLADI!</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          To‘siqlarga urilib sekinlashganingiz sababli politsiyachi sizni qo‘lga oldi!
        </p>

        {/* Stats Grid */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 my-5">
          <div className="text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">MASOFA</div>
            <div className="text-lg font-mono font-black text-sky-400">
              {stats.distance.toLocaleString()} m
            </div>
            {isNewHigh && (
              <div className="text-[9px] font-bold text-amber-400 uppercase">
                ★ YANGI REKORD!
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">TO‘PLANGAN TANGALAR</div>
            <div className="text-lg font-mono font-black text-amber-400">
              +{stats.coins}
            </div>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-800 text-left flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">UMUMIY BALL:</span>
            <span className="text-base font-mono font-black text-white">{stats.score.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-base rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>QAYTA YUGURISH</span>
          </button>

          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-sm rounded-xl border border-amber-500/40 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Qahramonlar va Do'kon</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface VictoryFinaleProps {
  stats: PlayerStats;
  onReplayLevel500: () => void;
  onOpenLevelSelect: () => void;
}

export const VictoryFinale: React.FC<VictoryFinaleProps> = ({
  stats,
  onReplayLevel500,
  onOpenLevelSelect,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg pointer-events-auto">
      <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-amber-500/40 rounded-3xl p-6 sm:p-10 w-full max-w-lg flex flex-col items-center text-center shadow-2xl shadow-amber-500/20 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center mb-4 shadow-xl shadow-amber-400/30 animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-black uppercase tracking-widest mb-2">
          ★ OMEGA CHAMPION ASCENSION ★
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          YOU CONQUERED ALL 500 LEVELS!
        </h2>

        <p className="text-sm text-slate-300 mt-3 max-w-md leading-relaxed">
          Through cyber streets, magma canyons, arctic blizzards, and the ultimate Cosmic Hyperzone, you mastered all 500 levels of Apex Runner 3D.
        </p>

        <div className="w-full bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 my-6 grid grid-cols-2 gap-4">
          <div className="text-center border-r border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">FINAL OMEGA SCORE</div>
            <div className="text-2xl font-mono font-black text-amber-400 mt-0.5">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase">TOTAL COINS</div>
            <div className="text-2xl font-mono font-black text-sky-400 mt-0.5">
              {stats.coins.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onReplayLevel500}
            className="w-full py-4 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 text-slate-950 font-black text-base rounded-2xl shadow-xl transition active:scale-95 cursor-pointer"
          >
            REPLAY LEVEL 500
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            Browse All 500 Levels
          </button>
        </div>
      </div>
    </div>
  );
};
