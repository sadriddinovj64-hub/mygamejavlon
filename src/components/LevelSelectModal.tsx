import React, { useState } from 'react';
import { X, Star, Lock, Play, ChevronRight, Zap } from 'lucide-react';
import { getLevelConfig } from '../utils/levelGenerator';
import { SavedLevelData } from '../types/game';

interface LevelSelectModalProps {
  unlockedLevel: number;
  currentLevel: number;
  savedData: SavedLevelData;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

const CHAPTERS = [
  { name: 'Ch. 1: Cyber Grid', range: [1, 50] },
  { name: 'Ch. 2: Rainforest', range: [51, 100] },
  { name: 'Ch. 3: Golden Dune', range: [101, 150] },
  { name: 'Ch. 4: Frost Glacier', range: [151, 200] },
  { name: 'Ch. 5: Magma Gorge', range: [201, 250] },
  { name: 'Ch. 6: Sakura Shrine', range: [251, 300] },
  { name: 'Ch. 7: Crystal Cave', range: [301, 350] },
  { name: 'Ch. 8: Apex Skyline', range: [351, 400] },
  { name: 'Ch. 9: Amber Ridge', range: [401, 450] },
  { name: 'Ch. 10: Omega Finale', range: [451, 500] },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  unlockedLevel,
  currentLevel,
  savedData,
  onSelectLevel,
  onClose,
}) => {
  const currentChapterIdx = Math.min(9, Math.floor((currentLevel - 1) / 50));
  const [selectedChapter, setSelectedChapter] = useState<number>(currentChapterIdx);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [allowAllLevels, setAllowAllLevels] = useState<boolean>(false);

  const [startLvl, endLvl] = CHAPTERS[selectedChapter].range;
  const levelsInChapter = Array.from(
    { length: endLvl - startLvl + 1 },
    (_, i) => startLvl + i
  );

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const lvl = parseInt(jumpInput, 10);
    if (!isNaN(lvl) && lvl >= 1 && lvl <= 500) {
      if (lvl <= unlockedLevel || allowAllLevels) {
        onSelectLevel(lvl);
      } else {
        alert(`Level ${lvl} is locked! Reach level ${unlockedLevel} first, or toggle "Unlock All for Testing" below.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white">Select Level</h2>
              <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded-full">
                500 Levels
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current highest unlocked: <span className="text-amber-400 font-bold">Level {unlockedLevel}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick jump to level 500 button */}
            <button
              onClick={() => onSelectLevel(500)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:text-white hover:bg-rose-900 text-xs font-bold transition active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Level 500 Finale
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chapter Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 overflow-x-auto no-scrollbar bg-slate-950/40">
          {CHAPTERS.map((ch, idx) => {
            const isActive = selectedChapter === idx;
            const isChapterUnlocked = ch.range[0] <= unlockedLevel || allowAllLevels;

            return (
              <button
                key={ch.name}
                onClick={() => setSelectedChapter(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : isChapterUnlocked
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80'
                }`}
              >
                {!isChapterUnlocked && <Lock className="w-3 h-3 text-slate-600" />}
                <span>{ch.name}</span>
              </button>
            );
          })}
        </div>

        {/* Level Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {levelsInChapter.map((lvl) => {
            const config = getLevelConfig(lvl);
            const isUnlocked = lvl <= unlockedLevel || allowAllLevels;
            const isCurrent = lvl === currentLevel;
            const stars = savedData.levelStars[lvl] || 0;
            const bestScore = savedData.levelScores[lvl];

            return (
              <button
                key={lvl}
                disabled={!isUnlocked}
                onClick={() => onSelectLevel(lvl)}
                className={`relative group flex flex-col p-3 rounded-2xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-950/50 ring-2 ring-sky-500/40'
                    : isUnlocked
                    ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-500 hover:scale-[1.02] cursor-pointer'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Level Number & Status */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-base font-black font-mono ${isCurrent ? 'text-sky-300' : 'text-white'}`}>
                    Lvl {lvl}
                  </span>
                  {isUnlocked ? (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>

                {/* Biome name */}
                <div className="text-[11px] font-semibold text-slate-400 truncate mt-1">
                  {config.biome.name}
                </div>

                {/* Distance and Speed stats */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/60">
                  <span>{config.targetDistance}m</span>
                  <span>{config.baseSpeed}m/s</span>
                </div>

                {bestScore !== undefined && (
                  <div className="text-[9px] text-amber-400/90 font-mono mt-1 truncate">
                    High: {bestScore.toLocaleString()}
                  </div>
                )}

                {/* Hover Play icon */}
                {isUnlocked && (
                  <div className="absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow">
                      <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Footer (Direct Jump & Cheat / Debug Free Exploration) */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 text-xs">
          <form onSubmit={handleJump} className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Jump to Level:</span>
            <input
              type="number"
              min="1"
              max="500"
              placeholder="1 - 500"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="w-24 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition active:scale-95"
            >
              Go
            </button>
          </form>

          {/* Unlock All for Testing Checkbox */}
          <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowAllLevels}
              onChange={(e) => setAllowAllLevels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0"
            />
            <span className="text-xs">Unlock all 500 levels for testing</span>
          </label>
        </div>
      </div>
    </div>
  );
};
