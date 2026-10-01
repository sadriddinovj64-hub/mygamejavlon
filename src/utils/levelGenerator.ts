import { BiomeTheme, LevelConfig } from '../types/game';

export const BIOMES: Record<string, BiomeTheme> = {
  cyber: {
    id: 'cyber',
    name: 'Neon Cyber Grid',
    skyColor: 0x38bdf8,      // Bright clear sky blue
    fogColor: 0xbae6fd,      // Luminous bright atmospheric haze
    groundColor: 0x22c55e,   // Vibrant emerald green ground
    roadColor: 0x334155,     // Crisp clean highway asphalt
    laneColor: 0x00f0ff,     // Glowing cyan lane markers
    curbColor: 0xf43f5e,     // Radiant magenta curb
    accentColor: 0x00f0ff,   // Bright cyan accent
    ambientColor: 0xffffff,  // Pure bright white ambient
    sunColor: 0xfffbeb,      // Bright warm sunlight
    sceneryType: 'cyber',
  },
  forest: {
    id: 'forest',
    name: 'Emerald Rainforest',
    skyColor: 0x60a5fa,      // Sunny azure blue
    fogColor: 0xbbf7d0,      // Sunlit lush mist
    groundColor: 0x16a34a,   // Rich green meadow
    roadColor: 0x475569,     // Paved stone highway
    laneColor: 0xfacc15,     // Bright yellow road lines
    curbColor: 0x15803d,     // Forest green curb
    accentColor: 0x4ade80,   // Fresh mint accent
    ambientColor: 0xffffff,  // 100% white ambient light
    sunColor: 0xffedd5,      // Golden sunlight
    sceneryType: 'forest',
  },
  desert: {
    id: 'desert',
    name: 'Golden Dune Oasis',
    skyColor: 0x38bdf8,      // Clear desert sky
    fogColor: 0xfef08a,      // Radiant golden glow
    groundColor: 0xfacc15,   // Bright sunny golden sand
    roadColor: 0x64748b,     // Desert express highway
    laneColor: 0xffffff,     // Pure white markings
    curbColor: 0xd97706,     // Warm amber curb
    accentColor: 0xf59e0b,   // Golden orange accent
    ambientColor: 0xffffff,  // Bright ambient
    sunColor: 0xffedd5,      // Warm sun
    sceneryType: 'desert',
  },
  arctic: {
    id: 'arctic',
    name: 'Frostwind Glacier',
    skyColor: 0x93c5fd,      // Brilliant polar blue
    fogColor: 0xe0f2fe,      // Sparkling white snow atmosphere
    groundColor: 0xf8fafc,   // Pure sparkling snow
    roadColor: 0x0284c7,     // Radiant crystal blue ice road
    laneColor: 0xffffff,     // Pure white markers
    curbColor: 0x0369a1,     // Deep glacier blue curb
    accentColor: 0x38bdf8,   // Cyan sparkle
    ambientColor: 0xffffff,  // Maximum brightness
    sunColor: 0xffffff,      // Pure daylight
    sceneryType: 'arctic',
  },
  volcano: {
    id: 'volcano',
    name: 'Magma Canyon',
    skyColor: 0xfb923c,      // Bright radiant orange sky
    fogColor: 0xfed7aa,      // Warm golden sunlit haze
    groundColor: 0x9a3412,   // Warm canyon stone
    roadColor: 0x475569,     // Clean paved asphalt
    laneColor: 0xffedd5,     // Glowing bright lines
    curbColor: 0xea580c,     // Fiery orange curb
    accentColor: 0xf97316,   // Bright flame accent
    ambientColor: 0xffffff,  // Bright ambient
    sunColor: 0xffedd5,      // Golden sun
    sceneryType: 'volcano',
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Blossom Valley',
    skyColor: 0x7dd3fc,      // Bright clear spring sky
    fogColor: 0xfce7f3,      // Delicate pink luminous mist
    groundColor: 0x4ade80,   // Fresh spring lawn
    roadColor: 0x64748b,     // Clean paving
    laneColor: 0xf472b6,     // Cherry blossom pink stripes
    curbColor: 0xec4899,     // Deep sakura curb
    accentColor: 0xf472b6,   // Pink glow
    ambientColor: 0xffffff,  // Bright ambient
    sunColor: 0xfff1f2,      // Warm soft sunlight
    sceneryType: 'sakura',
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Cavern Ridge',
    skyColor: 0x818cf8,      // Radiant indigo-violet daylight
    fogColor: 0xf5d0fe,      // Luminous bright amethyst haze
    groundColor: 0xc084fc,   // Vibrant lilac field
    roadColor: 0x475569,     // Smooth paved road
    laneColor: 0x00f0ff,     // Electric glowing cyan
    curbColor: 0x9333ea,     // Deep purple crystal curb
    accentColor: 0xd8b4fe,   // Bright crystal accent
    ambientColor: 0xffffff,  // Full ambient brightness
    sunColor: 0xfdf4ff,      // Crystal sunlight
    sceneryType: 'crystal',
  },
  metropolis: {
    id: 'metropolis',
    name: 'Apex Skyline City',
    skyColor: 0x38bdf8,      // Crisp sunny metropolis sky
    fogColor: 0xe0f2fe,      // Crystal clear skyline air
    groundColor: 0x86efac,   // Lush green parkways
    roadColor: 0x334155,     // Modern clean expressway
    laneColor: 0xfacc15,     // Bright yellow highway stripes
    curbColor: 0x0284c7,     // Electric blue curb
    accentColor: 0x38bdf8,   // Skyline cyan accent
    ambientColor: 0xffffff,  // 100% white ambient light
    sunColor: 0xfffbeb,      // Bright sun
    sceneryType: 'metropolis',
  },
  autumn: {
    id: 'autumn',
    name: 'Amber Ridge Valley',
    skyColor: 0x60a5fa,      // Crisp blue autumn morning sky
    fogColor: 0xfef3c7,      // Sunlit golden haze
    groundColor: 0xf59e0b,   // Golden-amber autumn foliage
    roadColor: 0x52525b,     // Clean paved mountain road
    laneColor: 0xffedd5,     // Bright ivory road stripes
    curbColor: 0xb45309,     // Russet autumn curb
    accentColor: 0xf59e0b,   // Warm amber accent
    ambientColor: 0xffffff,  // Bright ambient
    sunColor: 0xfef9c3,      // Golden morning sun
    sceneryType: 'autumn',
  },
  cosmic: {
    id: 'cosmic',
    name: 'Omega Hyperzone',
    skyColor: 0x6366f1,      // Radiant celestial sapphire sky
    fogColor: 0xe0e7ff,      // Pearlescent luminous atmosphere
    groundColor: 0x38bdf8,   // Glowing diamond grid
    roadColor: 0x1e1b4b,     // Deep radiant velvet highway
    laneColor: 0xf43f5e,     // Intense neon laser lines
    curbColor: 0xec4899,     // Radiant pink borders
    accentColor: 0x38bdf8,   // Supernova cyan
    ambientColor: 0xffffff,  // Radiant brightness
    sunColor: 0xffffff,      // Pure celestial brilliance
    sceneryType: 'cosmic',
  },
};

