import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSettings, GameState, PlayerStats, SavedLevelData } from './types/game';
import { getLevelConfig } from './utils/levelGenerator';
import { soundManager } from './utils/audio';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { IntroAnimation } from './components/IntroAnimation';
import {
  StartScreen,
  PauseScreen,
  GameOverScreen,
} from './components/Screens';

const LOCAL_STORAGE_KEY = 'apex_runner_3d_save_v1';
const SETTINGS_STORAGE_KEY = 'apex_runner_3d_settings_v1';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistence State
  const [savedData, setSavedData] = useState<SavedLevelData>(() => {
    try {
      const item = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          unlockedLevel: parsed.unlockedLevel || 1,
          highScore: parsed.highScore || 0,
          bestDistance: parsed.bestDistance || 0,
          totalCoins: parsed.totalCoins || 0,
          levelStars: parsed.levelStars || {},
          levelScores: parsed.levelScores || {},
          selectedCharacterId: parsed.selectedCharacterId || 'bolt',
          selectedOutfitId: parsed.selectedOutfitId || 'bolt_default',
          unlockedCharacters: parsed.unlockedCharacters || ['bolt'],
          unlockedOutfits: parsed.unlockedOutfits || ['bolt_default', 'titan_default', 'valkyrie_default', 'shinobi_default', 'paladin_default'],
        };
      }
    } catch {
      // ignore
    }
    return {
      unlockedLevel: 1,
      highScore: 0,
      bestDistance: 0,
      totalCoins: 0,
      levelStars: {},
      levelScores: {},
      selectedCharacterId: 'bolt',
      selectedOutfitId: 'bolt_default',
      unlockedCharacters: ['bolt'],
      unlockedOutfits: ['bolt_default', 'titan_default', 'valkyrie_default', 'shinobi_default', 'paladin_default'],
    };
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const item = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          ...parsed,
          soundEnabled: true,
          musicEnabled: false,
          soundVolume: 0.95,
          musicVolume: 0,
        };
      }
    } catch {
      // ignore
    }
    return {
      soundEnabled: true,
      musicEnabled: false,
      soundVolume: 0.95,
      musicVolume: 0,
      quality: 'high',
    };
  });

  // Game Engine & UI State
  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    coins: 0,
    distance: 0,
    health: 3,
    maxHealth: 3,
    multiplier: 1,
    activePowerup: 'none',
    powerupTimeRemaining: 0,
    stars: 0,
    chaserClose: false,
    currentBiomeName: 'Yashil O\'rmon',
  });

  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);

  // Touch & Mouse Swipe tracking (Subway Surfers instant swipe)
  const touchStartRef = useRef<{ x: number; y: number; swiped: boolean } | null>(null);

  const levelConfig = getLevelConfig(1);

  // Sync sound settings with audio engine
  useEffect(() => {
    soundManager.toggleSfx(settings.soundEnabled);
    soundManager.toggleMusic(settings.musicEnabled);
    soundManager.setSfxVolume(settings.soundVolume);
    soundManager.setMusicVolume(settings.musicVolume);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Persist game progress
  const saveProgress = useCallback((newSave: SavedLevelData) => {
    setSavedData(newSave);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSave));
    } catch {
      // ignore
    }
  }, []);

  // Damage Flash trigger
  const handleDamageFlash = useCallback(() => {
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 220);
  }, []);

  // Game Over callback
  const handleGameOver = useCallback(
    (finalStats: PlayerStats) => {
      const isRecord = finalStats.score > savedData.highScore;
      setIsNewHigh(isRecord);

      const newBestDist = Math.max(savedData.bestDistance || 0, finalStats.distance);
      const newHighSc = Math.max(savedData.highScore, finalStats.score);

      saveProgress({
        ...savedData,
        highScore: newHighSc,
        bestDistance: newBestDist,
        totalCoins: savedData.totalCoins + finalStats.coins,
      });

      setGameState('GAMEOVER');
    },
    [savedData, saveProgress]
  );

  // Cleanup & Initialize 3D Engine for Endless Run
  const startOrRestartEngine = useCallback(
    (isLobby: boolean = false) => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }

      if (!containerRef.current) return;

      const cfg = {
        ...getLevelConfig(1),
        targetDistance: Infinity,
      };

      const engine = new GameEngine(
        containerRef.current,
        cfg,
        {
          onStatsUpdate: (newStats) => setStats(newStats),
          onHealthUpdate: (health) => {
            setStats((prev) => ({ ...prev, health }));
          },
          onLevelComplete: () => {},
          onGameOver: handleGameOver,
          onDamageFlash: handleDamageFlash,
        },
        settings.quality,
        savedData.selectedCharacterId || 'bolt',
        savedData.selectedOutfitId || 'bolt_default'
      );

      if (isLobby) {
        engine.setLobbyMode(true);
      }

      engineRef.current = engine;
    },
    [handleGameOver, handleDamageFlash, settings.quality, savedData.selectedCharacterId, savedData.selectedOutfitId]
  );

  // Shop Handlers
  const handleBuyCharacter = (charId: string, price: number) => {
    const newCoins = Math.max(0, savedData.totalCoins - price);
    const newUnlockedChars = savedData.unlockedCharacters.includes(charId)
      ? savedData.unlockedCharacters
      : [...savedData.unlockedCharacters, charId];
    const defaultOutfit = `${charId}_default`;
    const newUnlockedOutfits = savedData.unlockedOutfits.includes(defaultOutfit)
      ? savedData.unlockedOutfits
      : [...savedData.unlockedOutfits, defaultOutfit];

    const updated: SavedLevelData = {
      ...savedData,
      totalCoins: newCoins,
      unlockedCharacters: newUnlockedChars,
      unlockedOutfits: newUnlockedOutfits,
      selectedCharacterId: charId,
      selectedOutfitId: defaultOutfit,
    };

    saveProgress(updated);
    engineRef.current?.updateCharacter(charId, defaultOutfit);
  };

  const handleSelectCharacter = (charId: string) => {
    const defaultOutfit = `${charId}_default`;
    const outfitToEquip =
      savedData.unlockedOutfits.includes(savedData.selectedOutfitId) &&
      savedData.selectedOutfitId.startsWith(charId)
        ? savedData.selectedOutfitId
        : defaultOutfit;

    const updated: SavedLevelData = {
      ...savedData,
      selectedCharacterId: charId,
      selectedOutfitId: outfitToEquip,
    };

    saveProgress(updated);
    engineRef.current?.updateCharacter(charId, outfitToEquip);
  };

  const handleBuyOutfit = (outfitId: string, price: number) => {
    const newCoins = Math.max(0, savedData.totalCoins - price);
    const newUnlockedOutfits = savedData.unlockedOutfits.includes(outfitId)
      ? savedData.unlockedOutfits
      : [...savedData.unlockedOutfits, outfitId];

    const updated: SavedLevelData = {
      ...savedData,
      totalCoins: newCoins,
      unlockedOutfits: newUnlockedOutfits,
      selectedOutfitId: outfitId,
    };

    saveProgress(updated);
    engineRef.current?.updateCharacter(savedData.selectedCharacterId, outfitId);
  };

  const handleSelectOutfit = (outfitId: string) => {
    const updated: SavedLevelData = {
      ...savedData,
      selectedOutfitId: outfitId,
    };

    saveProgress(updated);
    engineRef.current?.updateCharacter(savedData.selectedCharacterId, outfitId);
  };

  // Clean up engine on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      soundManager.stopMusic();
    };
  }, []);

  // Initialize 3D Lobby Preview on first mount
  useEffect(() => {
    startOrRestartEngine(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start Playing
  const handleStartGame = () => {
    setGameState('PLAYING');
    startOrRestartEngine(false);
    soundManager.stopMusic();
  };

  // Pause & Resume
  const handlePause = () => {
    if (gameState === 'PLAYING') {
      engineRef.current?.pause();
      setGameState('PAUSED');
    }
  };

  const handleResume = () => {
    if (gameState === 'PAUSED') {
      engineRef.current?.resume();
      setGameState('PLAYING');
    }
  };

  // Restart Run
  const handleRestartLevel = () => {
    setGameState('PLAYING');
    startOrRestartEngine(false);
  };

  // Keyboard controls for Laptop / Desktop (Arrow Keys + WASD + Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (gameState === 'PLAYING') handlePause();
        else if (gameState === 'PAUSED') handleResume();
        return;
      }

      if (gameState !== 'PLAYING' || !engineRef.current) return;

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      // Chap (Left: ArrowLeft or A)
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || key === 'ф') {
        e.preventDefault();
        engineRef.current.moveLeft();
      }
      // O'ng (Right: ArrowRight or D)
      else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || key === 'в') {
        e.preventDefault();
        engineRef.current.moveRight();
      }
      // Tepa: Sakrash (Jump: ArrowUp, W, or Space)
      else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space' || key === 'w' || key === 'arrowup' || key === ' ' || key === 'ц') {
        e.preventDefault();
        engineRef.current.jump();
      }
      // Past: Sirg'anish (Slide: ArrowDown or S)
      else if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || key === 'ы') {
        e.preventDefault();
        engineRef.current.slide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState]);

  // Execute directional swipe action
  const executeSwipeDelta = (dx: number, dy: number): boolean => {
    if (!engineRef.current || gameState !== 'PLAYING') return false;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minSwipe = 22; // Instant, responsive Subway Surfers swipe threshold

    if (Math.max(absDx, absDy) >= minSwipe) {
      if (absDx > absDy) {
        if (dx < 0) engineRef.current.moveLeft();
        else engineRef.current.moveRight();
      } else {
        if (dy < 0) engineRef.current.jump();
        else engineRef.current.slide();
      }
      return true;
    }
    return false;
  };

  // Instant Touch Swipe Handlers for Mobile Phones (Subway Surfers 1:1)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        swiped: false,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || touchStartRef.current.swiped || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (executeSwipeDelta(dx, dy)) {
      touchStartRef.current.swiped = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (!touchStartRef.current.swiped && e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      executeSwipeDelta(dx, dy);
    }
    touchStartRef.current = null;
  };

  // Mouse drag swipe fallback for desktop touchpads/screens
  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameState !== 'PLAYING') return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, swiped: false };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStartRef.current || touchStartRef.current.swiped) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    if (executeSwipeDelta(dx, dy)) {
      touchStartRef.current.swiped = true;
    }
  };

  const handleMouseUp = () => {
    touchStartRef.current = null;
  };

  return (
    <div
      className="relative w-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 font-['Outfit',sans-serif] select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Three.js WebGL Canvas Mount Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Screen Damage Vignette Flash */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 bg-rose-600/30 ring-inset ring-8 ring-rose-500/50 ${
          damageFlash ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Active Game HUD (Clean Subway Surfers Screen — No On-Screen Arrow Buttons!) */}
      {gameState === 'PLAYING' && (
        <HUD
          stats={stats}
          levelConfig={levelConfig}
          highScore={savedData.highScore}
          soundEnabled={settings.soundEnabled}
          onPause={handlePause}
          onOpenShop={() => setIsShopOpen(true)}
          onToggleSound={() =>
            setSettings((s) => {
              const next = !s.soundEnabled;
              return { ...s, soundEnabled: next, musicEnabled: next };
            })
          }
        />
      )}

      {/* Overlay Screens */}
      {gameState === 'START' && (
        <StartScreen
          currentLevel={1}
          levelConfig={levelConfig}
          savedData={savedData}
          soundEnabled={settings.soundEnabled}
          onStartGame={handleStartGame}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSound={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
          onSelectCharacter={handleSelectCharacter}
          onBuyCharacter={handleBuyCharacter}
          onSelectOutfit={handleSelectOutfit}
          onBuyOutfit={handleBuyOutfit}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseScreen
          currentLevel={1}
          onResume={handleResume}
          onRestart={handleRestartLevel}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {gameState === 'GAMEOVER' && (
        <GameOverScreen
          levelConfig={levelConfig}
          stats={stats}
          isNewHigh={isNewHigh}
          onRestart={handleRestartLevel}
          onOpenShop={() => setIsShopOpen(true)}
        />
      )}

      {/* Shop Modal: Qahramonlar va Kiyimlar */}
      {isShopOpen && (
        <ShopModal
          totalCoins={savedData.totalCoins}
          selectedCharacterId={savedData.selectedCharacterId}
          selectedOutfitId={savedData.selectedOutfitId}
          unlockedCharacters={savedData.unlockedCharacters}
          unlockedOutfits={savedData.unlockedOutfits}
          onBuyCharacter={handleBuyCharacter}
          onSelectCharacter={handleSelectCharacter}
          onBuyOutfit={handleBuyOutfit}
          onSelectOutfit={handleSelectOutfit}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* Settings & Controls Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Intro Opening Cinematic Animation */}
      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} />
      )}
    </div>
  );
}
