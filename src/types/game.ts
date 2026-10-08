export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_COMPLETE' | 'VICTORY';

export type BiomeType = 
  | 'cyber'      // Neon Cyberpunk
  | 'forest'     // Emerald Rainforest
  | 'desert'     // Golden Dunes
  | 'arctic'     // Frostwind Tundra
  | 'volcano'    // Magma Gorge
  | 'sakura'     // Sakura Blossom
  | 'crystal'    // Crystal Cavern
  | 'metropolis' // Modern Skyline
  | 'autumn'     // Golden Autumn
  | 'cosmic';    // Cosmic Starlight (The Omega zone)

export interface BiomeTheme {
  id: BiomeType;
  name: string;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  roadColor: number;
  laneColor: number;
  curbColor: number;
  accentColor: number;
  ambientColor: number;
  sunColor: number;
  sceneryType: BiomeType;
}

export interface LevelConfig {
  level: number;
  title: string;
  targetDistance: number;    // meters to finish line
  baseSpeed: number;         // m/s forward speed
  obstacleDensity: number;   // 0.3 - 1.2
  movingObstacleChance: number;
  highLowBarrierChance: number;
  coinClusterChance: number;
  powerupChance: number;
  biome: BiomeTheme;
}

export type PowerupType = 'none' | 'magnet' | 'shield' | 'boost' | 'sneakers' | 'jetpack' | 'hoverboard' | '2x';

export interface PlayerStats {
  score: number;
  coins: number;
  distance: number;
  health: number;
  maxHealth: number;
  multiplier: number;
  activePowerup: PowerupType;
  powerupTimeRemaining: number;
  stars: number;
  chaserClose: boolean;
  currentBiomeName: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  quality: 'high' | 'medium' | 'low';
}

export interface SavedLevelData {
  unlockedLevel: number;
  highScore: number;
  bestDistance: number;
  totalCoins: number;
  levelStars: Record<number, number>; // level -> stars (1-3)
  levelScores: Record<number, number>; // level -> best score
  selectedCharacterId: string;
  selectedOutfitId: string;
  unlockedCharacters: string[];
  unlockedOutfits: string[];
}
