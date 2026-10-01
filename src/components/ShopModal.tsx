import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, ShoppingBag, Check, Lock, Sparkles, Shirt, UserCheck, Shield } from 'lucide-react';
import { CHARACTERS_CATALOG, CharacterItem, CharacterOutfit } from '../types/character';
import { soundManager } from '../utils/audio';

interface ShopModalProps {
  totalCoins: number;
  selectedCharacterId: string;
  selectedOutfitId: string;
  unlockedCharacters: string[];
  unlockedOutfits: string[];
  onBuyCharacter: (charId: string, price: number) => void;
  onSelectCharacter: (charId: string) => void;
  onBuyOutfit: (outfitId: string, price: number) => void;
  onSelectOutfit: (outfitId: string) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  totalCoins,
  selectedCharacterId,
  selectedOutfitId,
  unlockedCharacters,
  unlockedOutfits,
  onBuyCharacter,
  onSelectCharacter,
  onBuyOutfit,
  onSelectOutfit,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'outfits'>('characters');
  const [previewCharId, setPreviewCharId] = useState<string>(selectedCharacterId);
  const [previewOutfitId, setPreviewOutfitId] = useState<string>(selectedOutfitId);

  // 3D Preview Canvas Ref
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  const previewChar = CHARACTERS_CATALOG.find((c) => c.id === previewCharId) || CHARACTERS_CATALOG[0];
  const previewOutfit = previewChar.outfits.find((o) => o.id === previewOutfitId) || previewChar.outfits[0];

  // 3D Preview Turntable
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const container = previewCanvasRef.current;
    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Bright studio lights
    const amb = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(amb);

    const dir1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dir1.position.set(5, 10, 7);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dir2.position.set(-5, 5, -5);
    scene.add(dir2);

    // Character Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Build the 3D model
    const suitMaterial = new THREE.MeshStandardMaterial({
      color: previewOutfit.suitColor,
      roughness: 0.28,
      metalness: 0.35,
    });
    const armorMaterial = new THREE.MeshStandardMaterial({
      color: previewOutfit.armorColor,
      roughness: 0.35,
      metalness: 0.5,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: previewOutfit.accentColor,
      roughness: 0.25,
      metalness: 0.4,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: previewOutfit.glowColor,
    });

    const isTitan = previewChar.modelStyle === 'titan';
    const isValkyrie = previewChar.modelStyle === 'valkyrie';
    const torsoW = isTitan ? 1.05 : isValkyrie ? 0.72 : 0.8;
    const torsoH = isTitan ? 1.02 : isValkyrie ? 0.92 : 0.95;
    const torsoD = isTitan ? 0.62 : isValkyrie ? 0.46 : 0.5;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
    const torso = new THREE.Mesh(torsoGeo, suitMaterial);
    torso.position.y = 1.1;
    modelGroup.add(torso);

    // Core
    const coreGeo = new THREE.CylinderGeometry(isTitan ? 0.2 : 0.14, isTitan ? 0.2 : 0.14, 0.08, 16);
    coreGeo.rotateX(Math.PI / 2);
    const core = new THREE.Mesh(coreGeo, glowMaterial);
    core.position.set(0, 1.2, torsoD / 2 + 0.02);
    modelGroup.add(core);

    // Head
    const headSize = isTitan ? 0.62 : 0.52;
    const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
    const head = new THREE.Mesh(headGeo, armorMaterial);
    head.position.y = isTitan ? 1.9 : 1.85;
    modelGroup.add(head);

