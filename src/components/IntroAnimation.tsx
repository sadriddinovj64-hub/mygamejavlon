import React, { useState, useEffect, useRef } from 'react';
import { Zap, Sparkles, Siren } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(8);
  const [loadingStep, setLoadingStep] = useState('3D TEMIR YO‘L TREKI VA VAGONLAR YUKLANMOQDA...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  useEffect(() => {
    try {
      soundManager.playIntroStinger();
    } catch {
      // audio context might wait for user interaction
    }

    const startTime = Date.now();
    const fillDuration = 2000; // 2.0 seconds smooth fill to 100%

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, Math.max(8, Math.floor((elapsed / fillDuration) * 100)));

      setProgress(rawPct);

      if (rawPct < 30) {
        setLoadingStep('3D TEMIR YO‘L TREKI VA VAGONLAR YUKLANMOQDA...');
      } else if (rawPct < 60) {
        setLoadingStep('SUBWAY SURFERS QAHRAMONLARI TAYYORLANMOQDA...');
      } else if (rawPct < 88) {
        setLoadingStep('INSPEKTOR VA KUCHUKCHA QUVLASH TIZIMI...');
      } else if (rawPct < 100) {
        setLoadingStep('GRAFIKA VA SHAHAR BINOLARI SOZLANMOQDA...');
      } else {
        setLoadingStep('TAYYOR! O‘YINGA XUSH KELIBSIZ!');
      }

      if (rawPct >= 100 && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(timer);
        try {
          soundManager.playCoin();
        } catch {
          // ignore
        }
        setIsFadingOut(true);
        window.setTimeout(() => {
          onCompleteRef.current();
        }, 180);
      }
    }, 25);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleQuickSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    try {
      soundManager.playCoin();
    } catch {
      // ignore
    }
    setIsFadingOut(true);
    window.setTimeout(() => {
      onCompleteRef.current();
    }, 120);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center select-none overflow-hidden font-['Outfit',sans-serif] transition-all duration-500 ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        // Haqiqiy 3D o'yinlardek ko'm-ko'k fon (Deep royal blue cinematic gaming gradient)
        background: 'radial-gradient(circle at 50% 40%, #0d3880 0%, #062254 40%, #021233 75%, #010a1f 100%)',
      }}
    >
      {/* Ko'm-ko'k fon ustidagi nurlar va yorug'lik effektlari */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.25)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Moviy yorug'lik chiziqlari (Cyber Grid) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf812_1px,transparent_1px),linear-gradient(to_bottom,#38bdf812_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-50" />

      {/* Politsiya sirena yaltirashlari (qizil va ko'k chaqnash) */}
      <div className="absolute top-10 left-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDuration: '1.4s' }} />
      <div className="absolute top-10 right-6 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDuration: '1.4s', animationDelay: '0.7s' }} />

      {/* TOP: Studio Branding Pill */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between px-6 pt-6 sm:pt-8">
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-900/60 border border-sky-400/40 text-sky-300 text-xs font-mono font-bold tracking-wider shadow-lg shadow-sky-500/10">
          <Siren className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>3D POLICE CHASE EDITION</span>
        </div>

        <div className="text-[11px] font-mono font-bold text-sky-400/70 tracking-widest uppercase">
          V2.0 PRO
        </div>
      </div>

      {/* CENTER: 3D Game Emblem & Epic Logo */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto px-4 max-w-sm sm:max-w-md w-full">
        {/* Animated 3D Shield Emblem with Glowing Electric Core */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-500 p-[3px] shadow-[0_0_40px_rgba(56,189,248,0.5)]">
            <div className="w-full h-full bg-[#03163d] rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/30 via-transparent to-blue-400/30 animate-spin" style={{ animationDuration: '7s' }} />
              <Zap className="w-12 h-12 text-sky-300 drop-shadow-[0_0_20px_rgba(56,189,248,1)] animate-pulse" />
            </div>
          </div>
          {/* Glowing pulse ring */}
          <div className="absolute -inset-3 rounded-3xl border border-sky-400/40 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
        </div>

        {/* Subway Surfers Title */}
        <h1 className="text-4xl sm:text-6xl font-black italic uppercase tracking-wider text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)] select-none">
          <span
            className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500"
            style={{
              textShadow:
                '3px 3px 0px #1e1b4b, -3px -3px 0px #1e1b4b, 3px -3px 0px #1e1b4b, -3px 3px 0px #1e1b4b',
            }}
          >
            SUBWAY
          </span>{' '}
          <span
            className="text-transparent bg-clip-text bg-gradient-to-b from-sky-300 via-cyan-400 to-blue-500"
            style={{
              textShadow:
                '3px 3px 0px #1e1b4b, -3px -3px 0px #1e1b4b, 3px -3px 0px #1e1b4b, -3px 3px 0px #1e1b4b',
            }}
          >
            SURFERS
          </span>
        </h1>

        <div className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1 rounded-full bg-blue-900/80 border border-sky-400/40 text-amber-300 text-xs font-mono font-bold tracking-wider shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>CHEKSIZ TEMIR YO‘L QUVLASHMACHASI</span>
        </div>

        <p className="text-sky-200/80 text-xs sm:text-sm mt-3 font-medium max-w-xs leading-relaxed">
          Politsiyachidan qoching, tangalarni to‘plang va yangi qahramonlarni oching!
        </p>
      </div>

      {/* BOTTOM: "pastda orqa fon ko'm-ko'k bo'lib faqat to'ladiku chiziq to'ladi" */}
      <div className="relative z-10 w-full max-w-md px-6 pb-8 sm:pb-12 flex flex-col gap-2.5">
        {/* Loading Step Text & Percentage */}
        <div className="flex items-center justify-between text-xs font-mono font-black tracking-wider">
          <span className="text-sky-300 truncate max-w-[260px] text-left drop-shadow">
            {loadingStep}
          </span>
          <span className="text-amber-300 font-extrabold text-sm ml-2 drop-shadow">
            {progress}%
          </span>
        </div>

        {/* The Sleek Glowing 3D Game Loading Bar (Chiziq) */}
        <div className="relative w-full h-3.5 bg-[#020e26] rounded-full p-0.5 border border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.35)] overflow-hidden">
          {/* Filling line with electric cyan-blue to gold gradient */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-300 transition-all duration-150 relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer light sweep animation across the line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />

            {/* Glowing tip at the head of the progress bar */}
            {progress > 2 && progress < 100 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_12px_#ffffff] animate-ping" style={{ animationDuration: '1s' }} />
            )}
          </div>
        </div>

        {/* Small Bottom Info */}
        <div className="flex items-center justify-between text-[10px] font-mono text-sky-400/60 pt-1">
          <span>⚡ 60 FPS 3D ENGINE</span>
          <button
            onClick={handleQuickSkip}
            className="text-sky-300 hover:text-white font-bold cursor-pointer px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/30 active:scale-95 transition"
          >
            TEGISH VA O‘TISH »
          </button>
        </div>
      </div>
    </div>
  );
};
