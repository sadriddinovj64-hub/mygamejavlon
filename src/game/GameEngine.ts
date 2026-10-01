import * as THREE from 'three';
import { BiomeTheme, LevelConfig, PlayerStats, PowerupType } from '../types/game';
import { CHARACTERS_CATALOG } from '../types/character';
import { BIOMES, BIOME_KEYS } from '../utils/levelGenerator';
import { soundManager } from '../utils/audio';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onHealthUpdate: (health: number) => void;
  onLevelComplete: (stats: PlayerStats) => void;
  onGameOver: (stats: PlayerStats) => void;
  onDamageFlash: () => void;
}

const LANES = [2.6, 0, -2.6]; // Index 0: Chap (Screen Left, +X), Index 1: Markaz (Center, 0), Index 2: O'ng (Screen Right, -X)
const SEGMENT_LENGTH = 36;
const VISIBLE_SEGMENTS = 9; // ~324 meters ahead

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;
  private levelConfig: LevelConfig;
  private quality: 'high' | 'medium' | 'low';
  private characterId: string = 'bolt';
  private outfitId: string = 'bolt_default';

  // Three.js Core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private isDestroyed: boolean = false;
  private isPaused: boolean = false;

  // Lighting & Environment
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;

  // Player 3D Hierarchy
  private playerGroup!: THREE.Group;
  private playerBodyGroup!: THREE.Group;
  private headMesh!: THREE.Mesh;
  private torsoMesh!: THREE.Mesh;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;
  private shadowMesh!: THREE.Mesh;
  private shieldSphereMesh!: THREE.Mesh;

  // Player Physics & State
  private targetLaneIndex: number = 1; // 0, 1, 2
  private playerX: number = 0;
  private playerY: number = 0;
  private playerZ: number = 0;
  private jumpVelocity: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private invulnerableTimer: number = 0;
  private runAnimTime: number = 0;

  // Pursuer / Chaser (Orqadan quvlovchi maxluq / Beast Guard)
  // Pursuer / Chaser (Police Officer / Politsiyachi)
  private chaserGroup!: THREE.Group;
  private chaserBodyGroup!: THREE.Group;
  private chaserLeftArmGroup!: THREE.Group;
  private chaserRightArmGroup!: THREE.Group;
  private chaserLeftLegGroup!: THREE.Group;
  private chaserRightLegGroup!: THREE.Group;
  private chaserDistance: number = 3.6;
  private targetChaserDistance: number = 3.6;
  private chaserAnimTime: number = 0;
  private chaserStompTimer: number = 0;
  private chaserDurationTimer: number = 5.0;
  private chaserActive: boolean = true;

  // Active Powerups
  private activePowerup: PowerupType = 'none';
  private powerupTimer: number = 0;

  // Gameplay State
  private health: number = 3;
  private maxHealth: number = 3;
  private score: number = 0;
  private coins: number = 0;
  private multiplier: number = 1;
  private currentSpeed: number = 20;
  private isLevelFinished: boolean = false;
  private isGameOverState: boolean = false;

  // Track & Environment Pooling
  private roadSegments: {
    group: THREE.Group;
    z: number;
    scenery: THREE.Object3D[];
    roadMesh: THREE.Mesh;
    groundLeft: THREE.Mesh;
    groundRight: THREE.Mesh;
    leftCurb: THREE.Mesh;
    rightCurb: THREE.Mesh;
  }[] = [];

  // Active Game Entities
  private obstacles: {
    mesh: THREE.Object3D;
    lane: number;
    z: number;
    type: 'low' | 'high' | 'block' | 'double_block' | 'moving';
    movingDirection?: number;
    originalX?: number;
    hit: boolean;
    bbox: THREE.Box3;
  }[] = [];

  private collectibles: {
    mesh: THREE.Object3D;
    type: 'coin' | 'magnet' | 'shield' | 'boost' | 'heart';
    lane: number;
    z: number;
    y: number;
    collected: boolean;
  }[] = [];

  private finishPortal: THREE.Group | null = null;
  private finishZ: number = 0;

  // Particle Effects
  private coinParticles: THREE.Points | null = null;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private particleLifespans!: Float32Array;
  private activeParticleCount: number = 0;

  // Screen shake
  private screenShakeIntensity: number = 0;

  // Reusable Math Objects to eliminate GC allocations
  private playerBox: THREE.Box3 = new THREE.Box3();
  private tempVec1: THREE.Vector3 = new THREE.Vector3();
  private tempVec2: THREE.Vector3 = new THREE.Vector3();
  private clock: THREE.Clock = new THREE.Clock();

  constructor(
    container: HTMLElement,
    levelConfig: LevelConfig,
    callbacks: GameEngineCallbacks,
    quality: 'high' | 'medium' | 'low' = 'high',
    characterId: string = 'bolt',
    outfitId: string = 'bolt_default'
  ) {
    this.container = container;
    this.levelConfig = levelConfig;
    this.callbacks = callbacks;
    this.quality = quality;
    this.characterId = characterId;
    this.outfitId = outfitId;
    this.currentSpeed = 21;
    this.finishZ = Infinity; // Infinite Endless Run!

    this.initThree();
    this.createPlayer();
    this.createChaser();
    this.createParticleSystem();
    this.buildInitialTrack();

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.clock.start();
    this.animate();
  }

  private initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene with bright sunny fog matching biome
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.levelConfig.biome.skyColor);
    this.scene.fog = new THREE.FogExp2(
      this.levelConfig.biome.fogColor,
      this.quality === 'low' ? 0.007 : 0.0055
    );

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.2, 350);
    this.camera.position.set(0, 3.8, -7);

    // 3. Renderer with Yandex Browser / Mobile optimization
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.75 : 1.2);
    this.renderer.setPixelRatio(pixelRatio);

    if (this.quality === 'high') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.container.appendChild(this.renderer.domElement);

    // 4. Ultra-bright sunny daylight lighting
    const theme = this.levelConfig.biome;
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.85);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, theme.groundColor, 1.35);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.dirLight.position.set(20, 50, 20);
    if (this.quality === 'high') {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 120;
      this.dirLight.shadow.camera.left = -18;
      this.dirLight.shadow.camera.right = 18;
      this.dirLight.shadow.camera.top = 22;
      this.dirLight.shadow.camera.bottom = -15;
    }
    this.scene.add(this.dirLight);

    // Front fill light from camera angle to ensure no dark shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
    fillLight.position.set(0, 15, -25);
    this.scene.add(fillLight);
  }

  // --- Character Creation (Stylized 3D Multi-Character System) ---
  private createPlayer() {
    this.playerGroup = new THREE.Group();

    this.playerBodyGroup = new THREE.Group();
    this.playerGroup.add(this.playerBodyGroup);

    // Build the specific character model based on characterId and outfitId
    this.buildPlayerBodyMesh();

    // Contact Shadow Under Player
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.y = 0.02;
    this.playerGroup.add(this.shadowMesh);

    // Shield Bubble Mesh (Hidden until shield is active)
    const shieldGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      wireframe: false,
    });
    this.shieldSphereMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldSphereMesh.position.y = 1.1;
    this.shieldSphereMesh.visible = false;
    this.playerGroup.add(this.shieldSphereMesh);

    this.scene.add(this.playerGroup);
  }

  public updateCharacter(characterId: string, outfitId: string) {
    this.characterId = characterId;
    this.outfitId = outfitId;
    this.buildPlayerBodyMesh();
  }

  private buildPlayerBodyMesh() {
    // Clear existing body children
    while (this.playerBodyGroup.children.length > 0) {
      this.playerBodyGroup.remove(this.playerBodyGroup.children[0]);
    }

    const charData = CHARACTERS_CATALOG.find((c) => c.id === this.characterId) || CHARACTERS_CATALOG[0];
    const outfit = charData.outfits.find((o) => o.id === this.outfitId) || charData.outfits[0];

    // Outfit Materials
    const suitMaterial = new THREE.MeshStandardMaterial({
      color: outfit.suitColor,
      roughness: 0.28,
      metalness: 0.35,
    });

    const armorMaterial = new THREE.MeshStandardMaterial({
      color: outfit.armorColor,
      roughness: 0.35,
      metalness: 0.5,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: outfit.accentColor,
      roughness: 0.25,
      metalness: 0.4,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: outfit.glowColor,
    });

    // 1. Torso (Body)
    const isTitan = charData.modelStyle === 'titan';
    const isValkyrie = charData.modelStyle === 'valkyrie';
    const torsoW = isTitan ? 1.05 : isValkyrie ? 0.72 : 0.8;
    const torsoH = isTitan ? 1.02 : isValkyrie ? 0.92 : 0.95;
    const torsoD = isTitan ? 0.62 : isValkyrie ? 0.46 : 0.5;

    const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
    this.torsoMesh = new THREE.Mesh(torsoGeo, suitMaterial);
    this.torsoMesh.position.y = 1.1;
    this.torsoMesh.castShadow = this.quality === 'high';
    this.playerBodyGroup.add(this.torsoMesh);

    // Chest Reactor / Emblem
    const coreGeo = new THREE.CylinderGeometry(isTitan ? 0.2 : 0.14, isTitan ? 0.2 : 0.14, 0.08, 16);
    coreGeo.rotateX(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, glowMaterial);
    coreMesh.position.set(0, 1.2, torsoD / 2 + 0.02);
    this.playerBodyGroup.add(coreMesh);

    // Front Chest Armor Plate
    if (isTitan || charData.modelStyle === 'paladin') {
      const plateGeo = new THREE.BoxGeometry(torsoW * 0.85, torsoH * 0.6, 0.12);
      const plateMesh = new THREE.Mesh(plateGeo, armorMaterial);
      plateMesh.position.set(0, 1.15, torsoD / 2 + 0.06);
      this.playerBodyGroup.add(plateMesh);
    }

    // 2. Character Specific Back Accessories
    if (charData.modelStyle === 'bolt') {
      // Aerodynamic thruster pack with dual nozzles
      const packGeo = new THREE.BoxGeometry(0.5, 0.58, 0.26);
      const packMesh = new THREE.Mesh(packGeo, armorMaterial);
      packMesh.position.set(0, 1.15, -0.34);
      this.playerBodyGroup.add(packMesh);

      [-0.15, 0.15].forEach((nx) => {
        const nGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.18, 12);
        nGeo.rotateX(Math.PI / 2);
        const nMesh = new THREE.Mesh(nGeo, glowMaterial);
        nMesh.position.set(nx, 0.96, -0.42);
        this.playerBodyGroup.add(nMesh);
      });
    } else if (charData.modelStyle === 'valkyrie') {
      // Dual Radiant Energy Wings
      [-1, 1].forEach((dir) => {
        const wingGeo = new THREE.BoxGeometry(0.12, 1.05, 0.04);
        wingGeo.rotateZ(dir * 0.45);
        wingGeo.rotateY(dir * 0.2);
        const wingMesh = new THREE.Mesh(wingGeo, glowMaterial);
        wingMesh.position.set(dir * 0.45, 1.35, -0.28);
        this.playerBodyGroup.add(wingMesh);
      });
    } else if (charData.modelStyle === 'shinobi') {
      // Crossed Dual Katanas on Back
      [-0.35, 0.35].forEach((angle, idx) => {
        const scabbardGeo = new THREE.BoxGeometry(0.08, 1.15, 0.08);
        scabbardGeo.rotateZ(angle);
        const scabbardMesh = new THREE.Mesh(scabbardGeo, armorMaterial);
        scabbardMesh.position.set(idx === 0 ? -0.1 : 0.1, 1.25, -0.32);
        this.playerBodyGroup.add(scabbardMesh);

        // Hilt
        const hiltGeo = new THREE.BoxGeometry(0.06, 0.25, 0.06);
        hiltGeo.rotateZ(angle);
        const hiltMesh = new THREE.Mesh(hiltGeo, accentMaterial);
        hiltMesh.position.set(idx === 0 ? -0.25 : 0.25, 1.78, -0.34);
        this.playerBodyGroup.add(hiltMesh);
      });
    } else if (charData.modelStyle === 'paladin') {
      // Royal Flowing Cape
      const capeGeo = new THREE.BoxGeometry(0.72, 1.15, 0.05);
      capeGeo.rotateX(0.18);
      const capeMesh = new THREE.Mesh(capeGeo, accentMaterial);
      capeMesh.position.set(0, 0.95, -0.38);
      this.playerBodyGroup.add(capeMesh);
    } else if (charData.modelStyle === 'titan') {
      // Heavy Power Generator
      const genGeo = new THREE.BoxGeometry(0.75, 0.75, 0.35);
      const genMesh = new THREE.Mesh(genGeo, armorMaterial);
      genMesh.position.set(0, 1.15, -0.42);
      this.playerBodyGroup.add(genMesh);
    }

    // 3. Head & Unique Headgear
    const headSize = isTitan ? 0.62 : 0.52;
    const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
    this.headMesh = new THREE.Mesh(headGeo, armorMaterial);
    this.headMesh.position.y = isTitan ? 1.9 : 1.85;
    this.headMesh.castShadow = this.quality === 'high';
    this.playerBodyGroup.add(this.headMesh);

    if (charData.modelStyle === 'bolt') {
      // Sleek Cyber Visor
      const visorGeo = new THREE.BoxGeometry(0.48, 0.16, 0.1);
      const visorMesh = new THREE.Mesh(visorGeo, glowMaterial);
      visorMesh.position.set(0, 1.88, 0.24);
      this.playerBodyGroup.add(visorMesh);
    } else if (charData.modelStyle === 'titan') {
      // Heavy Horned Helm + Slit Visor
      [-0.32, 0.32].forEach((hx) => {
        const hornGeo = new THREE.ConeGeometry(0.1, 0.35, 6);
        hornGeo.rotateZ(hx < 0 ? -0.45 : 0.45);
        const horn = new THREE.Mesh(hornGeo, accentMaterial);
        horn.position.set(hx, 2.25, 0);
        this.playerBodyGroup.add(horn);
      });

      const eyeSlitGeo = new THREE.BoxGeometry(0.44, 0.08, 0.08);
      const eyeSlit = new THREE.Mesh(eyeSlitGeo, glowMaterial);
      eyeSlit.position.set(0, 1.92, 0.3);
      this.playerBodyGroup.add(eyeSlit);
    } else if (charData.modelStyle === 'valkyrie') {
      // Winged Ear Crests + Star Visor
      [-0.3, 0.3].forEach((wx) => {
        const finGeo = new THREE.BoxGeometry(0.06, 0.35, 0.25);
        finGeo.rotateZ(wx < 0 ? -0.3 : 0.3);
        const fin = new THREE.Mesh(finGeo, accentMaterial);
        fin.position.set(wx, 1.98, 0.05);
        this.playerBodyGroup.add(fin);
      });

      const vGeo = new THREE.BoxGeometry(0.44, 0.14, 0.08);
      const vMesh = new THREE.Mesh(vGeo, glowMaterial);
      vMesh.position.set(0, 1.88, 0.24);
      this.playerBodyGroup.add(vMesh);
    } else if (charData.modelStyle === 'shinobi') {
      // Ninja Face Mask + Forehead Plate + Ribbons
      const maskGeo = new THREE.BoxGeometry(0.5, 0.24, 0.1);
      const maskMesh = new THREE.Mesh(maskGeo, suitMaterial);
      maskMesh.position.set(0, 1.76, 0.24);
      this.playerBodyGroup.add(maskMesh);

      const plateGeo = new THREE.BoxGeometry(0.42, 0.12, 0.06);
      const plateMesh = new THREE.Mesh(plateGeo, accentMaterial);
      plateMesh.position.set(0, 1.98, 0.25);
      this.playerBodyGroup.add(plateMesh);

      // Fluttering Ribbon Tails behind head
      [-0.1, 0.1].forEach((rx) => {
        const ribbonGeo = new THREE.BoxGeometry(0.08, 0.55, 0.03);
        ribbonGeo.rotateX(0.28);
        const ribbonMesh = new THREE.Mesh(ribbonGeo, accentMaterial);
        ribbonMesh.position.set(rx, 1.7, -0.38);
        this.playerBodyGroup.add(ribbonMesh);
      });
    } else if (charData.modelStyle === 'paladin') {
      // Floating Golden Solar Halo Crown
      const haloGeo = new THREE.TorusGeometry(0.36, 0.038, 16, 28);
      const haloMesh = new THREE.Mesh(haloGeo, glowMaterial);
      haloMesh.position.set(0, 2.05, -0.15);
      this.playerBodyGroup.add(haloMesh);

      const knightVisorGeo = new THREE.BoxGeometry(0.44, 0.14, 0.1);
      const knightVisor = new THREE.Mesh(knightVisorGeo, accentMaterial);
      knightVisor.position.set(0, 1.88, 0.24);
      this.playerBodyGroup.add(knightVisor);
    }

    // 4. Arms & Pauldrons
    const armW = isTitan ? 0.32 : 0.24;
    const armH = isTitan ? 0.85 : 0.75;
    const armD = isTitan ? 0.32 : 0.24;
    const armGeo = new THREE.BoxGeometry(armW, armH, armD);
    armGeo.translate(0, -armH / 2, 0);

    // Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-(torsoW / 2 + armW / 2 + 0.04), 1.45, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    leftArmMesh.castShadow = this.quality === 'high';
    this.leftArmGroup.add(leftArmMesh);

    // Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(torsoW / 2 + armW / 2 + 0.04, 1.45, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, suitMaterial);
    rightArmMesh.castShadow = this.quality === 'high';
    this.rightArmGroup.add(rightArmMesh);

    // Shoulder Armor Pauldrons
    if (isTitan) {
      [-1, 1].forEach((side) => {
        const pGeo = new THREE.BoxGeometry(0.52, 0.42, 0.52);
        const pMesh = new THREE.Mesh(pGeo, accentMaterial);
        pMesh.position.set(0, -0.05, 0);
        if (side === -1) this.leftArmGroup.add(pMesh);
        else this.rightArmGroup.add(pMesh);
      });
    } else if (charData.modelStyle === 'paladin') {
      [-1, 1].forEach((side) => {
        const pGeo = new THREE.SphereGeometry(0.24, 8, 8);
        const pMesh = new THREE.Mesh(pGeo, accentMaterial);
        pMesh.position.set(0, -0.05, 0);
        if (side === -1) this.leftArmGroup.add(pMesh);
        else this.rightArmGroup.add(pMesh);
      });
    }

    this.playerBodyGroup.add(this.leftArmGroup);
    this.playerBodyGroup.add(this.rightArmGroup);

    // 5. Legs & Boots
    const legW = isTitan ? 0.34 : 0.28;
    const legH = isTitan ? 0.8 : 0.75;
    const legD = isTitan ? 0.34 : 0.28;
    const legGeo = new THREE.BoxGeometry(legW, legH, legD);
    legGeo.translate(0, -legH / 2, 0);

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.25, 0.7, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, armorMaterial);
    leftLegMesh.castShadow = this.quality === 'high';
    this.leftLegGroup.add(leftLegMesh);

    const shoeGeo = new THREE.BoxGeometry(legW + 0.05, 0.18, 0.44);
    const leftShoe = new THREE.Mesh(shoeGeo, glowMaterial);
    leftShoe.position.set(0, -legH + 0.05, 0.08);
    this.leftLegGroup.add(leftShoe);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.25, 0.7, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, armorMaterial);
    rightLegMesh.castShadow = this.quality === 'high';
    this.rightLegGroup.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(shoeGeo, glowMaterial);
    rightShoe.position.set(0, -legH + 0.05, 0.08);
    this.rightLegGroup.add(rightShoe);

    this.playerBodyGroup.add(this.leftLegGroup);
    this.playerBodyGroup.add(this.rightLegGroup);
  }

  // --- Pursuer / Chaser Creation (Police Officer / Politsiyachi) ---
  private createChaser() {
    this.chaserGroup = new THREE.Group();
    this.chaserBodyGroup = new THREE.Group();
    this.chaserGroup.add(this.chaserBodyGroup);

    // Uniform & Character Materials matching the user's reference image
    const policeShirtMat = new THREE.MeshStandardMaterial({
      color: 0x1d3557, // Rich navy blue uniform shirt
      roughness: 0.55,
      metalness: 0.1,
    });

    const policePantsMat = new THREE.MeshStandardMaterial({
      color: 0x141f36, // Deep navy blue trousers
      roughness: 0.65,
      metalness: 0.05,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xeead87, // Warm tanned skin tone
      roughness: 0.55,
      metalness: 0.05,
    });

    const goldBadgeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Polished golden shield badge and buttons
      metalness: 0.85,
      roughness: 0.25,
    });

    const capCrownMat = new THREE.MeshStandardMaterial({
      color: 0x1b305b, // Police cap crown
      roughness: 0.5,
    });

    const patentBlackMat = new THREE.MeshStandardMaterial({
      color: 0x050505, // Glossy black visor, belt, and shoes
      roughness: 0.18,
      metalness: 0.3,
    });

    const beltBuckleMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Silver metallic buckle
      metalness: 0.9,
      roughness: 0.2,
    });

    const brownHolsterMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Brown leather utility holster
      roughness: 0.6,
    });

    const silverHandcuffsMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Silver metallic handcuffs
      metalness: 0.95,
      roughness: 0.15,
    });

    const aviatorSunglassesMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a, // Sleek black aviator lenses
    });

    // 1. Torso (Police Shirt with Collar, Placket, Pockets, and Gold Shield)
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.48);
    const torso = new THREE.Mesh(torsoGeo, policeShirtMat);
    torso.position.y = 1.35;
    torso.castShadow = this.quality === 'high';
    this.chaserBodyGroup.add(torso);

    // Shirt Collar Tabs
    [-0.14, 0.14].forEach((cx) => {
      const collarTab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.12), policeShirtMat);
      collarTab.rotation.z = cx < 0 ? 0.35 : -0.35;
      collarTab.position.set(cx, 1.78, 0.24);
      this.chaserBodyGroup.add(collarTab);
    });

    // 4 Golden Shirt Buttons down the placket
    [-0.25, -0.08, 0.08, 0.25].forEach((by) => {
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), goldBadgeMat);
      button.rotation.x = Math.PI / 2;
      button.position.set(0, 1.35 + by, 0.25);
      this.chaserBodyGroup.add(button);
    });

    // Dual Breast Pockets
    [-0.23, 0.23].forEach((px) => {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.05), policeShirtMat);
      pocket.position.set(px, 1.48, 0.25);
      this.chaserBodyGroup.add(pocket);
    });

    // Gold Police Shield Badge on Left Chest (as in picture)
    const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.17, 0.03), goldBadgeMat);
    chestBadge.position.set(-0.24, 1.52, 0.28);
    this.chaserBodyGroup.add(chestBadge);

    // Tactical Black Duty Belt with Silver Buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.89, 0.14, 0.52), patentBlackMat);
    belt.position.set(0, 0.9, 0);
    this.chaserBodyGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.05), beltBuckleMat);
    buckle.position.set(0, 0.9, 0.27);
    this.chaserBodyGroup.add(buckle);

    // Brown Leather Gun Holster on Right Hip (as in picture)
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), brownHolsterMat);
    holster.position.set(0.46, 0.8, 0.04);
    this.chaserBodyGroup.add(holster);

    // Silver Handcuffs Hanging from Left Hip (as in picture)
    const cuffGroup = new THREE.Group();
    cuffGroup.position.set(-0.43, 0.74, 0.06);
    const cuffRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 16), silverHandcuffsMat);
    const cuffRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 16), silverHandcuffsMat);
    cuffRing2.position.set(0.04, -0.08, 0.02);
    cuffGroup.add(cuffRing1);
    cuffGroup.add(cuffRing2);
    this.chaserBodyGroup.add(cuffGroup);

    // 2. Head, Neck, Aviator Sunglasses & Peaked Police Cap
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.2, 12), skinMat);
    neck.position.set(0, 1.88, 0.02);
    this.chaserBodyGroup.add(neck);

    const headGeo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 2.15, 0.02);
    head.castShadow = this.quality === 'high';
    this.chaserBodyGroup.add(head);

    // Ears
    [-0.27, 0.27].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.1), skinMat);
      ear.position.set(ex, 2.15, 0.02);
      this.chaserBodyGroup.add(ear);
    });

    // Dark Aviator Sunglasses (as in reference image)
    const glassesBar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.06), patentBlackMat);
    glassesBar.position.set(0, 2.27, 0.29);
    this.chaserBodyGroup.add(glassesBar);

    [-0.14, 0.14].forEach((gx) => {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.05), aviatorSunglassesMat);
      lens.position.set(gx, 2.2, 0.29);
      this.chaserBodyGroup.add(lens);
    });

    // Peaked Police Cap (Furajka)
    // Black Cap Band with gold side rivets
    const capBand = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.09, 0.58), patentBlackMat);
    capBand.position.set(0, 2.42, 0.02);
    this.chaserBodyGroup.add(capBand);

    [-0.29, 0.29].forEach((bx) => {
      const sideRivet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), goldBadgeMat);
      sideRivet.rotation.z = Math.PI / 2;
      sideRivet.position.set(bx, 2.42, 0.05);
      this.chaserBodyGroup.add(sideRivet);
    });

    // Flared Blue Cap Crown
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.29, 0.18, 16), capCrownMat);
    capCrown.position.set(0, 2.54, -0.01);
    capCrown.rotation.x = -0.1;
    this.chaserBodyGroup.add(capCrown);

    // Glossy Black Cap Visor / Brim (curved downward over eyes)
    const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.26), patentBlackMat);
    capVisor.position.set(0, 2.39, 0.26);
    capVisor.rotation.x = 0.18;
    this.chaserBodyGroup.add(capVisor);

    // Front Gold Shield Police Badge on Cap (as in image)
    const capBadge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.03), goldBadgeMat);
    capBadge.position.set(0, 2.53, 0.3);
    capBadge.rotation.x = -0.12;
    this.chaserBodyGroup.add(capBadge);

    // 3. Short-Sleeve Muscular Arms (Navy sleeve + Tanned Forearm)
    // Left Arm
    this.chaserLeftArmGroup = new THREE.Group();
    this.chaserLeftArmGroup.position.set(-0.56, 1.72, 0);

    const leftShortSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), policeShirtMat);
    leftShortSleeve.position.set(0, -0.14, 0);
    this.chaserLeftArmGroup.add(leftShortSleeve);

    // Yellow Service Patch on Left Sleeve (as seen in image)
    const sleevePatch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.14), goldBadgeMat);
    sleevePatch.position.set(-0.15, -0.14, 0);
    this.chaserLeftArmGroup.add(sleevePatch);

    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), skinMat);
    leftForearm.position.set(0, -0.58, 0);
    this.chaserLeftArmGroup.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.19), skinMat);
    leftHand.position.set(0, -0.92, 0.02);
    this.chaserLeftArmGroup.add(leftHand);

    this.chaserBodyGroup.add(this.chaserLeftArmGroup);

    // Right Arm
    this.chaserRightArmGroup = new THREE.Group();
    this.chaserRightArmGroup.position.set(0.56, 1.72, 0);

    const rightShortSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), policeShirtMat);
    rightShortSleeve.position.set(0, -0.14, 0);
    this.chaserRightArmGroup.add(rightShortSleeve);

    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), skinMat);
    rightForearm.position.set(0, -0.58, 0);
    this.chaserRightArmGroup.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.19), skinMat);
    rightHand.position.set(0, -0.92, 0.02);
    this.chaserRightArmGroup.add(rightHand);

    this.chaserBodyGroup.add(this.chaserRightArmGroup);

    // 4. Running Legs & Polished Police Boots
    // Left Leg
    this.chaserLeftLegGroup = new THREE.Group();
    this.chaserLeftLegGroup.position.set(-0.24, 0.85, 0);

    const legGeo = new THREE.BoxGeometry(0.32, 0.9, 0.32);
    legGeo.translate(0, -0.42, 0);
    const leftLeg = new THREE.Mesh(legGeo, policePantsMat);
    leftLeg.castShadow = this.quality === 'high';
    this.chaserLeftLegGroup.add(leftLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.46), patentBlackMat);
    leftShoe.position.set(0, -0.84, 0.08);
    this.chaserLeftLegGroup.add(leftShoe);

    this.chaserBodyGroup.add(this.chaserLeftLegGroup);

    // Right Leg
    this.chaserRightLegGroup = new THREE.Group();
    this.chaserRightLegGroup.position.set(0.24, 0.85, 0);

    const rightLeg = new THREE.Mesh(legGeo, policePantsMat);
    rightLeg.castShadow = this.quality === 'high';
    this.chaserRightLegGroup.add(rightLeg);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.46), patentBlackMat);
    rightShoe.position.set(0, -0.84, 0.08);
    this.chaserRightLegGroup.add(rightShoe);

    this.chaserBodyGroup.add(this.chaserRightLegGroup);

    // Soft Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.8, 1.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.chaserGroup.add(shadow);

    // Initial position: officer begins right behind player
    this.chaserDistance = 3.6;
    this.targetChaserDistance = 3.6;
    this.chaserDurationTimer = 5.0;
    this.chaserActive = true;
    this.chaserGroup.position.set(0, 0, -3.6);
    this.scene.add(this.chaserGroup);
  }

  // Called when player trips or crashes into an obstacle
  public alertPoliceChaser() {
    if (!this.chaserGroup) return;
    this.chaserGroup.visible = true;
    this.chaserActive = true;
    this.chaserDistance = Math.min(this.chaserDistance, 11.0);
    this.targetChaserDistance = 2.2; // lunges right to player's heels!
    this.chaserDurationTimer = 5.5;  // 5.5 seconds of clean running needed to escape him again
    soundManager.playPoliceWhistle();
  }

  private updateChaser(dt: number) {
    if (!this.chaserGroup) return;

    // Handle chaser duration timer during clean running:
    // After running cleanly for a few seconds, officer falls behind and disappears!
    if (this.chaserActive && !this.isGameOverState) {
      this.chaserDurationTimer -= dt;
      if (this.chaserDurationTimer <= 0) {
        // Player escaped cleanly! Officer drops back into distance
        this.targetChaserDistance = 25.0;
      }
    }

    // Smoothly approach target chasing distance
    const distSpeed = this.targetChaserDistance > this.chaserDistance ? 2.8 : 5.5;
    this.chaserDistance += (this.targetChaserDistance - this.chaserDistance) * Math.min(1, distSpeed * dt);

    // When officer has fallen far behind (> 19m), hide mesh
    if (this.chaserDistance > 19.0 && this.chaserDurationTimer <= 0) {
      this.chaserGroup.visible = false;
      this.chaserActive = false;
    } else {
      this.chaserGroup.visible = true;
    }

    // Follow player's X lane with natural slight delay
    const currentX = this.chaserGroup.position.x;
    const newX = currentX + (this.playerX - currentX) * Math.min(1, 8.5 * dt);
    const chaserZ = this.playerZ - this.chaserDistance;

    this.chaserGroup.position.set(newX, 0, chaserZ);

    // Running Animation
    this.chaserAnimTime += dt * this.currentSpeed * 0.95;
    const stride = Math.sin(this.chaserAnimTime);

    if (this.isGameOverState) {
      // Arrest animation: officer tackles/reaches out with both hands to grab player!
      this.chaserLeftArmGroup.rotation.x = -1.45;
      this.chaserRightArmGroup.rotation.x = -1.45;
      this.chaserLeftLegGroup.rotation.x = 0.15;
      this.chaserRightLegGroup.rotation.x = -0.15;
      this.chaserBodyGroup.rotation.x = 0.32;
      this.chaserBodyGroup.position.y = 0.05;
    } else {
      this.chaserLeftLegGroup.rotation.x = stride * 0.9;
      this.chaserRightLegGroup.rotation.x = -stride * 0.9;
      this.chaserLeftArmGroup.rotation.x = -stride * 1.05;
      this.chaserRightArmGroup.rotation.x = stride * 1.05;

      // Natural running posture
      this.chaserBodyGroup.rotation.x = 0.14;
      this.chaserBodyGroup.position.y = Math.abs(Math.sin(this.chaserAnimTime * 2)) * 0.07;
    }

    // Footstep audio when active and close
    if (this.chaserActive && this.chaserDistance < 4.2 && !this.isGameOverState) {
      this.chaserStompTimer += dt;
      if (this.chaserStompTimer > 0.36) {
        this.chaserStompTimer = 0;
        soundManager.playChaserStomp();
      }
    }
  }

  // --- Track Building & Recycling ---
  private buildInitialTrack() {
    for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
      const z = i * SEGMENT_LENGTH;
      this.createRoadSegment(z);
      if (i > 0) {
        this.populateSegment(z);
      }
    }
  }

  private createRoadSegment(startZ: number) {
    const theme = this.levelConfig.biome;
    const group = new THREE.Group();
    group.position.z = startZ;

    // Road surface
    const roadWidth = 9.2;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: theme.roadColor,
      roughness: 0.5,
      metalness: 0.1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, 0, SEGMENT_LENGTH / 2);
    roadMesh.receiveShadow = this.quality !== 'low';
    group.add(roadMesh);

    // Ground landscape outside road
    const groundWidth = 70;
    const groundGeo = new THREE.PlaneGeometry(groundWidth, SEGMENT_LENGTH);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: theme.groundColor,
      roughness: 0.95,
    });
    const groundLeft = new THREE.Mesh(groundGeo, groundMat);
    groundLeft.position.set(-(roadWidth / 2 + groundWidth / 2), -0.05, SEGMENT_LENGTH / 2);
    groundLeft.receiveShadow = this.quality !== 'low';
    group.add(groundLeft);

    const groundRight = new THREE.Mesh(groundGeo, groundMat);
    groundRight.position.set(roadWidth / 2 + groundWidth / 2, -0.05, SEGMENT_LENGTH / 2);
    groundRight.receiveShadow = this.quality !== 'low';
    group.add(groundRight);

    // Glowing Lane Dividers
    const laneMarkerGeo = new THREE.PlaneGeometry(0.18, SEGMENT_LENGTH);
    laneMarkerGeo.rotateX(-Math.PI / 2);
    const laneMarkerMat = new THREE.MeshBasicMaterial({
      color: theme.laneColor,
    });

    const leftDivider = new THREE.Mesh(laneMarkerGeo, laneMarkerMat);
    leftDivider.position.set(-1.3, 0.01, SEGMENT_LENGTH / 2);
    group.add(leftDivider);

    const rightDivider = new THREE.Mesh(laneMarkerGeo, laneMarkerMat);
    rightDivider.position.set(1.3, 0.01, SEGMENT_LENGTH / 2);
    group.add(rightDivider);

    // Curbs & Rails
    const curbGeo = new THREE.BoxGeometry(0.35, 0.35, SEGMENT_LENGTH);
    const curbMat = new THREE.MeshStandardMaterial({
      color: theme.curbColor,
      emissive: theme.curbColor,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    });

    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-(roadWidth / 2), 0.15, SEGMENT_LENGTH / 2);
    group.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(roadWidth / 2, 0.15, SEGMENT_LENGTH / 2);
    group.add(rightCurb);

    // Scenery Props along sides
    const sceneryObjects = this.createSceneryForSegment(theme, SEGMENT_LENGTH);
    sceneryObjects.forEach(obj => group.add(obj));

    this.scene.add(group);
    this.roadSegments.push({
      group,
      z: startZ,
      scenery: sceneryObjects,
      roadMesh,
      groundLeft,
      groundRight,
      leftCurb,
      rightCurb,
    });
  }

  // --- Dynamic Biome Scenery Generator ---
  private createSceneryForSegment(theme: BiomeTheme, length: number): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    const count = this.quality === 'low' ? 3 : 5;

    for (let i = 0; i < count; i++) {
      const zOffset = (i / count) * length + (Math.random() * 4 - 2);

      // Left & Right side scenery
      [-1, 1].forEach(side => {
        const xOffset = side * (6.5 + Math.random() * 12);
        const sceneryItem = this.createBiomeProp(theme.sceneryType, theme);
        sceneryItem.position.set(xOffset, 0, zOffset);
        list.push(sceneryItem);
      });
    }

    return list;
  }

  private createBiomeProp(type: string, theme: BiomeTheme): THREE.Object3D {
    const propGroup = new THREE.Group();
    const treeVariant = Math.random();

    // 1. Lush Deciduous Oak / Apple Tree (Bargdor Yashil Daraxt)
    if (treeVariant < 0.45 || type === 'forest') {
      // Tree Trunk
      const trunkH = 3.2 + Math.random() * 1.5;
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, trunkH, 8);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x5c3a21, // Warm natural wooden bark
        roughness: 0.9,
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = this.quality === 'high';
      propGroup.add(trunk);

      // Multi-cluster Lush Green Leaf Foliage Canopy
      const leafColors = [0x22c55e, 0x16a34a, 0x4ade80, 0x15803d];
      const mainColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      const leafMat = new THREE.MeshStandardMaterial({
        color: mainColor,
        roughness: 0.75,
      });

      // Main central crown
      const crownGeo = new THREE.DodecahedronGeometry(2.2 + Math.random() * 0.6);
      const crown = new THREE.Mesh(crownGeo, leafMat);
      crown.position.set(0, trunkH + 1.2, 0);
      crown.castShadow = this.quality === 'high';
      propGroup.add(crown);

      // Side foliage puffs for a full natural tree look
      [-0.9, 0.9].forEach((ox, idx) => {
        const subGeo = new THREE.DodecahedronGeometry(1.4);
        const subMesh = new THREE.Mesh(subGeo, leafMat);
        subMesh.position.set(ox, trunkH + 0.8, idx === 0 ? 0.6 : -0.6);
        propGroup.add(subMesh);
      });

      // Flower Bushes at the base of the tree
      const bushGeo = new THREE.SphereGeometry(0.65, 8, 8);
      const bushMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(0.6, 0.3, 0.4);
      bush.scale.set(1.2, 0.7, 1.2);
      propGroup.add(bush);

      // Colorful Wildflowers
      const flowerGeo = new THREE.SphereGeometry(0.18, 6, 6);
      const flowerMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xf43f5e : 0xfacc15,
      });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(0.6, 0.65, 0.4);
      propGroup.add(flower);
    }
    // 2. Noble Pine / Conifer Tree (Yam-yashil Archa)
    else if (treeVariant < 0.75 || type === 'arctic') {
      const trunkH = 2.5;
      const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, trunkH, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      propGroup.add(trunk);

      const pineColor = type === 'autumn' ? 0xd97706 : 0x15803d;
      const pineMat = new THREE.MeshStandardMaterial({ color: pineColor, roughness: 0.8 });

      // 3-Tier Layered Pine Cones
      const tiers = [
        { radius: 2.3, height: 2.8, y: trunkH + 1.2 },
        { radius: 1.8, height: 2.4, y: trunkH + 2.6 },
        { radius: 1.2, height: 2.0, y: trunkH + 3.8 },
      ];

      tiers.forEach((t) => {
        const coneGeo = new THREE.ConeGeometry(t.radius, t.height, 8);
        const cone = new THREE.Mesh(coneGeo, pineMat);
        cone.position.y = t.y;
        cone.castShadow = this.quality === 'high';
        propGroup.add(cone);
      });

      // Rock near base
      const rockGeo = new THREE.DodecahedronGeometry(0.5);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(-0.8, 0.25, 0.4);
      propGroup.add(rock);
    }
    // 3. Pink Sakura / Blossom Garden Tree
    else if (type === 'sakura' || treeVariant < 0.9) {
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.6;
      propGroup.add(trunk);

      const blossomMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.7 });
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3), blossomMat);
      crown.position.y = 4.4;
      propGroup.add(crown);

      const sideCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5), blossomMat);
      sideCrown.position.set(0.8, 3.8, -0.4);
      propGroup.add(sideCrown);
    }
    // 4. Sunny Parkland Lamp Post (Yorqin Bog' Fonari)
    else {
      // Graceful Park Lamp Post
      const postH = 4.2;
      const postGeo = new THREE.CylinderGeometry(0.08, 0.12, postH, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = postH / 2;
      propGroup.add(post);

      // Curved Lamp Head
      const armGeo = new THREE.BoxGeometry(0.7, 0.08, 0.08);
      const arm = new THREE.Mesh(armGeo, postMat);
      arm.position.set(-0.25, postH - 0.1, 0);
      propGroup.add(arm);

      // Glowing Lantern Bulb (warm golden light)
      const bulbGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(-0.55, postH - 0.25, 0);
      propGroup.add(bulb);

      // Bush at base of lamppost
      const baseBush = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 })
      );
      baseBush.position.set(0, 0.25, 0);
      baseBush.scale.set(1.1, 0.6, 1.1);
      propGroup.add(baseBush);
    }

    return propGroup;
  }

  // --- Obstacle & Collectible Spawning ---
  private populateSegment(startZ: number) {
    // Don't spawn obstacles right next to the finish portal
    if (startZ > this.finishZ - 45) return;

    const density = this.levelConfig.obstacleDensity;
    const numPatterns = Math.floor(1 + Math.random() * (1.8 * density));

    for (let i = 0; i < numPatterns; i++) {
      const zPos = startZ + 8 + (i * 14) + Math.random() * 4;
      if (zPos > this.finishZ - 30) continue;

      const rand = Math.random();

      if (rand < 0.28 && this.levelConfig.highLowBarrierChance > 0) {
        // High barrier (must slide under)
        const lane = Math.floor(Math.random() * 3);
        this.spawnHighBarrier(lane, zPos);
      } else if (rand < 0.58) {
        // Low barrier (must jump)
        const lane = Math.floor(Math.random() * 3);
        this.spawnLowBarrier(lane, zPos);
      } else if (rand < 0.85) {
        // Block obstacle (must change lane)
        const lane = Math.floor(Math.random() * 3);
        this.spawnBlockObstacle(lane, zPos);
      } else if (this.levelConfig.movingObstacleChance > 0.1 && Math.random() < this.levelConfig.movingObstacleChance) {
        // Moving hazard drone
        this.spawnMovingDrone(zPos);
      } else {
        // Double block (only 1 free lane)
        const freeLane = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l !== freeLane) {
            this.spawnBlockObstacle(l, zPos);
          }
        }
      }

      // Spawn coins / powerups along this strip
      this.spawnCollectiblesNear(zPos + 6);
    }
  }

  private spawnLowBarrier(lane: number, z: number) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, 0, z);

    // Hurdle barricade
    const barGeo = new THREE.BoxGeometry(2.3, 0.42, 0.35);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red hazard
      roughness: 0.4,
    });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.y = 0.48;
    bar.castShadow = this.quality === 'high';
    group.add(bar);

    // Hazard yellow/black striped top
    const topGeo = new THREE.BoxGeometry(2.35, 0.1, 0.38);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.3,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.72;
    group.add(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.35);
    const leftLeg = new THREE.Mesh(legGeo, barMat);
    leftLeg.position.set(-0.95, 0.35, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, barMat);
    rightLeg.position.set(0.95, 0.35, 0);
    group.add(rightLeg);

    this.scene.add(group);

    const bbox = new THREE.Box3();
    bbox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z,
      type: 'low',
      hit: false,
      bbox,
    });
  }

  private spawnHighBarrier(lane: number, z: number) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, 0, z);

    // Tall side hurdle posts
    const pillarGeo = new THREE.BoxGeometry(0.28, 2.7, 0.3);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Bright athletic caution yellow
      roughness: 0.3,
      metalness: 0.2,
    });

    const leftP = new THREE.Mesh(pillarGeo, pillarMat);
    leftP.position.set(-1.05, 1.35, 0);
    group.add(leftP);

    const rightP = new THREE.Mesh(pillarGeo, pillarMat);
    rightP.position.set(1.05, 1.35, 0);
    group.add(rightP);

    // Overhead clearance beam (bottom height ~1.2m, top height ~2.6m -> forces ducking)
    const beamGeo = new THREE.BoxGeometry(2.4, 1.3, 0.4);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Rose hazard
      emissive: 0x9f1239,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.95;
    beam.castShadow = this.quality === 'high';
    group.add(beam);

    // Glowing warning sign
    const signGeo = new THREE.PlaneGeometry(1.2, 0.4);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.95, 0.22);
    group.add(sign);

    this.scene.add(group);

    const bbox = new THREE.Box3();
    bbox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z,
      type: 'high',
      hit: false,
      bbox,
    });
  }

  private spawnBlockObstacle(lane: number, z: number) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, 0, z);

    // Solid shipping container / energy block
    const blockGeo = new THREE.BoxGeometry(2.1, 2.3, 1.6);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Orange/amber crate
      roughness: 0.5,
      metalness: 0.3,
    });
    const block = new THREE.Mesh(blockGeo, blockMat);
    block.position.y = 1.15;
    block.castShadow = this.quality === 'high';
    group.add(block);

    // Top warning beacon
    const beaconGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 2.4, 0);
    group.add(beacon);

    this.scene.add(group);

    const bbox = new THREE.Box3();
    bbox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z,
      type: 'block',
      hit: false,
      bbox,
    });
  }

  private spawnMovingDrone(z: number) {
    const group = new THREE.Group();
    const lane = 1;
    group.position.set(0, 1.1, z);

    // Hover Drone Mesh
    const bodyGeo = new THREE.SphereGeometry(0.8, 12, 12);
    bodyGeo.scale(1.2, 0.6, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      roughness: 0.2,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = this.quality === 'high';
    group.add(body);

    // Glowing laser eye
    const eyeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0, -0.7);
    group.add(eye);

    this.scene.add(group);

    const bbox = new THREE.Box3();
    bbox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z,
      type: 'moving',
      movingDirection: Math.random() > 0.5 ? 1 : -1,
      originalX: 0,
      hit: false,
      bbox,
    });
  }

  private spawnCollectiblesNear(z: number) {
    const lane = Math.floor(Math.random() * 3);
    const rand = Math.random();

    // Check if we should spawn a rare powerup
    if (rand < 0.12) {
      const pTypes: ('magnet' | 'shield' | 'boost' | 'heart')[] = ['magnet', 'shield', 'boost'];
      if (this.health < this.maxHealth) {
        pTypes.push('heart');
      }
      const selectedType = pTypes[Math.floor(Math.random() * pTypes.length)];
      this.spawnPowerup(selectedType, lane, z);
      return;
    }

    // Otherwise spawn coin pattern (line of 3 coins or arc)
    const isArc = Math.random() < 0.35;
    for (let c = 0; c < 3; c++) {
      const coinZ = z + c * 2.8;
      const coinY = isArc ? (c === 1 ? 1.9 : 1.1) : 0.9;
      this.spawnCoin(lane, coinZ, coinY);
    }
  }

  private spawnCoin(lane: number, z: number, y: number) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, y, z);

    // 3D Spinning Coin
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
    coinGeo.rotateZ(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Gold
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
    });
    const coinMesh = new THREE.Mesh(coinGeo, coinMat);
    group.add(coinMesh);

    this.scene.add(group);

    this.collectibles.push({
      mesh: group,
      type: 'coin',
      lane,
      z,
      y,
      collected: false,
    });
  }

  private spawnPowerup(type: 'magnet' | 'shield' | 'boost' | 'heart', lane: number, z: number) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, 1.2, z);

    let color = 0x38bdf8;
    if (type === 'shield') color = 0x10b981;
    if (type === 'boost') color = 0xf97316;
    if (type === 'heart') color = 0xef4444;

    const orbGeo = new THREE.OctahedronGeometry(0.5, 2);
    const orbMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.3,
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    group.add(orbMesh);

    // Glowing outer halo ring
    const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    this.scene.add(group);

    this.collectibles.push({
      mesh: group,
      type,
      lane,
      z,
      y: 1.2,
      collected: false,
    });
  }

  // --- Finish Line Portal (Grand Gateway of Ascension) ---
  private createFinishPortal() {
    this.finishPortal = new THREE.Group();
    this.finishPortal.position.set(0, 0, this.finishZ);

    const theme = this.levelConfig.biome;

    // Giant Arch Portal Posts
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.7,
      roughness: 0.3,
    });

    const leftPostGeo = new THREE.BoxGeometry(1.2, 9, 1.2);
    const leftPost = new THREE.Mesh(leftPostGeo, archMat);
    leftPost.position.set(-5, 4.5, 0);
    this.finishPortal.add(leftPost);

    const rightPost = new THREE.Mesh(leftPostGeo, archMat);
    rightPost.position.set(5, 4.5, 0);
    this.finishPortal.add(rightPost);

    const topBeamGeo = new THREE.BoxGeometry(11.2, 1.4, 1.4);
    const topBeam = new THREE.Mesh(topBeamGeo, archMat);
    topBeam.position.set(0, 9, 0);
    this.finishPortal.add(topBeam);

    // Glowing Finish Banner Ring
    const ringGeo = new THREE.TorusGeometry(4.2, 0.35, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: theme.accentColor,
      emissive: theme.accentColor,
      emissiveIntensity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 4.5, 0);
    this.finishPortal.add(ring);

    // Energy Vortex / Finish Wall
    const portalWallGeo = new THREE.PlaneGeometry(8.5, 8);
    const portalWallMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const portalWall = new THREE.Mesh(portalWallGeo, portalWallMat);
    portalWall.position.set(0, 4.5, 0);
    this.finishPortal.add(portalWall);

    this.scene.add(this.finishPortal);
  }

  // --- Particle FX (Coins, Sparkles, Explosions) ---
  private createParticleSystem() {
    const maxParticles = 120;
    const geometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(maxParticles * 3);
    this.particleVelocities = new Float32Array(maxParticles * 3);
    this.particleLifespans = new Float32Array(maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffe600,
      size: 0.45,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.coinParticles = new THREE.Points(geometry, material);
    this.coinParticles.frustumCulled = false;
    this.scene.add(this.coinParticles);
  }

  private triggerParticles(x: number, y: number, z: number, count: number = 16, colorHex: number = 0xffe600) {
    if (!this.coinParticles) return;
    (this.coinParticles.material as THREE.PointsMaterial).color.setHex(colorHex);

    const max = 120;
    for (let i = 0; i < count; i++) {
      const idx = (this.activeParticleCount + i) % max;
      this.particlePositions[idx * 3] = x;
      this.particlePositions[idx * 3 + 1] = y;
      this.particlePositions[idx * 3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particleVelocities[idx * 3] = Math.cos(angle) * speed;
      this.particleVelocities[idx * 3 + 1] = 2 + Math.random() * 4;
      this.particleVelocities[idx * 3 + 2] = (Math.random() - 0.5) * 4;

      this.particleLifespans[idx] = 1.0;
    }
    this.activeParticleCount = (this.activeParticleCount + count) % max;
  }

  // --- Player Controls (WASD / Arrows / Swipes / On-Screen Buttons) ---
  public moveLeft() {
    if (this.targetLaneIndex > 0) {
      this.targetLaneIndex--;
    }
  }

  public moveRight() {
    if (this.targetLaneIndex < 2) {
      this.targetLaneIndex++;
    }
  }

  public jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      this.slideTimer = 0;
      this.jumpVelocity = 14.2;
      soundManager.playJump();
    }
  }

  public slide() {
    this.isSliding = true;
    this.slideTimer = 0.75; // duration of slide
    soundManager.playSlide();

    // If in mid-air, fast-drop down immediately
    if (this.isJumping) {
      this.jumpVelocity = -22;
    }
  }

  // --- Main Animation & Physics Loop ---
  private animate = () => {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.isPaused) return;

    this.updatePhysics(dt);
    this.updateCamera(dt);
    this.updateTrackRecycling();
    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private updatePhysics(dt: number) {
    if (this.isGameOverState || this.isLevelFinished) return;

    // 1. Forward Movement
    const speedMultiplier = this.activePowerup === 'boost' ? 1.55 : 1.0;
    const forwardStep = this.currentSpeed * speedMultiplier * dt;
    this.playerZ += forwardStep;
    this.score += Math.round(forwardStep * this.multiplier * (this.activePowerup === 'boost' ? 2 : 1));

    // 2. Lane Switching (Smooth Lerp + Banking tilt)
    const targetX = LANES[this.targetLaneIndex];
    const dx = targetX - this.playerX;
    this.playerX += dx * Math.min(1, 20 * dt);

    // Roll angle based on lane movement
    const bankAngle = -dx * 0.18;
    this.playerBodyGroup.rotation.z = bankAngle;

    // 3. Jump Physics
    if (this.isJumping) {
      this.playerY += this.jumpVelocity * dt;
      this.jumpVelocity -= 36 * dt; // Gravity

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }

    // 4. Slide Physics & Animation
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 5. Invulnerability Timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      // Visual blink
      const blink = Math.sin(this.invulnerableTimer * 30) > 0;
      this.playerBodyGroup.visible = blink || this.invulnerableTimer <= 0;
    } else {
      this.playerBodyGroup.visible = true;
    }

    // 6. Power-up Timers
    if (this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.activePowerup = 'none';
        this.shieldSphereMesh.visible = false;
      }
    }

    // 7. Limb Running Animation
    this.runAnimTime += dt * this.currentSpeed * 0.9;
    if (this.isJumping) {
      // Jump pose: legs tucked back, arms up
      this.leftLegGroup.rotation.x = -0.7;
      this.rightLegGroup.rotation.x = -0.7;
      this.leftArmGroup.rotation.x = 0.9;
      this.rightArmGroup.rotation.x = 0.9;
      this.playerBodyGroup.rotation.x = 0.2;
    } else if (this.isSliding) {
      // Slide pose: low tilt back
      this.leftLegGroup.rotation.x = 1.3;
      this.rightLegGroup.rotation.x = 1.3;
      this.leftArmGroup.rotation.x = -0.9;
      this.rightArmGroup.rotation.x = -0.9;
      this.playerBodyGroup.rotation.x = -0.95;
      this.playerBodyGroup.position.y = -0.45;
    } else {
      // Natural running stride
      const stride = Math.sin(this.runAnimTime);
      this.leftLegGroup.rotation.x = stride * 0.85;
      this.rightLegGroup.rotation.x = -stride * 0.85;
      this.leftArmGroup.rotation.x = -stride * 0.9;
      this.rightArmGroup.rotation.x = stride * 0.9;
      this.playerBodyGroup.rotation.x = 0.12; // Slight athletic forward lean
      this.playerBodyGroup.position.y = Math.abs(Math.sin(this.runAnimTime * 2)) * 0.08;
    }

    // Update Player Root Position
    this.playerGroup.position.set(this.playerX, this.playerY, this.playerZ);

    // Update Shadow: scales down and fades as player jumps high
    const shadowScale = Math.max(0.3, 1 - this.playerY * 0.25);
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.45 - this.playerY * 0.15);

    // Update Player Bounding Box for Collisions
    const effectiveHeight = this.isSliding ? 0.65 : 1.85;
    const minY = this.playerY;
    const maxY = this.playerY + effectiveHeight;
    this.playerBox.min.set(this.playerX - 0.42, minY, this.playerZ - 0.42);
    this.playerBox.max.set(this.playerX + 0.42, maxY, this.playerZ + 0.42);

    // Speed increases continuously with distance survived!
    this.currentSpeed = Math.min(38, 21 + (this.playerZ / 320) * 1.5);
    this.multiplier = 1 + Math.floor(this.playerZ / 350);

    // Dynamic Biome shift every 600 meters!
    const BIOME_INTERVAL = 600;
    const biomeIdx = Math.floor(this.playerZ / BIOME_INTERVAL) % BIOME_KEYS.length;
    const activeBiomeKey = BIOME_KEYS[biomeIdx];
    const activeBiome = BIOMES[activeBiomeKey];

    // Smoothly blend sky and fog colors towards active biome
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(new THREE.Color(activeBiome.skyColor), 0.015);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(new THREE.Color(activeBiome.fogColor), 0.015);
    }

    // Update Chaser Position & Animation
    this.updateChaser(dt);

    // Notify React HUD of latest stats
    this.callbacks.onStatsUpdate({
      score: this.score,
      coins: this.coins,
      distance: Math.round(this.playerZ),
      health: this.health,
      maxHealth: this.maxHealth,
      multiplier: this.multiplier,
      activePowerup: this.activePowerup,
      powerupTimeRemaining: Math.max(0, this.powerupTimer),
      stars: this.calculateStars(),
      chaserClose: this.chaserActive && this.chaserDistance < 5.0,
      currentBiomeName: activeBiome.name,
    });
  }

  private calculateStars(): number {
    if (this.health === 3 && this.coins >= 15) return 3;
    if (this.health >= 2 || this.coins >= 8) return 2;
    return 1;
  }

  // --- Smooth Camera Following ---
  private updateCamera(dt: number) {
    // Camera smoothly follows player with dramatic view of pursuer
    const targetCamX = this.playerX * 0.45;
    const targetCamY = 4.2 + this.playerY * 0.35;
    const targetCamZ = this.playerZ - 8.2;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 10 * dt);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 10 * dt);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, 20 * dt);

    // Camera LookAt
    const lookX = this.playerX * 0.65;
    const lookY = 1.5 + this.playerY * 0.3;
    const lookZ = this.playerZ + 12;

    this.camera.lookAt(lookX, lookY, lookZ);

    // FOV dynamic expansion when boosting
    const targetFov = this.activePowerup === 'boost' ? 76 : 64;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * 5 * dt;
      this.camera.updateProjectionMatrix();
    }

    // Screen Shake
    if (this.screenShakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShakeIntensity;
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - 3.5 * dt);
    }
  }

  // --- Track Segment Recycling for 60FPS Performance ---
  private updateTrackRecycling() {
    const playerZ = this.playerZ;

    for (let i = 0; i < this.roadSegments.length; i++) {
      const seg = this.roadSegments[i];
      // If segment is 36m behind the camera, move it to the front
      if (seg.z + SEGMENT_LENGTH < playerZ - 30) {
        // Find furthest segment
        let maxZ = 0;
        for (const s of this.roadSegments) {
          if (s.z > maxZ) maxZ = s.z;
        }

        const newZ = maxZ + SEGMENT_LENGTH;
        seg.group.position.z = newZ;
        seg.z = newZ;

        // Dynamic Biome update for the recycled segment
        const segBiomeIdx = Math.floor(newZ / 600) % BIOME_KEYS.length;
        const currentBiome = BIOMES[BIOME_KEYS[segBiomeIdx]];

        if (seg.groundLeft && seg.groundRight && seg.roadMesh) {
          (seg.groundLeft.material as THREE.MeshStandardMaterial).color.setHex(currentBiome.groundColor);
          (seg.groundRight.material as THREE.MeshStandardMaterial).color.setHex(currentBiome.groundColor);
          (seg.roadMesh.material as THREE.MeshStandardMaterial).color.setHex(currentBiome.roadColor);
          (seg.leftCurb.material as THREE.MeshStandardMaterial).color.setHex(currentBiome.curbColor);
          (seg.rightCurb.material as THREE.MeshStandardMaterial).color.setHex(currentBiome.curbColor);
        }

        // Replace old scenery with fresh biome props
        if (seg.scenery) {
          for (const obj of seg.scenery) {
            seg.group.remove(obj);
          }
          const newScenery = this.createSceneryForSegment(currentBiome, SEGMENT_LENGTH);
          newScenery.forEach(obj => seg.group.add(obj));
          seg.scenery = newScenery;
        }

        // Spawn obstacles and collectibles
        if (newZ < this.finishZ) {
          this.populateSegment(newZ);
        }
      }
    }
  }

  // --- Obstacle Collision & Movement ---
  private updateObstacles(dt: number) {
    const pZ = this.playerZ;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // Clean up past obstacles
      if (obs.z < pZ - 25) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }

      // Moving Drone update
      if (obs.type === 'moving' && obs.movingDirection !== undefined && obs.originalX !== undefined) {
        obs.mesh.position.x += obs.movingDirection * 3.5 * dt;
        if (obs.mesh.position.x > 2.6) {
          obs.mesh.position.x = 2.6;
          obs.movingDirection = -1;
        } else if (obs.mesh.position.x < -2.6) {
          obs.mesh.position.x = -2.6;
          obs.movingDirection = 1;
        }
        obs.bbox.setFromObject(obs.mesh);
      }

      // Collision Detection with Player
      if (!obs.hit && Math.abs(obs.z - pZ) < 2.5) {
        // Bounding box intersection check
        obs.bbox.setFromObject(obs.mesh);

        let isColliding = this.playerBox.intersectsBox(obs.bbox);

        // Special handling for high barrier (duck to avoid)
        if (obs.type === 'high') {
          // If player is sliding, they duck under the beam
          if (this.isSliding) {
            isColliding = false;
          }
        } else if (obs.type === 'low') {
          // If player is jumping sufficiently high (y > 1.2), they clear the hurdle
          if (this.playerY > 1.15) {
            isColliding = false;
          }
        }

        if (isColliding) {
          this.handleObstacleHit(obs);
        }
      }
    }
  }

  private handleObstacleHit(obs: { hit: boolean; type: string; mesh: THREE.Object3D; z: number }) {
    // If boosting, smash through obstacle!
    if (this.activePowerup === 'boost') {
      obs.hit = true;
      soundManager.playHit();
      this.triggerParticles(this.playerX, 1.2, obs.z, 20, 0xf97316);
      this.scene.remove(obs.mesh);
      this.score += 250;
      return;
    }

    // If invulnerable from recent hit, ignore
    if (this.invulnerableTimer > 0) return;

    obs.hit = true;

    // Check Shield Protection
    if (this.activePowerup === 'shield') {
      this.activePowerup = 'none';
      this.powerupTimer = 0;
      this.shieldSphereMesh.visible = false;
      soundManager.playHit();
      this.screenShakeIntensity = 0.3;
      this.invulnerableTimer = 1.2;
      this.triggerParticles(this.playerX, 1.2, this.playerZ, 25, 0x10b981);
      // Policeman rushes in!
      this.alertPoliceChaser();
      return;
    }

    // Normal Damage
    this.health--;
    soundManager.playHit();
    this.screenShakeIntensity = 0.55;
    this.invulnerableTimer = 1.8;
    this.callbacks.onDamageFlash();
    this.callbacks.onHealthUpdate(this.health);

    if (this.health <= 0) {
      this.triggerGameOver();
    } else {
      // Policeman rushes in immediately on stumble!
      this.alertPoliceChaser();
    }
  }

  // --- Collectible Pickups & Magnet Effect ---
  private updateCollectibles(dt: number) {
    const pZ = this.playerZ;
    const hasMagnet = this.activePowerup === 'magnet';

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];

      // Remove past collectibles
      if (item.z < pZ - 20 || item.collected) {
        this.scene.remove(item.mesh);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Rotate collectible
      item.mesh.rotation.y += 3.2 * dt;

      // Magnet attraction
      if (hasMagnet && item.type === 'coin') {
        const dist = Math.hypot(item.mesh.position.x - this.playerX, item.z - pZ);
        if (dist < 16) {
          item.mesh.position.x += (this.playerX - item.mesh.position.x) * 14 * dt;
          item.z += (pZ - item.z) * 14 * dt;
          item.mesh.position.z = item.z;
        }
      }

      // Pickup distance check
      const dX = Math.abs(item.mesh.position.x - this.playerX);
      const dZ = Math.abs(item.z - pZ);
      const dY = Math.abs(item.y - this.playerY);

      if (dX < 1.1 && dZ < 1.3 && dY < 1.8) {
        this.collectItem(item);
      }
    }
  }

  private collectItem(item: {
    type: 'coin' | 'magnet' | 'shield' | 'boost' | 'heart';
    mesh: THREE.Object3D;
    collected: boolean;
    z: number;
  }) {
    item.collected = true;

    if (item.type === 'coin') {
      this.coins++;
      this.score += 50 * this.multiplier;
      soundManager.playCoin();
      this.triggerParticles(item.mesh.position.x, 1.0, item.z, 8, 0xfbbf24);
    } else if (item.type === 'magnet') {
      this.activePowerup = 'magnet';
      this.powerupTimer = 10;
      soundManager.playPowerup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 16, 0x38bdf8);
    } else if (item.type === 'shield') {
      this.activePowerup = 'shield';
      this.powerupTimer = 15;
      this.shieldSphereMesh.visible = true;
      soundManager.playPowerup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 16, 0x10b981);
    } else if (item.type === 'boost') {
      this.activePowerup = 'boost';
      this.powerupTimer = 5;
      soundManager.playPowerup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 22, 0xf97316);
    } else if (item.type === 'heart') {
      if (this.health < this.maxHealth) {
        this.health++;
        this.callbacks.onHealthUpdate(this.health);
      }
      soundManager.playPowerup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 18, 0xef4444);
    }

    this.scene.remove(item.mesh);
  }

  // --- Particle Animation ---
  private updateParticles(dt: number) {
    if (!this.coinParticles) return;

    const positions = this.particlePositions;
    const velocities = this.particleVelocities;
    const lifespans = this.particleLifespans;
    const max = 120;

    for (let i = 0; i < max; i++) {
      if (lifespans[i] > 0) {
        lifespans[i] -= dt * 2.2;

        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

        velocities[i * 3 + 1] -= 9.8 * dt; // gravity
      } else {
        positions[i * 3 + 1] = -100; // hide under floor
      }
    }

    this.coinParticles.geometry.attributes.position.needsUpdate = true;
  }

  // --- Level Complete & Game Over Triggers ---
  private triggerLevelComplete() {
    if (this.isLevelFinished) return;
    this.isLevelFinished = true;

    if (this.levelConfig.level === 500) {
      soundManager.playVictory();
    } else {
      soundManager.playLevelComplete();
    }

    const finalStats: PlayerStats = {
      score: this.score + 1000 * this.levelConfig.level,
      coins: this.coins,
      distance: this.finishZ,
      health: this.health,
      maxHealth: this.maxHealth,
      multiplier: this.multiplier,
      activePowerup: this.activePowerup,
      powerupTimeRemaining: 0,
      stars: this.calculateStars(),
      chaserClose: false,
      currentBiomeName: this.levelConfig.biome.name,
    };

    this.callbacks.onLevelComplete(finalStats);
  }

  private triggerGameOver() {
    if (this.isGameOverState) return;
    this.isGameOverState = true;
    soundManager.playGameOver();

    // Officer surges forward to arrest and grab the player!
    this.chaserGroup.visible = true;
    this.chaserActive = true;
    this.targetChaserDistance = 0.35;
    soundManager.playPoliceWhistle();

    const biomeIdx = Math.floor(this.playerZ / 600) % BIOME_KEYS.length;
    const activeBiome = BIOMES[BIOME_KEYS[biomeIdx]];

    const finalStats: PlayerStats = {
      score: this.score,
      coins: this.coins,
      distance: Math.round(this.playerZ),
      health: 0,
      maxHealth: this.maxHealth,
      multiplier: this.multiplier,
      activePowerup: 'none',
      powerupTimeRemaining: 0,
      stars: 0,
      chaserClose: true,
      currentBiomeName: activeBiome.name,
    };

    this.callbacks.onGameOver(finalStats);
  }

  // --- Public Control APIs ---
  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.clock.start();
  }

  private onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.scene.clear();
    this.renderer.dispose();
  }
}
