import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Award,
  Star,
  List,
  Settings,
  Trophy,
  Zap,
  Volume2,
  VolumeX,
  ArrowRight,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Sparkles,
  Shirt,
  Shield,
  Flame,
} from 'lucide-react';
import { LevelConfig, PlayerStats, SavedLevelData } from '../types/game';
import { CHARACTERS_CATALOG, CharacterItem, CharacterOutfit } from '../types/character';
import { buildCharacterRig } from '../game/CharacterModelBuilder';
import { soundManager } from '../utils/audio';

interface StartScreenProps {
  currentLevel: number;
  levelConfig: LevelConfig;
  savedData: SavedLevelData;
  soundEnabled: boolean;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onToggleSound: () => void;
  onSelectCharacter?: (charId: string) => void;
  onBuyCharacter?: (charId: string, price: number) => void;
  onSelectOutfit?: (outfitId: string) => void;
  onBuyOutfit?: (outfitId: string, price: number) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  savedData,
  soundEnabled,
  onStartGame,
  onOpenShop,
  onOpenSettings,
  onToggleSound,
  onSelectCharacter,
  onBuyCharacter,
  onSelectOutfit,
  onBuyOutfit,
}) => {
  // Find current character index
  const initialIndex = Math.max(
    0,
    CHARACTERS_CATALOG.findIndex((c) => c.id === savedData.selectedCharacterId)
  );
  const [currentCharIdx, setCurrentCharIdx] = useState<number>(initialIndex);
  const activeChar = CHARACTERS_CATALOG[currentCharIdx] || CHARACTERS_CATALOG[0];

  // Selected outfit for active character
  const isSelectedChar = activeChar.id === savedData.selectedCharacterId;
  const activeOutfitId = isSelectedChar ? savedData.selectedOutfitId : `${activeChar.id}_default`;
  const activeOutfit =
    activeChar.outfits.find((o) => o.id === activeOutfitId) || activeChar.outfits[0];

  const isCharUnlocked = savedData.unlockedCharacters.includes(activeChar.id);

  // 3D Canvas Ref for Hero Turntable Pedestal
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseXRef = useRef<number>(0);
  const rotationYRef = useRef<number>(0);

  // 3D Turntable Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    let width = container.clientWidth || 280;
    let height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.35, 3.7);
    camera.lookAt(0, 1.05, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lights
    const amb = new THREE.AmbientLight(0xffffff, 2.4);
    scene.add(amb);

    const dir1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dir1.position.set(5, 10, 7);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dir2.position.set(-5, 4, -5);
    scene.add(dir2);

    // Character Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Build the 3D Character Model
    buildCharacterRig(modelGroup, activeChar.id, activeOutfit.id, true);

    // Platform Pedestal with glowing ring
    const platGeo = new THREE.CylinderGeometry(1.15, 1.25, 0.08, 24);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.6,
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.y = -0.04;
    modelGroup.add(platform);

    const ringGeo = new THREE.TorusGeometry(1.22, 0.03, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: activeOutfit.glowColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    modelGroup.add(ring);

    // Touch/Mouse rotation handlers
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      rotationYRef.current += delta * 0.012;
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      const delta = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;
      rotationYRef.current += delta * 0.012;
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Resize observer for responsive canvas
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 280;
      const newH = container.clientHeight || 240;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Render loop with idle turntable rotation
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isDraggingRef.current) {
        rotationYRef.current += 0.012;
      }
      modelGroup.rotation.y = rotationYRef.current;
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [activeChar, activeOutfit]);

  // Navigate Characters
  const handlePrevChar = () => {
    soundManager.playMenuClick();
    const newIdx = (currentCharIdx - 1 + CHARACTERS_CATALOG.length) % CHARACTERS_CATALOG.length;
    setCurrentCharIdx(newIdx);
    const targetChar = CHARACTERS_CATALOG[newIdx];
    if (savedData.unlockedCharacters.includes(targetChar.id)) {
      onSelectCharacter?.(targetChar.id);
    }
  };

  const handleNextChar = () => {
    soundManager.playMenuClick();
    const newIdx = (currentCharIdx + 1) % CHARACTERS_CATALOG.length;
    setCurrentCharIdx(newIdx);
    const targetChar = CHARACTERS_CATALOG[newIdx];
    if (savedData.unlockedCharacters.includes(targetChar.id)) {
      onSelectCharacter?.(targetChar.id);
    }
  };

  const handleOutfitClick = (outfit: CharacterOutfit) => {
    if (!isCharUnlocked) return;
    const isUnlocked = savedData.unlockedOutfits.includes(outfit.id) || outfit.price === 0;
    if (isUnlocked) {
      soundManager.playCollectCoin();
      onSelectOutfit?.(outfit.id);
    } else {
      if (savedData.totalCoins >= outfit.price) {
        soundManager.playPowerup();
        onBuyOutfit?.(outfit.id, outfit.price);
      } else {
        soundManager.playHit();
      }
    }
  };

  const handleBuyCurrentChar = () => {
    if (savedData.totalCoins >= activeChar.price) {
      soundManager.playPowerup();
      onBuyCharacter?.(activeChar.id, activeChar.price);
    } else {
      soundManager.playHit();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between h-[100dvh] max-h-[100dvh] w-full max-w-md sm:max-w-lg mx-auto p-2.5 sm:p-4 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-slate-950/50 pointer-events-auto select-none overflow-hidden font-['Outfit',sans-serif]">
      {/* 1. TOP BAR: Currency, Best Record, Sound & Settings */}
      <div className="w-full flex items-center justify-between gap-2 z-10 pt-1">
        {/* Coins Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 shadow-lg shadow-amber-500/10">
          <span className="text-base leading-none">🪙</span>
          <span className="text-sm font-mono font-black text-amber-300">
            {savedData.totalCoins.toLocaleString()}
          </span>
        </div>

        {/* Best Distance & Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono font-bold text-sky-300">
            <Trophy className="w-3.5 h-3.5 text-sky-400" />
            <span>{(savedData.bestDistance || 0).toLocaleString()} m</span>
          </div>

          {/* Full Shop Button */}
          <button
            onClick={() => {
              soundManager.playMenuClick();
              onOpenShop();
            }}
            className="p-2 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 rounded-xl border border-amber-500/40 transition active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Qahramonlar Do'koni"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Do‘kon</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              soundManager.playMenuClick();
              onToggleSound();
            }}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition active:scale-95 shadow-md cursor-pointer"
            title="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              soundManager.playMenuClick();
              onOpenSettings();
            }}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition active:scale-95 shadow-md cursor-pointer"
            title="Sozlamalar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CENTER STAGE: Subway Surfers 3D Hero Carousel & Pedestal */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto relative w-full min-h-0">
        {/* Subway Surfers 3D Graffiti Logo */}
        <div className="flex flex-col items-center text-center mb-1">
          <div className="flex items-center gap-1.5 filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.8)]">
            <span
              className="text-3xl sm:text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 uppercase select-none"
              style={{
                textShadow:
                  '2px 2px 0px #1e1b4b, -2px -2px 0px #1e1b4b, 2px -2px 0px #1e1b4b, -2px 2px 0px #1e1b4b, 0 6px 12px rgba(0,0,0,0.9)',
              }}
            >
              SUBWAY
            </span>
            <span
              className="text-3xl sm:text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-sky-300 via-cyan-400 to-blue-500 uppercase select-none"
              style={{
                textShadow:
                  '2px 2px 0px #1e1b4b, -2px -2px 0px #1e1b4b, 2px -2px 0px #1e1b4b, -2px 2px 0px #1e1b4b, 0 6px 12px rgba(0,0,0,0.9)',
              }}
            >
              SURFERS
            </span>
          </div>

          <div className="inline-flex items-center gap-1 px-3 py-0.5 mt-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold shadow-md">
            <span>🚨 POLISSIYA QUVALAMOQDA!</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5 drop-shadow-md flex items-center gap-1.5">
            <span>{activeChar.name}</span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({currentCharIdx + 1}/{CHARACTERS_CATALOG.length})
            </span>
          </h2>

          <div className="text-[11px] sm:text-xs font-medium text-slate-300 max-w-xs truncate">
            {activeChar.role}
          </div>

          {/* Lock / Buy status banner */}
          {!isCharUnlocked && (
            <button
              onClick={handleBuyCurrentChar}
              className="mt-1 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-amber-500/40 flex items-center gap-1.5 active:scale-95 cursor-pointer transition animate-bounce"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>OCHISH: 🪙 {activeChar.price.toLocaleString()} TANGA</span>
            </button>
          )}
        </div>

        {/* 3D Model Display with Left/Right Arrows */}
        <div className="relative w-full flex items-center justify-center my-0.5">
          {/* Left Arrow */}
          <button
            onClick={handlePrevChar}
            className="absolute left-1 sm:left-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 transition cursor-pointer"
            aria-label="Oldingi qahramon"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 3D Turntable Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="w-full h-[22vh] sm:h-[28vh] min-h-[140px] max-h-[260px] rounded-3xl flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden"
          />

          {/* Right Arrow */}
          <button
            onClick={handleNextChar}
            className="absolute right-1 sm:right-3 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 transition cursor-pointer"
            aria-label="Keyingi qahramon"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* ALL 22 SUBWAY SURFERS CREW QUICK ROSTER BAR */}
        <div className="w-full max-w-md mb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar">
            {CHARACTERS_CATALOG.map((char, idx) => {
              const unlocked = savedData.unlockedCharacters.includes(char.id);
              const isCurrent = idx === currentCharIdx;
              const defaultColor = `#${char.outfits[0].suitColor.toString(16).padStart(6, '0')}`;
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    soundManager.playMenuClick();
                    setCurrentCharIdx(idx);
                    if (unlocked) {
                      onSelectCharacter?.(char.id);
                    }
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 scale-105'
                      : unlocked
                      ? 'bg-slate-900/85 text-slate-200 border-slate-700 hover:border-slate-500'
                      : 'bg-slate-950/75 text-slate-400 border-slate-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/50 flex-shrink-0"
                    style={{ backgroundColor: defaultColor }}
                  />
                  <span>{char.name}</span>
                  {!unlocked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. OUTFIT SWITCHER RACK ("ushani atrofida kiyimalmashtirish") */}
        <div className="w-full max-w-sm mt-0.5 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-300 font-bold mb-1">
            <Shirt className="w-3.5 h-3.5 text-sky-400" />
            <span>KIYIMLARNI ALMASHTIRISH ({activeChar.outfits.length} XIL)</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full">
            {activeChar.outfits.map((outfit) => {
              const isEquipped = isSelectedChar && savedData.selectedOutfitId === outfit.id;
              const isUnlocked =
                isCharUnlocked &&
                (savedData.unlockedOutfits.includes(outfit.id) || outfit.price === 0);

              return (
                <button
                  key={outfit.id}
                  onClick={() => handleOutfitClick(outfit)}
                  disabled={!isCharUnlocked}
                  className={`flex flex-col items-center justify-between p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isEquipped
                      ? 'bg-sky-500/25 border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/20'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                      : 'bg-slate-950/60 border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Swatch Dot */}
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white/40 flex items-center justify-center shadow-sm mb-0.5"
                    style={{ backgroundColor: `#${outfit.suitColor.toString(16).padStart(6, '0')}` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `#${outfit.glowColor.toString(16).padStart(6, '0')}` }}
                    />
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 line-clamp-1 truncate w-full">
                    {outfit.name}
                  </span>

                  {/* Status Indicator */}
                  <div className="mt-0.5 text-[9px] font-mono font-bold">
                    {isEquipped ? (
                      <span className="text-emerald-400 flex items-center justify-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        Kiyilgan
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-sky-300">Kiyish</span>
                    ) : (
                      <span className="text-amber-400 flex items-center justify-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        {outfit.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ACTION AREA: Subway Surfers Iconic "TAP TO PLAY" */}
      <div className="w-full flex flex-col items-center gap-1 pb-1 sm:pb-2 z-10">
        <button
          onClick={() => {
            soundManager.playPowerup();
            onStartGame();
          }}
          className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-b from-lime-400 via-emerald-500 to-green-600 hover:from-lime-300 hover:via-emerald-400 hover:to-green-500 text-white font-black text-lg sm:text-2xl rounded-2xl shadow-[0_6px_0_#14532d,0_12px_25px_rgba(34,197,94,0.6)] flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 active:translate-y-1 cursor-pointer border-2 border-lime-300/80 animate-pulse"
        >
          <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white drop-shadow" />
          <span className="tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-['Outfit',sans-serif]">
            BOSING VA YUGURING!
          </span>
        </button>

        {/* Subtitle / Controls Hint */}
        <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono text-amber-200/90 px-1 pt-0.5">
          <span>📱 Telefon: Ekranni suring (Swipe)</span>
          <span>💻 Noutbuk: ⬆️⬇️⬅️➡️ / WASD</span>
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
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs pointer-events-auto">
      <div className="relative bg-white border-4 border-[#1d4ed8] rounded-3xl p-6 sm:p-7 w-full max-w-sm flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
        {/* Top-left Subway Surfers Stopwatch Badge (Matching Image 4) */}
        <div className="absolute -top-6 -left-4 w-16 h-16 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 p-1.5 shadow-xl border-2 border-white flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-sky-400 border-2 border-blue-900 flex items-center justify-center text-white font-black text-lg">
            ⏱️
          </div>
        </div>

        <h2
          className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white mt-2"
          style={{
            textShadow:
              '2px 2px 0px #1e3a8a, -2px -2px 0px #1e3a8a, 2px -2px 0px #1e3a8a, -2px 2px 0px #1e3a8a',
          }}
        >
          USHlandi!
        </h2>
        <p className="text-xs font-bold text-slate-600 mt-1">
          Inspektor va uning kuchukchasi sizni yetib oldi!
        </p>

        {/* Stats Grid */}
        <div className="w-full bg-slate-100 border-2 border-slate-300 rounded-2xl p-3.5 grid grid-cols-2 gap-3 my-4">
          <div className="text-left">
            <div className="text-[10px] font-mono text-slate-500 uppercase font-black">BALL (SCORE)</div>
            <div className="text-xl font-mono font-black text-blue-700">
              {stats.score.toLocaleString()}
            </div>
            {isNewHigh && (
              <div className="text-[9px] font-black text-emerald-600 uppercase">
                ★ YANGI REKORD!
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500 uppercase font-black">TANGALAR</div>
            <div className="text-xl font-mono font-black text-amber-600">
              +{stats.coins} 🪙
            </div>
          </div>
        </div>

        {/* Subway Surfers Blue & Green Action Buttons (Matching Image 4) */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full py-3.5 bg-gradient-to-b from-lime-400 to-green-600 hover:from-lime-300 hover:to-green-500 text-white font-black text-lg rounded-2xl border-2 border-green-800 shadow-[0_5px_0_#14532d] flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            <span>QAYTA YUGURISH!</span>
          </button>

          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="w-full py-3 bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-black text-sm rounded-2xl border-2 border-blue-900 shadow-[0_4px_0_#1e3a8a] transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-yellow-300" />
              <span>QAHRAMONLAR DO‘KONI</span>
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
