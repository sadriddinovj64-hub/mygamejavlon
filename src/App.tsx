import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSettings, GameState, PlayerStats, SavedLevelData } from './types/game';
import { getLevelConfig } from './utils/levelGenerator';
import { soundManager } from './utils/audio';
import { HUD } from './components/HUD';
import { GameControls } from './components/GameControls';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
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
        return JSON.parse(item);
      }
    } catch {
      // ignore
    }
    return {
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.8,
      musicVolume: 0.35,
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

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);

  // Touch Swipe tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
  const startOrRestartEngine = useCallback(() => {
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

    engineRef.current = engine;
  }, [handleGameOver, handleDamageFlash, settings.quality, savedData.selectedCharacterId, savedData.selectedOutfitId]);

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

  // Initialize preview run or start game
  useEffect(() => {
    startOrRestartEngine();
  }, [startOrRestartEngine]);

  // Start Playing
  const handleStartGame = () => {
    setGameState('PLAYING');
    startOrRestartEngine();
    if (settings.musicEnabled) {
      soundManager.startMusic();
    }
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
    startOrRestartEngine();
  };

  const [activeControlKey, setActiveControlKey] = useState<string | null>(null);

  // Keyboard controls with full Latin, Cyrillic, and Arrow/Space key support
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

      // Chap (Left)
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || key === 'ф') {
        e.preventDefault();
        setActiveControlKey('left');
        engineRef.current.moveLeft();
      }
      // O'ng (Right)
      else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || key === 'в') {
        e.preventDefault();
        setActiveControlKey('right');
        engineRef.current.moveRight();
      }
      // Tepa: Sakrash (Jump)
      else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space' || key === 'w' || key === 'arrowup' || key === ' ' || key === 'ц') {
        e.preventDefault();
        setActiveControlKey('jump');
        engineRef.current.jump();
      }
      // Past: Sirg'anish (Slide)
      else if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || key === 'ы') {
        e.preventDefault();
        setActiveControlKey('slide');
        engineRef.current.slide();
      }
    };

    const handleKeyUp = () => {
      setActiveControlKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Touch Swipe Handlers for mobile & Yandex Browser touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !engineRef.current || gameState !== 'PLAYING') return;

    const touchEnd = e.changedTouches[0];
    const dx = touchEnd.clientX - touchStartRef.current.x;
    const dy = touchEnd.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const minSwipe = 28;

    if (Math.max(absDx, absDy) > minSwipe) {
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx < 0) engineRef.current.moveLeft();
        else engineRef.current.moveRight();
      } else {
        // Vertical swipe
        if (dy < 0) engineRef.current.jump();
        else engineRef.current.slide();
      }
    }

    touchStartRef.current = null;
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Outfit',sans-serif] select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Three.js WebGL Canvas Mount Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Screen Damage Vignette Flash */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 bg-rose-600/30 ring-inset ring-8 ring-rose-500/50 ${
          damageFlash ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Active Game HUD */}
      {gameState === 'PLAYING' && (
        <>
          <HUD
            stats={stats}
            levelConfig={levelConfig}
            highScore={savedData.highScore}
            onPause={handlePause}
            onOpenShop={() => setIsShopOpen(true)}
          />
          <GameControls
            onLeft={() => engineRef.current?.moveLeft()}
            onRight={() => engineRef.current?.moveRight()}
            onJump={() => engineRef.current?.jump()}
            onSlide={() => engineRef.current?.slide()}
            activeKey={activeControlKey}
          />
        </>
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
    </div>
  );
}