    // Specific Headgear & Accessories
    if (previewChar.modelStyle === 'bolt') {
      const vGeo = new THREE.BoxGeometry(0.48, 0.16, 0.1);
      const vMesh = new THREE.Mesh(vGeo, glowMaterial);
      vMesh.position.set(0, 1.88, 0.24);
      modelGroup.add(vMesh);

      const packGeo = new THREE.BoxGeometry(0.5, 0.58, 0.26);
      const packMesh = new THREE.Mesh(packGeo, armorMaterial);
      packMesh.position.set(0, 1.15, -0.34);
      modelGroup.add(packMesh);
    } else if (previewChar.modelStyle === 'titan') {
      [-0.32, 0.32].forEach((hx) => {
        const hornGeo = new THREE.ConeGeometry(0.1, 0.35, 6);
        hornGeo.rotateZ(hx < 0 ? -0.45 : 0.45);
        const horn = new THREE.Mesh(hornGeo, accentMaterial);
        horn.position.set(hx, 2.25, 0);
        modelGroup.add(horn);
      });
      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.08), glowMaterial);
      eyeSlit.position.set(0, 1.92, 0.3);
      modelGroup.add(eyeSlit);
    } else if (previewChar.modelStyle === 'valkyrie') {
      [-1, 1].forEach((dir) => {
        const wingGeo = new THREE.BoxGeometry(0.12, 1.05, 0.04);
        wingGeo.rotateZ(dir * 0.45);
        wingGeo.rotateY(dir * 0.2);
        const wing = new THREE.Mesh(wingGeo, glowMaterial);
        wing.position.set(dir * 0.45, 1.35, -0.28);
        modelGroup.add(wing);
      });
    } else if (previewChar.modelStyle === 'shinobi') {
      [-0.35, 0.35].forEach((angle, idx) => {
        const scabbardGeo = new THREE.BoxGeometry(0.08, 1.15, 0.08);
        scabbardGeo.rotateZ(angle);
        const scabbard = new THREE.Mesh(scabbardGeo, armorMaterial);
        scabbard.position.set(idx === 0 ? -0.1 : 0.1, 1.25, -0.32);
        modelGroup.add(scabbard);
      });
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.1), suitMaterial);
      mask.position.set(0, 1.76, 0.24);
      modelGroup.add(mask);
    } else if (previewChar.modelStyle === 'paladin') {
      const haloGeo = new THREE.TorusGeometry(0.36, 0.038, 16, 28);
      const halo = new THREE.Mesh(haloGeo, glowMaterial);
      halo.position.set(0, 2.05, -0.15);
      modelGroup.add(halo);

      const capeGeo = new THREE.BoxGeometry(0.72, 1.15, 0.05);
      capeGeo.rotateX(0.18);
      const cape = new THREE.Mesh(capeGeo, accentMaterial);
      cape.position.set(0, 0.95, -0.38);
      modelGroup.add(cape);
    }

    // Arms
    const armW = isTitan ? 0.32 : 0.24;
    const armH = isTitan ? 0.85 : 0.75;
    const armGeo = new THREE.BoxGeometry(armW, armH, armW);
    armGeo.translate(0, -armH / 2, 0);

    const leftArm = new THREE.Mesh(armGeo, suitMaterial);
    leftArm.position.set(-(torsoW / 2 + armW / 2 + 0.04), 1.45, 0);
    modelGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, suitMaterial);
    rightArm.position.set(torsoW / 2 + armW / 2 + 0.04, 1.45, 0);
    modelGroup.add(rightArm);

    // Shoulders
    if (isTitan) {
      [-1, 1].forEach((dir) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), accentMaterial);
        p.position.set(dir * (torsoW / 2 + armW / 2 + 0.04), 1.45, 0);
        modelGroup.add(p);
      });
    }

    // Legs
    const legW = isTitan ? 0.34 : 0.28;
    const legH = isTitan ? 0.8 : 0.75;
    const legGeo = new THREE.BoxGeometry(legW, legH, legW);
    legGeo.translate(0, -legH / 2, 0);

    const leftLeg = new THREE.Mesh(legGeo, armorMaterial);
    leftLeg.position.set(-0.25, 0.7, 0);
    modelGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, armorMaterial);
    rightLeg.position.set(0.25, 0.7, 0);
    modelGroup.add(rightLeg);

    // Platform ring underneath
    const platGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.1, 24);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.6,
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.y = -0.05;
    modelGroup.add(platform);

    const ringGeo = new THREE.TorusGeometry(1.28, 0.03, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: previewOutfit.glowColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    modelGroup.add(ring);

    // Animation Loop (Slow smooth turntable spin)
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      modelGroup.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [previewCharId, previewOutfitId, previewChar, previewOutfit]);

  // Handle Character Purchase or Selection
  const handleCharacterAction = (char: CharacterItem) => {
    const isUnlocked = unlockedCharacters.includes(char.id);

    if (isUnlocked) {
      onSelectCharacter(char.id);
      soundManager.playCoin();
    } else {
      if (totalCoins >= char.price) {
        onBuyCharacter(char.id, char.price);
        soundManager.playPowerup();
      } else {
        alert(`Tangalar yetarli emas! Sizda ${totalCoins} tanga bor, bu qahramon uchun esa ${char.price} tanga kerak.`);
      }
    }
  };

  // Handle Outfit Purchase or Selection
  const handleOutfitAction = (outfit: CharacterOutfit) => {
    const isUnlocked = unlockedOutfits.includes(outfit.id);

    if (isUnlocked) {
      onSelectOutfit(outfit.id);
      soundManager.playCoin();
    } else {
      if (totalCoins >= outfit.price) {
        onBuyOutfit(outfit.id, outfit.price);
        soundManager.playPowerup();
      } else {
        alert(`Tangalar yetarli emas! Sizda ${totalCoins} tanga bor, bu libos uchun esa ${outfit.price} tanga kerak.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Qahramonlar va Kiyimlar</h2>
              <p className="text-xs text-slate-400">Yangi qahramonlar va maxsus liboslarni tangaga sotib oling</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Coin Balance Badge */}
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 px-3.5 py-1.5 rounded-2xl shadow-lg">
              <div className="w-5 h-5 rounded-full bg-amber-400 border border-amber-200 flex items-center justify-center text-xs font-black text-amber-950 shadow-sm">
                ¢
              </div>
              <span className="font-mono font-black text-amber-300 text-base sm:text-lg">
                {totalCoins.toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'characters'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>QAHRAMONLAR (5 ta Qahramon)</span>
          </button>

          <button
            onClick={() => setActiveTab('outfits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'outfits'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>LIBOSLAR VA KIYIMLAR</span>
          </button>
        </div>

        {/* Modal Body: Left 3D Turntable Preview, Right Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: 3D Real-time Turntable Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-between p-4 rounded-3xl bg-slate-950/70 border border-slate-800 relative">
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-sky-400 tracking-wider">
                3D Jonli Ko‘rinish
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {previewChar.name}
              </span>
            </div>

            {/* Canvas Mount */}
            <div
              ref={previewCanvasRef}
              className="w-full h-56 sm:h-72 flex items-center justify-center my-2 cursor-grab"
            />

            {/* Preview Outfit Specs */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{previewOutfit.name}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: `#${previewOutfit.suitColor.toString(16).padStart(6, '0')}` }}
                    title="Kostyum rangi"
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: `#${previewOutfit.glowColor.toString(16).padStart(6, '0')}` }}
                    title="Nur / Neon rangi"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{previewOutfit.description}</p>
            </div>
          </div>

          {/* Right Column: Cards Grid */}
          <div className="md:col-span-7 space-y-3 overflow-y-auto max-h-[58vh] pr-1">
            {activeTab === 'characters' && (
              <div className="space-y-3">
                {CHARACTERS_CATALOG.map((char) => {
                  const isUnlocked = unlockedCharacters.includes(char.id);
                  const isSelected = selectedCharacterId === char.id;
                  const isPreviewed = previewCharId === char.id;
                  const canAfford = totalCoins >= char.price;

                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        setPreviewCharId(char.id);
                        const defOutfit = char.outfits[0].id;
                        setPreviewOutfitId(defOutfit);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-sky-950/70 border-sky-500 ring-2 ring-sky-500/40'
                          : isPreviewed
                          ? 'bg-slate-800/80 border-sky-400/80'
                          : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">{char.name}</h3>
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full">
                              KIYILGAN
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-sky-400 mt-0.5">{char.role}</div>
                        <p className="text-xs text-slate-400 mt-1">{char.description}</p>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Faol</span>
                          </div>
                        ) : isUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCharacterAction(char);
                            }}
                            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                          >
                            Tanlash
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCharacterAction(char);
                            }}
                            disabled={!canAfford}
                            className={`px-4 py-2.5 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{char.price} tanga</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'outfits' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-300">
                    <strong className="text-sky-400">{previewChar.name}</strong> uchun liboslar:
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {previewChar.outfits.length} ta libos
                  </span>
                </div>

                {previewChar.outfits.map((outfit) => {
                  const isUnlocked = unlockedOutfits.includes(outfit.id);
                  const isSelected = selectedOutfitId === outfit.id;
                  const isPreviewed = previewOutfitId === outfit.id;
                  const canAfford = totalCoins >= outfit.price;

                  return (
                    <div
                      key={outfit.id}
                      onClick={() => setPreviewOutfitId(outfit.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/40'
                          : isPreviewed
                          ? 'bg-slate-800/80 border-indigo-400/80'
                          : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Color swatch circle */}
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `#${outfit.suitColor.toString(16).padStart(6, '0')}` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: `#${outfit.glowColor.toString(16).padStart(6, '0')}` }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{outfit.name}</h4>
                            {isSelected && (
                              <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                                KIYILGAN
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{outfit.description}</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected ? (
                          <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Kiyilgan</span>
                          </div>
                        ) : isUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOutfitAction(outfit);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
                          >
                            Kiyish
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOutfitAction(outfit);
                            }}
                            disabled={!canAfford}
                            className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{outfit.price} tanga</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Jami tangalar yugurish davomida avtomatik jamlanadi va saqlanadi.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition active:scale-95 shadow-md cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
