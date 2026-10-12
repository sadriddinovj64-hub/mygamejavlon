import React, { useState } from 'react';
import { Gift, Sparkles, Trophy, Flame, Coins, ArrowRight, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

export interface MysteryReward {
  id: string;
  title: string;
  description: string;
  type: 'coins' | 'hoverboards' | 'jackpot' | 'headstart';
  coinAmount: number;
  hoverboardAmount: number;
  badge: string;
  icon: 'coin' | 'board' | 'star' | 'trophy';
}

const POSSIBLE_REWARDS: MysteryReward[] = [
  {
    id: 'coins_500',
    title: '500 Tangalar!',
    description: 'Klassik oltin tanga to‘plami',
    type: 'coins',
    coinAmount: 500,
    hoverboardAmount: 0,
    badge: 'TANGALAR',
    icon: 'coin',
  },
  {
    id: 'coins_1500',
    title: '1,500 Tangalar!',
    description: 'Katta oltin xazina sumkasi',
    type: 'coins',
    coinAmount: 1500,
    hoverboardAmount: 0,
    badge: 'KATTA XAZINA',
    icon: 'coin',
  },
  {
    id: 'hoverboards_3',
    title: '+3 Hoverboard & 500 Tanga!',
    description: 'Yugurishda xaloskor bo‘ladigan skeytlar',
    type: 'hoverboards',
    coinAmount: 500,
    hoverboardAmount: 3,
    badge: 'HOVERBOARD',
    icon: 'board',
  },
  {
    id: 'super_jackpot',
    title: '5,000 Tanga SUPER JACKPOT!',
    description: 'Afsonaviy Oltin Sovg‘a Jackpot!',
    type: 'jackpot',
    coinAmount: 5000,
    hoverboardAmount: 0,
    badge: '★ SUPER JACKPOT ★',
    icon: 'star',
  },
  {
    id: 'coins_2500',
    title: '2,500 Tangalar!',
    description: 'Subway Surfers oltin qutisi mukofoti',
    type: 'coins',
    coinAmount: 2500,
    hoverboardAmount: 0,
    badge: 'MAXSUS XAZINA',
    icon: 'coin',
  },
  {
    id: 'mega_jackpot',
    title: '10,000 Tanga MEGA JACKPOT!',
    description: 'Chempionlar uchun eng ulkan sovg‘a!',
    type: 'jackpot',
    coinAmount: 10000,
    hoverboardAmount: 5,
    badge: '👑 ULTRA JACKPOT 👑',
    icon: 'trophy',
  },
];

function getRandomReward(): MysteryReward {
  const rand = Math.random();
  if (rand < 0.05) return POSSIBLE_REWARDS[5]; // Mega jackpot 5%
  if (rand < 0.18) return POSSIBLE_REWARDS[3]; // Super jackpot 13%
  if (rand < 0.40) return POSSIBLE_REWARDS[2]; // Hoverboards 22%
  if (rand < 0.65) return POSSIBLE_REWARDS[1]; // 1,500 coins 25%
  if (rand < 0.85) return POSSIBLE_REWARDS[4]; // 2,500 coins 20%
  return POSSIBLE_REWARDS[0]; // 500 coins 15%
}

interface MysteryBoxModalProps {
  totalBoxes: number;
  onFinished: (totalCoinsWon: number, totalHoverboardsWon: number) => void;
}

export const MysteryBoxModal: React.FC<MysteryBoxModalProps> = ({
  totalBoxes,
  onFinished,
}) => {
  const [currentBoxIndex, setCurrentBoxIndex] = useState<number>(0);
  const [boxState, setBoxState] = useState<'unopened' | 'opening' | 'opened'>('unopened');
  const [currentReward, setCurrentReward] = useState<MysteryReward | null>(null);

  const [accumulatedCoins, setAccumulatedCoins] = useState<number>(0);
  const [accumulatedHoverboards, setAccumulatedHoverboards] = useState<number>(0);

  const handleOpenBox = () => {
    if (boxState !== 'unopened') return;
    setBoxState('opening');

    soundManager.playMysteryBoxOpen();

    setTimeout(() => {
      const reward = getRandomReward();
      setCurrentReward(reward);
      setBoxState('opened');

      setAccumulatedCoins((prev) => prev + reward.coinAmount);
      setAccumulatedHoverboards((prev) => prev + reward.hoverboardAmount);

      if (reward.type === 'jackpot') {
        soundManager.playJackpot();
      }
    }, 700);
  };

  const handleNextOrFinish = () => {
    if (currentBoxIndex < totalBoxes - 1) {
      setCurrentBoxIndex((i) => i + 1);
      setBoxState('unopened');
      setCurrentReward(null);
    } else {
      onFinished(accumulatedCoins, accumulatedHoverboards);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto select-none">
      <div className="relative bg-gradient-to-b from-slate-900 to-indigo-950 border-4 border-amber-400 rounded-3xl p-6 sm:p-8 w-full max-w-sm flex flex-col items-center text-center shadow-[0_20px_60px_rgba(245,158,11,0.35)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <span>SOVG‘A QUTISI ({currentBoxIndex + 1} / {totalBoxes})</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
          {boxState === 'opened' ? 'TABRIKLAYMIZ!' : 'SIRLI SOVG‘A!'}
        </h2>
        <p className="text-xs text-amber-200/80 mt-1 mb-4">
          {boxState === 'opened'
            ? 'Quti ichidan maxsus sovrin chiqdi!'
            : 'Yugurish davomida to‘plangan maxsus sovg‘a qutisi'}
        </p>

        {/* Central 3D Styled Mystery Box / Reward Area */}
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center my-2">
          {/* Glowing Radial Sunburst */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/25 to-yellow-400/20 blur-xl animate-pulse" />

          {boxState === 'unopened' && (
            <button
              onClick={handleOpenBox}
              className="group relative cursor-pointer active:scale-95 transition-transform duration-200 flex flex-col items-center justify-center"
              title="Ochish uchun bosing!"
            >
              {/* Animated 3D Mystery Box Representation */}
              <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 border-4 border-yellow-300 shadow-[0_12px_30px_rgba(225,29,72,0.6)] flex items-center justify-center animate-bounce">
                {/* Golden Cross Ribbons */}
                <div className="absolute inset-x-0 h-6 bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 shadow" />
                <div className="absolute inset-y-0 w-6 bg-gradient-to-b from-yellow-300 via-amber-200 to-yellow-400 shadow" />

                {/* Big Golden Mystery Ribbon Bow on Top */}
                <div className="absolute -top-4 w-12 h-8 rounded-full bg-gradient-to-b from-amber-300 to-yellow-500 border-2 border-white shadow-lg flex items-center justify-center text-sm font-black text-amber-950">
                  ★
                </div>

                {/* Center Question Mark */}
                <span className="relative z-10 text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  ?
                </span>
              </div>

              {/* Pulsing "TAP TO OPEN" Label */}
              <div className="mt-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md group-hover:scale-105 transition">
                OCHISH UCHUN BOSING!
              </div>
            </button>
          )}

          {boxState === 'opening' && (
            <div className="flex flex-col items-center justify-center animate-spin">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-rose-500 border-4 border-white shadow-2xl flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-white animate-pulse" />
              </div>
              <span className="mt-4 text-xs font-black text-yellow-300 uppercase tracking-widest animate-pulse">
                Ochilmoqda...
              </span>
            </div>
          )}

          {boxState === 'opened' && currentReward && (
            <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-300">
              {/* Prize Icon Frame */}
              <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-600 border-4 border-white shadow-[0_10px_35px_rgba(245,158,11,0.7)] flex flex-col items-center justify-center">
                {currentReward.icon === 'coin' && <Coins className="w-14 h-14 text-white drop-shadow-md" />}
                {currentReward.icon === 'board' && <Flame className="w-14 h-14 text-white fill-white drop-shadow-md" />}
                {currentReward.icon === 'star' && <Sparkles className="w-14 h-14 text-white drop-shadow-md" />}
                {currentReward.icon === 'trophy' && <Trophy className="w-14 h-14 text-white drop-shadow-md" />}
                <span className="text-[10px] font-black text-yellow-950 uppercase tracking-tight mt-1 bg-white/70 px-2 py-0.5 rounded-md">
                  {currentReward.badge}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Prize Details Card (Visible after opening) */}
        {boxState === 'opened' && currentReward && (
          <div className="w-full bg-slate-950/70 border-2 border-amber-400/60 rounded-2xl p-3.5 my-3 animate-in fade-in duration-200">
            <div className="text-xl font-black text-amber-300 drop-shadow">
              {currentReward.title}
            </div>
            <div className="text-xs text-slate-300 mt-0.5 font-medium">
              {currentReward.description}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-sm font-black text-white">
              {currentReward.coinAmount > 0 && (
                <span className="text-amber-400 font-mono">+{currentReward.coinAmount} 🪙</span>
              )}
              {currentReward.hoverboardAmount > 0 && (
                <span className="text-sky-400 font-mono">+{currentReward.hoverboardAmount} 🛹</span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {boxState === 'opened' && (
          <button
            onClick={handleNextOrFinish}
            className="w-full mt-2 py-3.5 bg-gradient-to-b from-lime-400 to-green-600 hover:from-lime-300 hover:to-green-500 text-white font-black text-sm rounded-2xl border-2 border-green-800 shadow-[0_5px_0_#14532d] flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            {currentBoxIndex < totalBoxes - 1 ? (
              <>
                <span>KEYINGI SOVG‘ANI OCHISH</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>DAVOM ETISH (NATIJALAR)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
