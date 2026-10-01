import React from 'react';
import { X, Volume2, VolumeX, Music, Monitor, Smartphone, Keyboard } from 'lucide-react';
import { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <h2 className="text-xl font-black text-white">Settings & Controls</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-mono font-bold text-sky-400 tracking-wider">
              Audio
            </h3>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-sky-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <div className="text-sm font-bold text-white">Sound Effects</div>
                  <div className="text-xs text-slate-400">Coins, jumps, collisions, fanfares</div>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-sky-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Music */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className={`w-5 h-5 ${settings.musicEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-bold text-white">Arcade Synth Music</div>
                  <div className="text-xs text-slate-400">Catchy Web Audio procedural synth soundtrack</div>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.musicEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.musicEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs uppercase font-mono font-bold text-sky-400 tracking-wider">
              Graphics Quality
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onUpdateSettings({ quality: q })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border ${
                    settings.quality === q
                      ? 'bg-sky-600 border-sky-400 text-white shadow-lg'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {q}
                  <div className="text-[10px] font-normal text-slate-300/80 mt-0.5">
                    {q === 'high' ? 'Shadows on' : q === 'medium' ? 'Standard' : 'Max FPS'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Controls Reference Guide */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs uppercase font-mono font-bold text-sky-400 tracking-wider">
              Controls Guide
            </h3>

            {/* Desktop & On-Screen Buttons */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Keyboard className="w-4 h-4 text-sky-400" />
                <span>Boshqaruv tugmalari (Keyboard & On-Screen Buttons)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Chapga yurish (Left):</span>
                  <span className="font-mono font-bold text-sky-400">A / ← / [CHAP]</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">O'ngga yurish (Right):</span>
                  <span className="font-mono font-bold text-sky-400">D / → / [O'NG]</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Tepaga sakrash (Jump):</span>
                  <span className="font-mono font-bold text-indigo-400">W / ↑ / [TEPA]</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Pastga sirg'anish (Slide):</span>
                  <span className="font-mono font-bold text-amber-400">S / ↓ / [PAST]</span>
                </div>
              </div>
            </div>

            {/* Mobile / Touch */}
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Sensor / Touch boshqaruvi</span>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Ekrandagi <strong className="text-sky-300">[CHAP]</strong>, <strong className="text-sky-300">[O'NG]</strong>, <strong className="text-indigo-300">[TEPA]</strong> (sakrash), va <strong className="text-amber-300">[PAST]</strong> (sirg'anish) tugmalarini bosing yoki barmog'ingiz bilan suring (swipe).
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl transition active:scale-95 shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
