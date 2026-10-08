import * as THREE from 'three';
import { BiomeTheme, LevelConfig, PlayerStats, PowerupType } from '../types/game';
import { CHARACTERS_CATALOG } from '../types/character';
import { BIOMES, BIOME_KEYS } from '../utils/levelGenerator';
import { soundManager } from '../utils/audio';
import { buildCharacterRig } from './CharacterModelBuilder';

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
  private previousLaneIndex: number = 1;
  private isOnTrainRoof: boolean = false;
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
  private isLobbyMode: boolean = false;
  private lobbyAnimTime: number = 0;
  private sprayPuffTimer: number = 0;

  // Active Powerups
  private activePowerup: PowerupType = 'none';
  private powerupTimer: number = 0;
  private hoverboardMesh: THREE.Object3D | null = null;
  private sprayCanMesh: THREE.Object3D | null = null;

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
    type: 'low' | 'high' | 'block' | 'double_block' | 'moving' | 'train' | 'moving_train';
    movingDirection?: number;
    speedZ?: number;
    length?: number;
    rampLength?: number;
    hasRamp?: boolean;
    originalX?: number;
    hit: boolean;
    bbox: THREE.Box3;
  }[] = [];

  private collectibles: {
    mesh: THREE.Object3D;
    type: 'coin' | 'magnet' | 'shield' | 'boost' | 'heart' | 'sneakers' | 'jetpack' | 'hoverboard' | '2x' | 'box';
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

  public setLobbyMode(isLobby: boolean) {
    this.isLobbyMode = isLobby;
    if (isLobby) {
      this.playerX = 0;
      this.playerY = 0;
      this.playerBodyGroup.scale.set(0.85, 0.85, 0.85);
      this.playerGroup.position.set(0, 0, this.playerZ);
      this.playerGroup.rotation.y = Math.PI - 0.2;
      this.camera.position.set(0, 1.45, this.playerZ - 3.4);
      this.camera.lookAt(0, 1.15, this.playerZ);
      if (this.chaserGroup) {
        this.chaserGroup.visible = false;
      }
    } else {
      // Subway Surfers Gameplay Proportions: Character is ~half the height of a train!
      this.playerBodyGroup.scale.set(0.6, 0.6, 0.6);
      this.playerGroup.rotation.y = 0;
      this.camera.position.set(0, 6.2, this.playerZ - 9.2);
      this.camera.lookAt(0, 1.0, this.playerZ + 14);
      if (this.chaserGroup) {
        this.chaserGroup.visible = true;
      }
      this.alertPoliceChaser();
    }
  }

  private buildPlayerBodyMesh() {
    const rig = buildCharacterRig(
      this.playerBodyGroup,
      this.characterId,
      this.outfitId,
      this.quality === 'high'
    );
    this.leftArmGroup = rig.leftArmGroup;
    this.rightArmGroup = rig.rightArmGroup;
    this.leftLegGroup = rig.leftLegGroup;
    this.rightLegGroup = rig.rightLegGroup;
    this.torsoMesh = rig.torsoMesh;
    this.headMesh = rig.headMesh;
    this.hoverboardMesh = rig.hoverboardMesh || null;
    this.sprayCanMesh = rig.sprayCanInHand || null;

    const s = this.isLobbyMode ? 0.85 : 0.6;
    this.playerBodyGroup.scale.set(s, s, s);

    if (this.hoverboardMesh) {
      this.hoverboardMesh.visible = this.activePowerup === 'hoverboard';
    }
    if (this.sprayCanMesh) {
      this.sprayCanMesh.visible = this.isLobbyMode;
    }
  }

  // --- Pursuer / Chaser Creation (Police Officer / Politsiyachi) ---
  private createChaser() {
    this.chaserGroup = new THREE.Group();
    this.chaserBodyGroup = new THREE.Group();
    this.chaserBodyGroup.scale.set(0.62, 0.62, 0.62);
    this.chaserGroup.add(this.chaserBodyGroup);

    // Uniform & Character Materials matching Subway Surfers Inspector
    const policeShirtMat = new THREE.MeshStandardMaterial({
      color: 0x365314, // Classic Subway Surfers Olive Green uniform
      roughness: 0.6,
      metalness: 0.1,
    });

    const policePantsMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Dark grey trousers
      roughness: 0.7,
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
      color: 0x365314, // Olive green peaked cap
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

    // The Inspector's Bulldog running alongside
    const dogGroup = new THREE.Group();
    dogGroup.position.set(-0.8, 0, 0.2);

    const dogBodyGeo = new THREE.BoxGeometry(0.38, 0.35, 0.65);
    const dogBodyMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }); // Brown fur
    const dogBody = new THREE.Mesh(dogBodyGeo, dogBodyMat);
    dogBody.position.y = 0.32;
    dogGroup.add(dogBody);

    // Dog Head & Snout
    const dogHeadGeo = new THREE.BoxGeometry(0.32, 0.32, 0.35);
    const dogHead = new THREE.Mesh(dogHeadGeo, dogBodyMat);
    dogHead.position.set(0, 0.45, 0.38);
    dogGroup.add(dogHead);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    snout.position.set(0, 0.38, 0.54);
    dogGroup.add(snout);

    // Red Collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.36), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    collar.position.set(0, 0.42, 0.22);
    dogGroup.add(collar);

    // 4 Pumping Legs
    [-0.14, 0.14].forEach((lx) => {
      [-0.2, 0.2].forEach((lz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), dogBodyMat);
        leg.position.set(lx, 0.12, lz);
        dogGroup.add(leg);
      });
    });

    this.chaserBodyGroup.add(dogGroup);

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

    // 1. Ballast Railway Track Bed (Cobblestone & Gravel)
    const roadWidth = 9.2;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x6e4324, // Warm railway ballast gravel/stone
      roughness: 0.85,
      metalness: 0.1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, 0, SEGMENT_LENGTH / 2);
    roadMesh.receiveShadow = this.quality !== 'low';
    group.add(roadMesh);

    // Ground landscape outside tracks
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

    // 2. Wooden Sleepers (Shpal / Railroad Ties) under all 3 tracks
    const sleeperGeo = new THREE.BoxGeometry(2.1, 0.08, 0.42);
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Dark aged railway wood
      roughness: 0.9,
    });

    const sleeperSpacing = 1.8;
    const sleeperCount = Math.floor(SEGMENT_LENGTH / sleeperSpacing);
    for (let s = 0; s < sleeperCount; s++) {
      const sZ = s * sleeperSpacing + 0.9;
      LANES.forEach((laneX) => {
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(laneX, 0.04, sZ);
        sleeper.receiveShadow = this.quality !== 'low';
        group.add(sleeper);
      });
    }

    // 3. Shiny Metallic Steel Rails (2 parallel rails per track = 6 steel rails total!)
    const railGeo = new THREE.BoxGeometry(0.12, 0.15, SEGMENT_LENGTH);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8, // Polished shiny steel
      metalness: 0.92,
      roughness: 0.22,
    });

    LANES.forEach((laneX) => {
      [-0.72, 0.72].forEach((offset) => {
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(laneX + offset, 0.14, SEGMENT_LENGTH / 2);
        rail.castShadow = this.quality === 'high';
        group.add(rail);
      });
    });

    // 4. Overhead Railway Gantry Arch & Power Lines (High at y = 13.5 so player head never touches on jump!)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, 0, SEGMENT_LENGTH / 2);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.6, roughness: 0.4 });
    const pillarGeo = new THREE.BoxGeometry(0.28, 13.5, 0.28);

    // Left and Right Gantry Towers
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-4.6, 6.75, 0);
    gantryGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(4.6, 6.75, 0);
    gantryGroup.add(rightPillar);

    // Top Overhead Crossbeam (High at y = 13.5)
    const beamGeo = new THREE.BoxGeometry(9.5, 0.3, 0.26);
    const beam = new THREE.Mesh(beamGeo, pillarMat);
    beam.position.set(0, 13.5, 0);
    gantryGroup.add(beam);

    // Hanging Power Line Insulators over each lane
    LANES.forEach((lx) => {
      const insGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8);
      const insMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const ins = new THREE.Mesh(insGeo, insMat);
      ins.position.set(lx, 13.15, 0);
      gantryGroup.add(ins);
    });

    group.add(gantryGroup);

    // 3 Overhead Power Cables along the segment (High at y = 12.95)
    LANES.forEach((lx) => {
      const cableGeo = new THREE.BoxGeometry(0.025, 0.025, SEGMENT_LENGTH);
      const cableMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.position.set(lx, 12.95, SEGMENT_LENGTH / 2);
      group.add(cable);
    });

    // 5. Candy-Cane Striped Railway Crossing Signal Post (Subway Surfers Svetofori)
    const signalGroup = new THREE.Group();
    signalGroup.position.set(4.75, 0, SEGMENT_LENGTH * 0.7);

    // Red and White striped pole
    for (let b = 0; b < 6; b++) {
      const bandGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8);
      const bandMat = new THREE.MeshBasicMaterial({ color: b % 2 === 0 ? 0xdc2626 : 0xffffff });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 0.25 + b * 0.45;
      signalGroup.add(band);
    }

    // Top Signal Box with Glowing Red Lamp
    const boxGeo = new THREE.BoxGeometry(0.35, 0.55, 0.25);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const sBox = new THREE.Mesh(boxGeo, boxMat);
    sBox.position.y = 2.95;
    signalGroup.add(sBox);

    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLight.position.set(0, 3.05, -0.12);
    signalGroup.add(redLight);

    group.add(signalGroup);

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

  // --- Dynamic Subway Surfers City Scenery Generator ---
  private createSceneryForSegment(theme: BiomeTheme, length: number): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];

    // 1. Colorful Subway Surfers City Buildings along both sides
    const buildingColors = [0xc2410c, 0xd97706, 0x991b1b, 0x0284c7, 0xea580c, 0x059669, 0x7c3aed];
    const buildingPositionsZ = [8, 28];

    [-1, 1].forEach((side) => {
      buildingPositionsZ.forEach((zPos, idx) => {
        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        const building = this.createSubwayCityBuilding(side, color);
        building.position.set(side * 9.5, 0, zPos);
        list.push(building);
      });

      // Park trees and street lamps between the buildings
      const treeZ = 18;
      const tree = this.createBiomeProp('forest', theme);
      tree.position.set(side * 6.8, 0, treeZ);
      list.push(tree);

      const lampZ = 34;
      const lamp = this.createBiomeProp('city', theme);
      lamp.position.set(side * 6.8, 0, lampZ);
      list.push(lamp);
    });

    // 2. Periodic Red Brick Railway Arch Bridge crossing all 3 tracks
    if (Math.random() < 0.45) {
      const arch = this.createSubwayBrickArch();
      arch.position.set(0, 0, length * 0.5);
      list.push(arch);
    }

    return list;
  }

  // Authentic Subway Surfers Townhouse City Building with NYC Water Tower & Iron Fire Escapes
  private createSubwayCityBuilding(side: number, color: number): THREE.Object3D {
    const group = new THREE.Group();
    const bW = 6.8;
    const bH = 10.5;
    const bD = 6.2;

    // Main Facade Block
    const facadeGeo = new THREE.BoxGeometry(bW, bH, bD);
    const facadeMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
    });
    const facade = new THREE.Mesh(facadeGeo, facadeMat);
    facade.position.y = bH / 2;
    facade.castShadow = this.quality === 'high';
    facade.receiveShadow = this.quality !== 'low';
    group.add(facade);

    // Classic Stone Roof Cornice Ledge
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(bW + 0.4, 0.5, bD + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    cornice.position.y = bH + 0.25;
    group.add(cornice);

    // Iconic Subway Surfers NYC Wooden Rooftop Water Tower!
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-side * 1.2, bH + 0.5, 0);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 1.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 })
    );
    barrel.position.y = 1.4;
    towerGroup.add(barrel);

    const coneRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
    );
    coneRoof.position.y = 2.75;
    towerGroup.add(coneRoof);
    group.add(towerGroup);

    // Iron Fire Escape Balconies & Slanted Ladder on Street Face
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    [3.8, 7.0].forEach((fy) => {
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 3.8), ironMat);
      balcony.position.set(-side * (bW / 2 + 0.32), fy, 0);
      group.add(balcony);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 3.8), ironMat);
      rail.position.set(-side * (bW / 2 + 0.62), fy + 0.35, 0);
      group.add(rail);
    });

    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.45), ironMat);
    ladder.position.set(-side * (bW / 2 + 0.45), 5.4, 0.4);
    ladder.rotation.x = 0.42;
    group.add(ladder);

    // 6 Windows with White Borders & Dark Glass
    const windowFrameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 });

    [-1.8, 0, 1.8].forEach((wZ) => {
      [4.4, 7.6].forEach((wY) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 1.15), windowFrameMat);
        frame.position.set(-side * (bW / 2 + 0.04), wY, wZ);
        group.add(frame);

        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 0.92), glassMat);
        glass.position.set(-side * (bW / 2 + 0.05), wY, wZ);
        group.add(glass);
      });
    });

    // Ground Floor Striped Shop Awning
    const awningGeo = new THREE.BoxGeometry(0.95, 0.22, 4.4);
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(-side * (bW / 2 + 0.45), 2.5, 0);
    awning.rotation.z = side * 0.32;
    group.add(awning);

    return group;
  }

  // Classic Subway Surfers Red-Brick Railway Arch Bridge (High at y = 14.0m so head never touches!)
  private createSubwayBrickArch(): THREE.Object3D {
    const archGroup = new THREE.Group();
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 });

    // Left and Right Arch Pillars (Height 14.0m)
    [-5.6, 5.6].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 14.0, 2.8), brickMat);
      pillar.position.set(px, 7.0, 0);
      archGroup.add(pillar);
    });

    // Top Overhead Bridge Beam spanning tracks at y = 14.2m
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(13.0, 1.6, 3.2), brickMat);
    bridge.position.set(0, 14.2, 0);
    archGroup.add(bridge);

    // Arch Banner Sign
    const signGeo = new THREE.BoxGeometry(6.2, 0.9, 0.1);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 14.2, -1.65);
    archGroup.add(sign);

    return archGroup;
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

  // --- Obstacle & Collectible Spawning (Subway Surfers Style) ---
  private populateSegment(startZ: number) {
    // Don't spawn obstacles right next to the finish portal
    if (startZ > this.finishZ - 45) return;

    // Number of patterns per 48m segment: 2 well-spaced patterns (24m gap between them)
    const numPatterns = 2;

    for (let i = 0; i < numPatterns; i++) {
      const zPos = startZ + 12 + i * 23;
      if (zPos > this.finishZ - 30) continue;

      const rand = Math.random();

      // Subway Surfers Rule: ALWAYS guarantee at least 1 open lane AND clear ramped vs ramp-less trains (like Image 1)!
      if (startZ >= 48 && rand < 0.44) {
        // Pattern 1: Climbable Train with Front Ramp + Adjacent Ramp-less Train + 100% Open Lane!
        const rampTrainLane = Math.floor(Math.random() * 3);
        const noRampTrainLane = (rampTrainLane + 1) % 3;
        const openLane = (rampTrainLane + 2) % 3;

        // Train WITH Front Ramp (Player CAN climb from front!)
        this.spawnTrain(rampTrainLane, zPos, false, true);

        // Train WITHOUT Ramp (Player CANNOT climb from ground — only reachable by jumping across from the ramped train's roof!)
        this.spawnTrain(noRampTrainLane, zPos + 2.5, false, false);
        for (let c = 0; c < 4; c++) {
          this.spawnCoin(noRampTrainLane, zPos - 2.0 + c * 2.2, 3.05);
        }

        // Spawn line of coins through the 100% open ground lane!
        this.spawnCollectiblesNear(zPos + 4, openLane);
      } else if (startZ >= 96 && rand < 0.62) {
        // Pattern 2: Train with Ramp + Low Hurdle in 2nd lane + Open 3rd lane
        const trainLane = Math.floor(Math.random() * 3);
        this.spawnTrain(trainLane, zPos, false, true);

        const hurdleLane = (trainLane + 1) % 3;
        const openLane = (trainLane + 2) % 3;
        this.spawnLowBarrier(hurdleLane, zPos);
        this.spawnCollectiblesNear(zPos + 4, openLane);
      } else if (rand < 0.75) {
        // Pattern 3: Low Hurdle Barricade (MUST JUMP: 'W / Tepa')
        const hurdleLane = Math.floor(Math.random() * 3);
        this.spawnLowBarrier(hurdleLane, zPos);
        // Other 2 lanes are open
        const openLane = (hurdleLane + 1) % 3;
        this.spawnCollectiblesNear(zPos + 4, openLane);
      } else if (rand < 0.90) {
        // Pattern 4: High Clearance Barrier (MUST SLIDE: 'S / Past')
        const highLane = Math.floor(Math.random() * 3);
        this.spawnHighBarrier(highLane, zPos);
        // Other 2 lanes are open
        const openLane = (highLane + 1) % 3;
        this.spawnCollectiblesNear(zPos + 4, openLane);
      } else {
        // Pattern 5: Oncoming Train rushing down track!
        const trainLane = Math.floor(Math.random() * 3);
        this.spawnTrain(trainLane, zPos + 10, true, false);
        // Other 2 lanes are open
        const openLane = (trainLane + 1) % 3;
        this.spawnCollectiblesNear(zPos + 4, openLane);
      }
    }
  }

  // --- Subway Train Spawner (Subway Surfers Metro Vagoni) ---
  private spawnTrain(lane: number, z: number, isMoving: boolean = false, hasRamp: boolean = false) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, 0, z);

    const trainL = 11.5;
    const trainW = 2.25;
    const trainH = 2.3;

    // Train Body Palette: Subway Red (0xb91c1c), Metro Blue (0x1d4ed8), or Amber Steel (0xd97706)
    const trainColors = [0xb91c1c, 0x1d4ed8, 0xd97706, 0x059669];
    const trainColor = trainColors[Math.abs(lane + Math.floor(z / 40)) % trainColors.length];

    // Main Wagon Body
    const bodyGeo = new THREE.BoxGeometry(trainW, trainH, trainL);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: trainColor,
      roughness: 0.35,
      metalness: 0.5,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = trainH / 2 + 0.15;
    body.castShadow = this.quality === 'high';
    group.add(body);

    // Dark Corrugated Roof
    const roofGeo = new THREE.BoxGeometry(trainW + 0.08, 0.18, trainL + 0.1);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = trainH + 0.2;
    group.add(roof);

    // Front Windscreen / Driver Cabin
    const windGeo = new THREE.BoxGeometry(trainW * 0.85, 0.75, 0.1);
    const windMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const windscreen = new THREE.Mesh(windGeo, windMat);
    windscreen.position.set(0, trainH * 0.7, -trainL / 2 - 0.02);
    group.add(windscreen);

    // Front Headlights (Bright Glowing Lights facing player)
    const lightGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-0.7, 0.75, -trainL / 2 - 0.04);
    group.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(0.7, 0.75, -trainL / 2 - 0.04);
    group.add(rightLight);

    // Front Bumper (Yellow/Black Hazard Stripes)
    const bumperGeo = new THREE.BoxGeometry(trainW + 0.1, 0.4, 0.2);
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.5,
    });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, 0.28, -trainL / 2 - 0.05);
    group.add(bumper);

    // Side Windows (4 on each side)
    const windowGeo = new THREE.BoxGeometry(0.08, 0.65, 1.4);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    for (let w = 0; w < 4; w++) {
      const wZ = -trainL / 2 + 1.8 + w * 2.5;
      const leftW = new THREE.Mesh(windowGeo, windowMat);
      leftW.position.set(-trainW / 2 - 0.02, trainH * 0.68, wZ);
      group.add(leftW);

      const rightW = new THREE.Mesh(windowGeo, windowMat);
      rightW.position.set(trainW / 2 + 0.02, trainH * 0.68, wZ);
      group.add(rightW);
    }

    // Side Racing Stripe
    const stripeGeo = new THREE.BoxGeometry(trainW + 0.04, 0.15, trainL);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = trainH * 0.42;
    group.add(stripe);

    // Undercarriage Train Wheels (4 wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    [-trainL / 2 + 1.2, trainL / 2 - 1.2].forEach((wheelZ) => {
      const w1 = new THREE.Mesh(wheelGeo, wheelMat);
      w1.position.set(-trainW / 2 + 0.15, 0.28, wheelZ);
      group.add(w1);

      const w2 = new THREE.Mesh(wheelGeo, wheelMat);
      w2.position.set(trainW / 2 - 0.15, 0.28, wheelZ);
      group.add(w2);
    });

    // Optional Front Ramp (Subway Surfers Red/Amber Boarding Ramp with Upward Arrow ↑ like Image 1!)
    if (hasRamp) {
      const rampGroup = new THREE.Group();
      // Sloped ramp extending from z = -trainL/2 - 4.4 (y=0) to z = -trainL/2 (y=2.45)
      const rampGeo = new THREE.BoxGeometry(trainW + 0.14, 0.24, 4.95);
      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b, // Iconic Subway Surfers Crimson/Maroon Ramp Base
        roughness: 0.55,
      });
      const ramp = new THREE.Mesh(rampGeo, rampMat);
      ramp.position.set(0, 1.22, -trainL / 2 - 2.1);
      ramp.rotation.x = -0.525;
      rampGroup.add(ramp);

      // Upward Arrow (↑) Stem & Chevron painted on the Ramp Surface!
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const arrowStem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 2.6), arrowMat);
      arrowStem.position.set(0, 1.24, -trainL / 2 - 2.1);
      arrowStem.rotation.x = -0.525;
      rampGroup.add(arrowStem);

      const arrowHead = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.55), arrowMat);
      arrowHead.position.set(0, 1.88, -trainL / 2 - 0.95);
      arrowHead.rotation.x = -0.525;
      rampGroup.add(arrowHead);

      // Yellow safety side rails on ramp so player clearly spots climbable trains
      const railGeo = new THREE.BoxGeometry(0.14, 0.3, 4.95);
      [-trainW / 2, trainW / 2].forEach((rx) => {
        const rail = new THREE.Mesh(railGeo, arrowMat);
        rail.position.set(rx, 1.32, -trainL / 2 - 2.1);
        rail.rotation.x = -0.525;
        rampGroup.add(rail);
      });

      group.add(rampGroup);

      // Spawn gold coins leading up the ramp and across the train roof, plus a special Gift Box / Magnet / Boost at the roof end!
      for (let c = 0; c < 5; c++) {
        const coinZ = z - trainL / 2 - 1.5 + c * 2.4;
        const coinY = c === 0 ? 1.35 : trainH + 0.65;
        if (c === 4 && Math.random() < 0.55) {
          const roofPowerups: ('box' | 'magnet' | 'boost')[] = ['box', 'magnet', 'boost'];
          const pType = roofPowerups[Math.floor(Math.random() * roofPowerups.length)];
          this.spawnPowerup(pType, lane, coinZ, trainH + 0.85);
        } else {
          this.spawnCoin(lane, coinZ, coinY);
        }
      }
    }

    this.scene.add(group);

    const bbox = new THREE.Box3();
    bbox.setFromObject(group);

    this.obstacles.push({
      mesh: group,
      lane,
      z,
      type: isMoving ? 'moving_train' : 'train',
      speedZ: isMoving ? 8.5 : 0,
      length: trainL,
      rampLength: hasRamp ? 4.4 : 0,
      hasRamp,
      hit: false,
      bbox,
    });
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

  private spawnCollectiblesNear(z: number, specificLane?: number) {
    const lane = specificLane !== undefined ? specificLane : Math.floor(Math.random() * 3);
    const rand = Math.random();

    // Check if we should spawn a rare powerup or Mystery Gift Box (Sovg'a)
    if (rand < 0.16) {
      const pTypes: ('magnet' | 'shield' | 'boost' | 'sneakers' | 'box' | 'heart')[] = [
        'magnet',
        'boost',
        'box',
        'shield',
        'sneakers',
      ];
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

    // 3D Spinning Subway Star Coin
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
    coinGeo.rotateZ(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Bright Gold
      metalness: 0.9,
      roughness: 0.18,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
    });
    const coinMesh = new THREE.Mesh(coinGeo, coinMat);
    group.add(coinMesh);

    // Embossed Star on Coin Faces
    const starGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 5);
    starGeo.rotateZ(Math.PI / 2);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    group.add(starMesh);

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

  private spawnPowerup(
    type: 'magnet' | 'shield' | 'boost' | 'sneakers' | 'box' | 'heart',
    lane: number,
    z: number,
    y: number = 1.3
  ) {
    const group = new THREE.Group();
    const x = LANES[lane];
    group.position.set(x, y, z);

    if (type === 'magnet') {
      // Subway Surfers Iconic Red & Gold Horseshoe Magnet!
      const magnetGroup = new THREE.Group();
      const arcGeo = new THREE.TorusGeometry(0.45, 0.12, 12, 24, Math.PI);
      arcGeo.rotateZ(Math.PI);
      const arcMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.5, roughness: 0.3 });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      magnetGroup.add(arc);

      // Silver Magnetic Poles
      const poleGeo = new THREE.BoxGeometry(0.24, 0.35, 0.24);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
      [-0.45, 0.45].forEach((px) => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, -0.22, 0);
        magnetGroup.add(pole);
      });

      // Golden Aura
      const aura = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 8, 20), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      magnetGroup.add(aura);

      group.add(magnetGroup);
    } else if (type === 'box') {
      // Subway Surfers Iconic Mystery Gift Box (Sovg'a Qutisi)!
      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.66, 0.66),
        new THREE.MeshStandardMaterial({
          color: 0xe11d48,
          emissive: 0xbe123c,
          emissiveIntensity: 0.35,
          roughness: 0.25,
        })
      );
      boxGroup.add(cube);

      // Golden Cross Ribbons
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0xeab308,
        emissiveIntensity: 0.4,
      });
      const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.16), ribbonMat);
      const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.7), ribbonMat);
      boxGroup.add(rib1, rib2);

      // Top Golden Bow
      const bow1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16), ribbonMat);
      bow1.position.set(-0.12, 0.4, 0);
      bow1.rotation.z = 0.4;
      const bow2 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16), ribbonMat);
      bow2.position.set(0.12, 0.4, 0);
      bow2.rotation.z = -0.4;
      boxGroup.add(bow1, bow2);

      group.add(boxGroup);
    } else if (type === 'sneakers') {
      // Subway Surfers Iconic Green & White Super Sneakers!
      const shoeGroup = new THREE.Group();
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.18, 0.78),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      sole.position.y = -0.15;
      shoeGroup.add(sole);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.34, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.35 })
      );
      upper.position.set(0, 0.08, -0.05);
      shoeGroup.add(upper);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.045, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      shoeGroup.add(ring);
      group.add(shoeGroup);
    } else {
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
    }

    this.scene.add(group);

    this.collectibles.push({
      mesh: group,
      type,
      lane,
      z,
      y,
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

  // --- Player Controls (WASD / Arrows / Swipes) ---
  public moveLeft() {
    if (this.targetLaneIndex > 0) {
      this.previousLaneIndex = this.targetLaneIndex;
      this.targetLaneIndex--;
      soundManager.playLaneSwitch('left');
    }
  }

  public moveRight() {
    if (this.targetLaneIndex < 2) {
      this.previousLaneIndex = this.targetLaneIndex;
      this.targetLaneIndex++;
      soundManager.playLaneSwitch('right');
    }
  }

  public jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.isSliding = false;
      this.slideTimer = 0;
      // Snappy Subway Surfers hop (1.28m): clears low hurdles cleanly, NEVER touches top of screen, and CANNOT jump onto ramp-less trains from ground!
      this.jumpVelocity = this.activePowerup === 'sneakers' ? 15.2 : 9.8;
      soundManager.playJump(this.activePowerup === 'sneakers');
    }
  }

  public slide() {
    this.isSliding = true;
    this.slideTimer = 0.75; // duration of slide
    soundManager.playSlide(this.isJumping);

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

    if (this.isLobbyMode) {
      this.lobbyAnimTime += dt * 2.2;
      const breathe = Math.sin(this.lobbyAnimTime);
      this.playerBodyGroup.position.y = breathe * 0.035;
      this.leftArmGroup.rotation.x = Math.sin(this.lobbyAnimTime * 0.8) * 0.1;
      this.rightArmGroup.rotation.x = -Math.sin(this.lobbyAnimTime * 0.8) * 0.1;
      this.leftLegGroup.rotation.x = 0;
      this.rightLegGroup.rotation.x = 0;
      this.playerBodyGroup.rotation.x = 0;
      this.playerBodyGroup.rotation.z = 0;

      // Gentle turntable sway in 3D lobby
      this.playerGroup.rotation.y = Math.PI - 0.2 + Math.sin(this.lobbyAnimTime * 0.4) * 0.22;

      this.camera.position.set(0, 1.45, this.playerZ - 3.4);
      this.camera.lookAt(0, 1.15, this.playerZ);
      return;
    }

    // 1. Forward Movement
    const speedMultiplier = this.activePowerup === 'boost' ? 1.55 : 1.0;
    const forwardStep = this.currentSpeed * speedMultiplier * dt;
    this.playerZ += forwardStep;
    this.score += Math.round(forwardStep * this.multiplier * (this.activePowerup === 'boost' ? 2 : 1));

    // 2. Lane Switching (Smooth Lerp + Banking tilt)
    const targetX = LANES[this.targetLaneIndex];
    const dx = targetX - this.playerX;
    this.playerX += dx * Math.min(1, 20 * dt);

    // Once player has settled into the target lane (or is running on a train roof), sync previousLaneIndex so player NEVER auto-shifts lanes later!
    if (Math.abs(dx) < 0.15 || this.isOnTrainRoof) {
      this.previousLaneIndex = this.targetLaneIndex;
    }

    // Roll angle based on lane movement
    const bankAngle = -dx * 0.18;
    this.playerBodyGroup.rotation.z = bankAngle;

    // 3. Platform & Train Roof Ground Check (STRICT Subway Surfers Rule: ONLY climb via Front Ramp!)
    let currentGroundY = 0;
    const pZ = this.playerZ;
    const pX = this.playerX;

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.type === 'train' || obs.type === 'moving_train') {
        const trainX = LANES[obs.lane];
        const halfL = 11.5 / 2;
        const trainFrontZ = obs.z - halfL;
        const trainBackZ = obs.z + halfL;

        // Check if player is in the train's lane
        if (Math.abs(pX - trainX) < 1.25) {
          // A. Climbing up the Front Ramp (ONLY if train has a ramp and player entered from the front!)
          if (obs.hasRamp) {
            const rampStartZ = trainFrontZ - 4.5;
            if (pZ >= rampStartZ && pZ <= trainFrontZ + 0.4) {
              const rampProgress = Math.max(0, Math.min(1, (pZ - rampStartZ) / 4.3));
              const rampY = rampProgress * 2.45;
              // Player must be within step-up height of the ramp slope (prevents climbing from the side!)
              if (this.playerY >= rampY - 0.85 || this.isOnTrainRoof) {
                currentGroundY = Math.max(currentGroundY, rampY);
                if (rampProgress >= 0.65 && !this.isOnTrainRoof) {
                  this.isOnTrainRoof = true;
                  soundManager.playLand(true);
                }
              }
            }
          }

          // B. Running on the Train Roof (ONLY if player ALREADY climbed a ramp or jumped from another train roof!)
          if (pZ >= trainFrontZ && pZ <= trainBackZ) {
            if (this.isOnTrainRoof || (this.activePowerup === 'sneakers' && this.playerY >= 2.35)) {
              this.isOnTrainRoof = true;
              currentGroundY = 2.45;
            }
          }
        }
      }
    }

    // Apply vertical physics with dynamic currentGroundY
    if (this.isJumping) {
      this.playerY += this.jumpVelocity * dt;
      this.jumpVelocity -= 38 * dt; // Crisp Subway Surfers gravity

      if (this.playerY <= currentGroundY) {
        this.playerY = currentGroundY;
        this.isJumping = false;
        this.jumpVelocity = 0;
        soundManager.playLand(this.isOnTrainRoof || currentGroundY >= 2.2);
      }
    } else {
      if (this.playerY > currentGroundY) {
        // Player running off the back of a train or stepping down
        this.playerY -= 30 * dt;
        if (this.playerY < currentGroundY) {
          this.playerY = currentGroundY;
        }
      } else if (this.playerY < currentGroundY) {
        // Climbing up ramp smoothly
        this.playerY = currentGroundY;
      }
    }

    // Reset isOnTrainRoof when player drops below roof level and is not on a ramp
    if (this.playerY < 1.9 && currentGroundY < 1.9) {
      this.isOnTrainRoof = false;
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

    // Update Player Bounding Box for Collisions (Scaled to 0.6 Subway Surfers proportions)
    const effectiveHeight = this.isSliding ? 0.55 : 1.35;
    const minY = this.playerY;
    const maxY = this.playerY + effectiveHeight;
    this.playerBox.min.set(this.playerX - 0.36, minY, this.playerZ - 0.36);
    this.playerBox.max.set(this.playerX + 0.36, maxY, this.playerZ + 0.36);

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

  // --- Smooth Camera Following (High Subway Surfers Angle — Head NEVER touches top of screen!) ---
  private updateCamera(dt: number) {
    if (this.isLobbyMode) return;

    const aspect = this.camera.aspect || 1;
    const isPortraitMobile = aspect < 1.0;

    // High Subway Surfers camera looking down at tracks; tracks playerY 1:1 so jumping never pushes head to top!
    const targetCamX = this.playerX * (isPortraitMobile ? 0.36 : 0.45);
    const targetCamY = (isPortraitMobile ? 6.6 : 5.9) + this.playerY * 1.0;
    const targetCamZ = this.playerZ - (isPortraitMobile ? 9.8 : 8.6);

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 12 * dt);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 25 * dt);
    this.camera.position.z = targetCamZ;

    // Camera LookAt rises 1:1 with playerY so player stays in lower half of screen at all times
    const lookX = this.playerX * 0.6;
    const lookY = 1.05 + this.playerY * 0.95;
    const lookZ = this.playerZ + 14;

    this.camera.lookAt(lookX, lookY, lookZ);

    // Responsive FOV for mobile phones vs desktop + dynamic boost expansion
    const baseFov = isPortraitMobile ? Math.min(82, Math.round(64 / Math.pow(aspect, 0.32))) : 64;
    const targetFov = this.activePowerup === 'boost' ? baseFov + 10 : baseFov;
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

      // Moving Oncoming Train update (travels toward player down the tracks!)
      if (obs.type === 'moving_train' && obs.speedZ !== undefined) {
        obs.z -= obs.speedZ * dt;
        obs.mesh.position.z = obs.z;
        obs.bbox.setFromObject(obs.mesh);
      }

      // Collision Detection with Player
      const checkDist = obs.type === 'train' || obs.type === 'moving_train' ? 11.5 : 2.5;
      if (!obs.hit && Math.abs(obs.z - pZ) < checkDist) {
        let isColliding = false;

        if (obs.type === 'train' || obs.type === 'moving_train') {
          const trainX = LANES[obs.lane];
          const inTrainLane = Math.abs(this.playerX - trainX) < 1.15;
          const halfL = 11.5 / 2;
          const trainFrontZ = obs.z - halfL;
          const trainBackZ = obs.z + halfL;

          if (inTrainLane) {
            if (this.isOnTrainRoof || this.playerY >= 1.15 || pZ >= trainBackZ - 0.45) {
              // Safely running on top of the train roof or dropping straight down off the back end of the train!
              isColliding = false;
            } else if (obs.hasRamp && pZ >= trainFrontZ - 5.0 && pZ <= trainFrontZ + 0.6) {
              // Climbing up the front ramp — 100% safe!
              isColliding = false;
            } else if (pZ + 0.38 >= trainFrontZ && pZ < trainBackZ - 0.45) {
              // Player is on the ground (not on roof) and hit the train!
              // ONLY bounce back if player is actively mid-swipe into the side of the train from an adjacent lane!
              const isActivelySwipingIn =
                Math.abs(this.playerX - trainX) > 0.22 &&
                this.targetLaneIndex === obs.lane &&
                this.previousLaneIndex !== obs.lane;

              if (pZ > trainFrontZ + 0.45 && isActivelySwipingIn) {
                this.targetLaneIndex = this.previousLaneIndex;
                this.screenShakeIntensity = 0.25;
                soundManager.playStumble();
                this.alertPoliceChaser();
                isColliding = false;
              } else {
                // Direct front collision with a ramp-less train!
                isColliding = true;
              }
            }
          }
        } else {
          // Standard barrier / block bounding box check
          obs.bbox.setFromObject(obs.mesh);
          isColliding = this.playerBox.intersectsBox(obs.bbox);

          if (obs.type === 'high' && this.isSliding) {
            // Ducking under high barrier
            isColliding = false;
          } else if (obs.type === 'low' && this.playerY > 0.85) {
            // Jumping over low barrier
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
      soundManager.playBoostSmash();
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
      soundManager.playShieldBreak();
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
    type: 'coin' | 'magnet' | 'shield' | 'boost' | 'heart' | 'sneakers' | 'jetpack' | 'hoverboard' | '2x' | 'box';
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
      soundManager.playMagnetPickup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 16, 0x38bdf8);
    } else if (item.type === 'shield') {
      this.activePowerup = 'shield';
      this.powerupTimer = 15;
      this.shieldSphereMesh.visible = true;
      soundManager.playShieldPickup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 16, 0x10b981);
    } else if (item.type === 'boost') {
      this.activePowerup = 'boost';
      this.powerupTimer = 5;
      soundManager.playSpeedBoost();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 22, 0xf97316);
    } else if (item.type === 'sneakers') {
      this.activePowerup = 'sneakers';
      this.powerupTimer = 12;
      soundManager.playSneakersPickup();
      this.triggerParticles(item.mesh.position.x, 1.2, item.z, 20, 0x22c55e);
    } else if (item.type === 'box') {
      // Mystery Gift Box (Sovg'a): awards bonus coins, score, and plays special Gift Box sound!
      this.coins += 20;
      this.score += 500 * this.multiplier;
      soundManager.playGiftBox();
      this.triggerParticles(item.mesh.position.x, 1.3, item.z, 28, 0xfacc15);
    } else if (item.type === 'heart') {
      if (this.health < this.maxHealth) {
        this.health++;
        this.callbacks.onHealthUpdate(this.health);
      }
      soundManager.playHeartPickup();
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