export const BIOME_KEYS: (keyof typeof BIOMES)[] = [
  'forest',     // Level 1-50: Emerald Parkland & Lush Trees!
  'sakura',     // Level 51-100: Sakura Blossom Trees & Gardens!
  'autumn',     // Level 101-150: Golden Autumn Ridge & Amber Trees!
  'cyber',      // Level 151-200: Neon Garden & Solar Groves
  'desert',     // Level 201-250: Oasis Palm Groves & Golden Dunes
  'arctic',     // Level 251-300: Frostwind Glaciers & Snowy Pines
  'crystal',    // Level 301-350: Luminous Crystal Cavern
  'metropolis', // Level 351-400: Modern Skyline City Gardens
  'volcano',    // Level 401-450: Crimson Sun Canyon
  'cosmic',     // Level 451-500: Omega Finale
];

/**
 * Returns complete configuration for any level from 1 to 500.
 */
export function getLevelConfig(levelNumber: number): LevelConfig {
  const level = Math.max(1, Math.min(500, Math.floor(levelNumber)));
  const progressRatio = (level - 1) / 499; // 0.0 to 1.0

  let biomeKey: keyof typeof BIOMES;
  if (level === 500) {
    biomeKey = 'cosmic'; // Level 500 is always the climax Omega Hyperzone
  } else {
    const chapter = Math.floor((level - 1) / 50) % BIOME_KEYS.length;
    biomeKey = BIOME_KEYS[chapter];
  }
  const biome = BIOMES[biomeKey];

  // Target Distance: Level 1 = 450m, Level 500 = 3600m
  const targetDistance = Math.round(450 + Math.pow(progressRatio, 0.85) * 3150);

  // Base Speed: Level 1 = 20 m/s, Level 500 = 33 m/s
  const baseSpeed = Number((20 + progressRatio * 13).toFixed(1));

  // Obstacle density: scales from 0.45 to 1.15
  const obstacleDensity = Number((0.45 + progressRatio * 0.7).toFixed(2));

  // Chances for advanced obstacles
  const movingObstacleChance = Math.min(0.45, Number((progressRatio * 0.45).toFixed(2)));
  const highLowBarrierChance = Math.min(0.55, Number((0.15 + progressRatio * 0.4).toFixed(2)));

  // Coin clusters & power-up frequency
  const coinClusterChance = Number((0.75 - progressRatio * 0.25).toFixed(2));
  const powerupChance = Number((0.25 - progressRatio * 0.08).toFixed(2));

  let title = `Level ${level}: ${biome.name}`;
  if (level === 1) title = 'Level 1: Sunny Sprint';
  else if (level === 50) title = 'Level 50: Sector Milestone';
  else if (level === 100) title = 'Level 100: Century Sprint';
  else if (level === 250) title = 'Level 250: Halfway Odyssey';
  else if (level === 400) title = 'Level 400: Master Gauntlet';
  else if (level === 500) title = 'Level 500: The Omega Finale';

  return {
    level,
    title,
    targetDistance,
    baseSpeed,
    obstacleDensity,
    movingObstacleChance,
    highLowBarrierChance,
    coinClusterChance,
    powerupChance,
    biome,
  };
}
