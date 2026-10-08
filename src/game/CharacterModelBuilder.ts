import * as THREE from 'three';
import { CHARACTERS_CATALOG } from '../types/character';

export interface BuiltCharacterRig {
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  floatingAccents?: THREE.Object3D[];
  hoverboardMesh?: THREE.Object3D;
  sprayCanInHand?: THREE.Object3D;
}

export function buildCharacterRig(
  parentGroup: THREE.Group,
  characterId: string,
  outfitId: string,
  isHighQuality: boolean = true
): BuiltCharacterRig {
  // Clear any existing children
  while (parentGroup.children.length > 0) {
    parentGroup.remove(parentGroup.children[0]);
  }

  const charData = CHARACTERS_CATALOG.find((c) => c.id === characterId) || CHARACTERS_CATALOG[0];
  const outfit = charData.outfits.find((o) => o.id === outfitId) || charData.outfits[0];
  const style = charData.modelStyle;

  // Materials based on outfit colors
  const suitMaterial = new THREE.MeshStandardMaterial({
    color: outfit.suitColor,
    roughness: 0.35,
    metalness: 0.25,
  });

  const armorMaterial = new THREE.MeshStandardMaterial({
    color: outfit.armorColor,
    roughness: 0.4,
    metalness: 0.3,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: outfit.accentColor,
    roughness: 0.3,
    metalness: 0.3,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: outfit.glowColor,
  });

  const floatingAccents: THREE.Object3D[] = [];

  // Skin Tone Selection per Character (Matching the "Two Year Anniversary" Lineup Image!)
  const isRobot = style === 'pilot';
  const skinColorHex =
    style === 'zoe'
      ? 0xa3e635 // Zoe's iconic bright green zombie skin!
      : style === 'valkyrie' || style === 'frizzy' || style === 'king' || style === 'carmen'
      ? 0x9a5b32 // Warm rich brown skin (Fresh, Frizzy, King, Carmen)
      : style === 'princek' || style === 'biker' || style === 'kim'
      ? 0xc68652 // Medium warm tan skin
      : style === 'ella' || style === 'harumi' || style === 'cyberpunk'
      ? 0xfde6d8 // Fair porcelain skin (Coco, Harumi, Lucy)
      : 0xf4b993; // Sunny cartoon peach skin (Jake, Tricky, Spike, Yutani, Tasha, Brody, Sun, Alex)

  const faceMat = isRobot
    ? new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.25 })
    : new THREE.MeshStandardMaterial({ color: skinColorHex, roughness: 0.55 });

  // Dimensions — Stylized Subway Surfers Crew Proportions
  const torsoW = 0.74;
  const torsoH = 0.9;
  const torsoD = 0.44;

  // 1. Torso Mesh
  const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
  const torsoMesh = new THREE.Mesh(torsoGeo, suitMaterial);
  torsoMesh.position.y = 1.08;
  torsoMesh.castShadow = isHighQuality;
  parentGroup.add(torsoMesh);

  // Character-Specific Front Torso Details (Matching the Two Year Anniversary image!)
  if (style === 'bolt') {
    // JAKE: Open Blue Denim Vest over White Hoodie + Red Bandana Collar
    const denimMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65 });
    [-0.21, 0.21].forEach((vx) => {
      const vestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.25, torsoH * 0.94, 0.06), denimMat);
      vestPanel.position.set(vx, 1.08, torsoD / 2 + 0.02);
      parentGroup.add(vestPanel);
    });
    const bandana = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    bandana.position.set(0, 1.44, torsoD / 2 + 0.025);
    parentGroup.add(bandana);
  } else if (style === 'shinobi') {
    // SPIKE: White Shirt + Blue Striped Tie under Open Black Vest!
    const shirtFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, torsoH * 0.94, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    shirtFront.position.set(0, 1.08, torsoD / 2 + 0.015);
    parentGroup.add(shirtFront);

    const blueTie = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.52, 0.055),
      new THREE.MeshBasicMaterial({ color: 0x2563eb })
    );
    blueTie.position.set(0, 1.16, torsoD / 2 + 0.025);
    parentGroup.add(blueTie);
  } else if (style === 'titan') {
    // TRICKY: White Crop Top with Red Waistband & Midriff
    const waistBand = new THREE.Mesh(
      new THREE.BoxGeometry(torsoW + 0.02, 0.16, torsoD + 0.02),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    waistBand.position.set(0, 0.72, 0);
    parentGroup.add(waistBand);
  } else if (style === 'king') {
    // KING: Green Peace Sign on Chest & Gold Chain
    const peaceCircle = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.03, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0x84cc16 })
    );
    peaceCircle.position.set(0, 1.05, torsoD / 2 + 0.025);
    parentGroup.add(peaceCircle);

    const goldChain = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.08, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    goldChain.position.set(0, 1.38, torsoD / 2 + 0.025);
    parentGroup.add(goldChain);
  } else if (style === 'harumi') {
    // HARUMI: Japanese Sailor Collar + Red Bow on Chest
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.18, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x1e3a8a })
    );
    collar.position.set(0, 1.4, torsoD / 2 + 0.02);
    parentGroup.add(collar);

    const redBow = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redBow.position.set(0, 1.28, torsoD / 2 + 0.03);
    parentGroup.add(redBow);
  } else if (style === 'frank') {
    // FRANK: White Dress Shirt V-Neck & Black Tie on Suit
    const shirtV = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.5, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    shirtV.position.set(0, 1.22, torsoD / 2 + 0.015);
    parentGroup.add(shirtV);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.44, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    tie.position.set(0, 1.2, torsoD / 2 + 0.025);
    parentGroup.add(tie);
  } else if (style === 'ella') {
    // COCO: Horizontal Black Stripes on White Parisian Top + Red Neckerchief
    [-0.2, 0, 0.2].forEach((sy) => {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(torsoW + 0.02, 0.07, torsoD + 0.02),
        new THREE.MeshBasicMaterial({ color: 0x09090b })
      );
      stripe.position.set(0, 1.05 + sy, 0);
      parentGroup.add(stripe);
    });
  } else if (style === 'paladin') {
    // YUTANI: Cute Lighter Green Belly Patch
    const belly = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.62, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xd9f99d, roughness: 0.6 })
    );
    belly.position.set(0, 1.04, torsoD / 2 + 0.02);
    parentGroup.add(belly);
  } else if (style === 'pilot') {
    // TAGBOT: Blue Digital Chest Stripes
    [-0.08, 0.08].forEach((py) => {
      const botBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.06, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x2563eb })
      );
      botBar.position.set(0, 1.15 + py, torsoD / 2 + 0.02);
      parentGroup.add(botBar);
    });
  }

  // Variable refs for return rig
  let hoverboardMesh: THREE.Object3D | undefined;
  let sprayCanInHand: THREE.Object3D | undefined;

  // 2. Toggleable Hoverboard (Hidden during normal standing/running, shown during hoverboard powerup)
  const boardGroup = new THREE.Group();
  boardGroup.position.set(0, -0.05, 0);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.07, 1.62),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.4 })
  );
  boardGroup.add(board);

  const bStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.08, 1.56),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  boardGroup.add(bStripe);
  boardGroup.visible = false;
  parentGroup.add(boardGroup);
  hoverboardMesh = boardGroup;

  // Back & Shoulder Props (Fresh's Boombox, Jake's Hood, etc.)
  if (style === 'valkyrie') {
    // FRESH'S ICONIC TALL SILVER BOOMBOX ON HIS SHOULDER (Just like in the image!)
    const boomboxGroup = new THREE.Group();
    boomboxGroup.position.set(0.48, 1.48, 0.08);

    const boxGeo = new THREE.BoxGeometry(0.32, 0.68, 0.26);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.75 });
    boomboxGroup.add(new THREE.Mesh(boxGeo, boxMat));

    const sideTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.68, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    sideTrim.position.set(0, 0, 0.11);
    boomboxGroup.add(sideTrim);

    [-0.16, 0.16].forEach((sy) => {
      const spkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14);
      spkGeo.rotateX(Math.PI / 2);
      const spk = new THREE.Mesh(spkGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
      spk.position.set(0, sy, 0.14);
      boomboxGroup.add(spk);
    });
    parentGroup.add(boomboxGroup);
  }

  // 3. Expressive Subway Surfers 3D Cartoon Head & Facial Features
  const headW = 0.62;
  const headH = 0.58;
  const headD = 0.56;

  const headGeo = isRobot
    ? new THREE.SphereGeometry(0.36, 16, 16)
    : new THREE.BoxGeometry(headW, headH, headD);
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.position.y = 1.86;
  headMesh.castShadow = isHighQuality;
  parentGroup.add(headMesh);

  // Facial Features for Human/Zombie Characters
  if (!isRobot && style !== 'frank') {
    // Ears
    [-headW / 2 - 0.03, headW / 2 + 0.03].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.12), faceMat);
      ear.position.set(ex, 1.84, 0);
      parentGroup.add(ear);
    });

    // Monkey King Sun Face Paint!
    if (style === 'sun') {
      const paintMask = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.22, 0.025),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      paintMask.position.set(0, 1.87, headD / 2 + 0.006);
      parentGroup.add(paintMask);
    }

    // Expressive Cartoon Eyes
    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({
      color:
        style === 'titan' || style === 'frost' || style === 'tasha'
          ? 0x0284c7
          : style === 'zoe'
          ? 0xdc2626
          : 0x3b1e08,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const browMat = new THREE.MeshBasicMaterial({ color: 0x271203 });

    [-0.14, 0.14].forEach((ex, idx) => {
      const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.03), scleraMat);
      sclera.position.set(ex, 1.86, headD / 2 + 0.01);
      parentGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.035), irisMat);
      iris.position.set(ex, 1.86, headD / 2 + 0.015);
      parentGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.04), pupilMat);
      pupil.position.set(ex, 1.86, headD / 2 + 0.02);
      parentGroup.add(pupil);

      const shine = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.045), scleraMat);
      shine.position.set(ex + 0.02, 1.88, headD / 2 + 0.024);
      parentGroup.add(shine);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.038, 0.035), browMat);
      brow.position.set(ex, 1.96, headD / 2 + 0.015);
      brow.rotation.z = idx === 0 ? 0.08 : -0.08;
      parentGroup.add(brow);
    });

    // Cute 3D Cartoon Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), faceMat);
    nose.position.set(0, 1.8, headD / 2 + 0.03);
    parentGroup.add(nose);

    // Cheerful Smile (unless masked like Ninja)
    if (style !== 'samurai') {
      const smileColor = style === 'ella' || style === 'harumi' || style === 'carmen' ? 0xe11d48 : 0xffffff;
      const smile = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.045, 0.03),
        new THREE.MeshBasicMaterial({ color: smileColor })
      );
      smile.position.set(0, 1.71, headD / 2 + 0.015);
      parentGroup.add(smile);
    }
  }

  // 4. Character-Specific Hats, Glasses, Masks & Hair (All 22 Heroes from the Image!)
  if (style === 'bolt') {
    // 1. JAKE: Red & White "SUB" Cap + Hood Rim + Brown Hair
    const capRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const capWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    const capBack = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.06, 0.28, headD * 0.65), capRedMat);
    capBack.position.set(0, 2.08, -0.08);
    parentGroup.add(capBack);

    const capFront = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.05, 0.28, headD * 0.48), capWhiteMat);
    capFront.position.set(0, 2.08, 0.16);
    parentGroup.add(capFront);

    // Yellow/Green "SUB" Graffiti Tag on Front of Cap
    const capTag = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.13, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x84cc16 })
    );
    capTag.position.set(0, 2.09, headD / 2 + 0.04);
    parentGroup.add(capTag);

    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.04, 0.055, 0.26), capRedMat);
    visorMesh.position.set(0, 2.0, headD / 2 + 0.11);
    visorMesh.rotation.x = -0.18;
    parentGroup.add(visorMesh);

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    [-0.29, 0.29].forEach((hx) => {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.28), hairMat);
      tuft.position.set(hx, 1.86, 0.04);
      parentGroup.add(tuft);
    });
  } else if (style === 'titan') {
    // 2. TRICKY: Red Beanie + Blonde Hair + Thick Black Glasses
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const beanie = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.1, 0.34, headD + 0.1), beanieMat);
    beanie.position.set(0, 2.1, -0.03);
    parentGroup.add(beanie);

    const blondeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    [-0.3, 0.3].forEach((bx) => {
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.24), blondeMat);
      lock.position.set(bx, 1.72, 0.06);
      parentGroup.add(lock);
    });

    const frameMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    [-0.15, 0.15].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.045), frameMat);
      rim.position.set(gx, 1.86, headD / 2 + 0.01);
      parentGroup.add(rim);
    });
  } else if (style === 'valkyrie') {
    // 3. FRESH: Tall Flat-Top Dark Hair + Black Rectangular Glasses
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x271203, roughness: 0.9 });
    const flatTop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.02, 0.56, headD + 0.02), hairMat);
    flatTop.position.set(0, 2.3, 0);
    parentGroup.add(flatTop);

    const frameMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    [-0.15, 0.15].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.045), frameMat);
      rim.position.set(gx, 1.86, headD / 2 + 0.01);
      parentGroup.add(rim);
    });
  } else if (style === 'shinobi') {
    // 4. SPIKE: Tall Punk Mohawk Spikes!
    const mohawkMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
    [-0.16, 0, 0.16].forEach((mz, idx) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.46 + idx * 0.04, 5), mohawkMat);
      spike.position.set(0, 2.3, mz);
      spike.rotation.x = 0.15;
      parentGroup.add(spike);
    });
  } else if (style === 'paladin') {
    // 5. YUTANI: Green Alien Monster Hood with 2 Big White Eyes & Side Horns!
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.6 });
    const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.12, 0.24, headD + 0.12), hoodMat);
    hoodTop.position.set(0, 2.12, 0);
    parentGroup.add(hoodTop);

    [-0.33, 0.33].forEach((hx) => {
      const hoodSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, headH + 0.08, headD + 0.08), hoodMat);
      hoodSide.position.set(hx, 1.86, 0);
      parentGroup.add(hoodSide);

      // White Monster Side Horns
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      horn.rotation.z = hx < 0 ? Math.PI / 3 : -Math.PI / 3;
      horn.position.set(hx * 1.25, 2.18, 0);
      parentGroup.add(horn);
    });

    [-0.16, 0.16].forEach((ex) => {
      const mEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      mEye.position.set(ex, 2.25, 0.14);
      parentGroup.add(mEye);

      const mPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x09090b })
      );
      mPupil.position.set(ex, 2.26, 0.23);
      parentGroup.add(mPupil);
    });
  } else if (style === 'king') {
    // 6. KING: Red & White Crown Cap + Pink Round Glasses!
    const crownBase = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.08, 0.32, headD + 0.08),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
    );
    crownBase.position.set(0, 2.12, 0);
    parentGroup.add(crownBase);

    const crownTrim = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.1, 0.08, headD + 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    crownTrim.position.set(0, 2.0, 0);
    parentGroup.add(crownTrim);

    // Pink Round Glasses
    [-0.15, 0.15].forEach((gx) => {
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12),
        new THREE.MeshBasicMaterial({ color: 0xec4899 })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, 1.86, headD / 2 + 0.02);
      parentGroup.add(lens);
    });
  } else if (style === 'zoe') {
    // 7. ZOE: Yellow Blonde Swoop Hair + Red Glasses on Green Zombie Face!
    const blondeMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
    const swoop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.08, 0.36, headD + 0.08), blondeMat);
    swoop.position.set(0.04, 2.16, 0);
    swoop.rotation.z = -0.14;
    parentGroup.add(swoop);

    [-0.15, 0.15].forEach((gx) => {
      const redSpec = new THREE.Mesh(
        new THREE.BoxGeometry(0.21, 0.14, 0.045),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      redSpec.position.set(gx, 1.86, headD / 2 + 0.015);
      parentGroup.add(redSpec);
    });
  } else if (style === 'harumi') {
    // 8. HARUMI: Dark Hair with High Ponytail & Pink Scrunchie!
    const darkHairMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.06, 0.24, headD + 0.06), darkHairMat);
    hairCap.position.set(0, 2.08, 0);
    parentGroup.add(hairCap);

    const scrunchie = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xec4899 })
    );
    scrunchie.position.set(0.12, 2.24, -0.1);
    parentGroup.add(scrunchie);

    const pony = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 8), darkHairMat);
    pony.position.set(0.2, 2.38, -0.18);
    pony.rotation.z = -0.4;
    parentGroup.add(pony);
  } else if (style === 'pilot') {
    // 9. TAGBOT: Glowing Green Robot Eyes & Smile + Top Antenna
    [-0.14, 0.14].forEach((rx) => {
      const botEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x84cc16 })
      );
      botEye.position.set(rx, 1.88, 0.31);
      parentGroup.add(botEye);
    });

    const botMouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.035, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x84cc16 })
    );
    botMouth.position.set(0, 1.74, 0.32);
    parentGroup.add(botMouth);

    const domeBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.12, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x2563eb })
    );
    domeBand.position.set(0, 2.18, 0);
    parentGroup.add(domeBand);
  } else if (style === 'tasha') {
    // 10. TASHA: Blonde Twin High Pigtails with Red Scrunchies!
    const blondeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.05, 0.24, headD + 0.05), blondeMat);
    hairTop.position.set(0, 2.08, 0);
    parentGroup.add(hairTop);

    [-0.36, 0.36].forEach((px) => {
      const band = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      band.position.set(px, 2.18, 0);
      parentGroup.add(band);

      const pigtail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 8), blondeMat);
      pigtail.position.set(px * 1.35, 2.24, 0);
      pigtail.rotation.z = px < 0 ? 0.6 : -0.6;
      parentGroup.add(pigtail);
    });
  } else if (style === 'samurai') {
    // 11. NINJA: Black Ninja Hood & Face Mask!
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.7 });
    const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.06, 0.24, headD + 0.06), hoodMat);
    hoodTop.position.set(0, 2.08, 0);
    parentGroup.add(hoodTop);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.06, 0.26, headD + 0.06), hoodMat);
    mask.position.set(0, 1.71, 0.02);
    parentGroup.add(mask);
  } else if (style === 'frank') {
    // 12. FRANK: Full 3D Tiger/Clown Mask with Ears & Nose!
    const maskMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const maskBox = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.08, headH + 0.06, headD + 0.06), maskMat);
    maskBox.position.set(0, 1.86, 0);
    parentGroup.add(maskBox);

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.22, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    muzzle.position.set(0, 1.75, headD / 2 + 0.04);
    parentGroup.add(muzzle);

    const pinkNose = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    );
    pinkNose.position.set(0, 1.83, headD / 2 + 0.09);
    parentGroup.add(pinkNose);

    [-0.15, 0.15].forEach((ex) => {
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x09090b })
      );
      eye.position.set(ex, 1.92, headD / 2 + 0.04);
      parentGroup.add(eye);
    });
  } else if (style === 'frizzy') {
    // 13. FRIZZY: Tall Puff Afro-Bun with Yellow Band & Pigtail Puffs!
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x271203, roughness: 0.85 });
    const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), hairMat);
    topBun.position.set(0, 2.34, 0);
    parentGroup.add(topBun);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    band.position.set(0, 2.16, 0);
    parentGroup.add(band);
  } else if (style === 'cyberpunk') {
    // 14. LUCY: Pink & Cyan Hair + Steampunk Top Hat with Clock Badge + Green Glasses!
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });

    const leftHair = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.28), cyanMat);
    leftHair.position.set(-0.3, 1.82, 0.06);
    parentGroup.add(leftHair);

    const rightHair = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.28), pinkMat);
    rightHair.position.set(0.3, 1.82, 0.06);
    parentGroup.add(rightHair);

    // Maroon Top Hat with Golden Clock Face!
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 16), hatMat);
    hatBrim.position.set(0, 2.12, 0);
    parentGroup.add(hatBrim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.38, 16), hatMat);
    hatCrown.position.set(0, 2.32, 0);
    parentGroup.add(hatCrown);

    const clockBadge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    clockBadge.rotation.x = Math.PI / 2;
    clockBadge.position.set(0, 2.28, 0.31);
    parentGroup.add(clockBadge);

    // Green Sunglasses
    [-0.14, 0.14].forEach((gx) => {
      const gLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      gLens.rotation.x = Math.PI / 2;
      gLens.position.set(gx, 1.86, headD / 2 + 0.02);
      parentGroup.add(gLens);
    });
  } else if (style === 'carmen') {
    // 15. CARMEN: Golden Carnival Tiara + Giant Green & Blue Feather Headdress!
    const tiara = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.06, 0.18, headD + 0.06),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    tiara.position.set(0, 2.08, 0);
    parentGroup.add(tiara);

    // Tall Carnival Feathers Fan
    [-0.5, -0.25, 0, 0.25, 0.5].forEach((angle, idx) => {
      const fColor = idx % 2 === 0 ? 0x22c55e : 0x0284c7;
      const feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.65, 0.06),
        new THREE.MeshBasicMaterial({ color: fColor })
      );
      feather.position.set(Math.sin(angle) * 0.35, 2.45, -0.1);
      feather.rotation.z = -angle;
      parentGroup.add(feather);
    });
  } else if (style === 'biker') {
    // 16. ROBERTO: White & Blue Striped Helmet + Yellow Visor Goggles!
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    helm.position.set(0, 1.98, -0.02);
    parentGroup.add(helm);

    const blueStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.42, 0.78),
      new THREE.MeshBasicMaterial({ color: 0x1d4ed8 })
    );
    blueStripe.position.set(0, 2.08, -0.02);
    parentGroup.add(blueStripe);

    const yellowVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    yellowVisor.position.set(0, 1.88, headD / 2 + 0.03);
    parentGroup.add(yellowVisor);
  } else if (style === 'princek') {
    // 17. PRINCE K: Green Beanie + Dark Shades!
    const beanie = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.08, 0.28, headD + 0.08),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 })
    );
    beanie.position.set(0, 2.12, 0);
    parentGroup.add(beanie);

    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.15, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    shades.position.set(0, 1.86, headD / 2 + 0.02);
    parentGroup.add(shades);
  } else if (style === 'frost') {
    // 18. BRODY: Blonde Surfer Hair + Brown Cap!
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.06, 0.24, headD + 0.06),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    cap.position.set(0, 2.12, 0);
    parentGroup.add(cap);

    const blondeFringe = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.04, 0.1, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    blondeFringe.position.set(0, 2.0, headD / 2 + 0.02);
    parentGroup.add(blondeFringe);
  } else if (style === 'kim') {
    // 19. KIM: Black Wide-Brim Hat & Dark Glasses!
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.05, 16), hatMat);
    brim.position.set(0, 2.08, 0);
    parentGroup.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.28, 16), hatMat);
    crown.position.set(0, 2.22, 0);
    parentGroup.add(crown);
  } else if (style === 'ella') {
    // 20. COCO: Red Parisian Beret + Black Bob Hair!
    const beret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.32, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 })
    );
    beret.position.set(0.06, 2.15, 0);
    beret.rotation.z = -0.22;
    parentGroup.add(beret);

    const bobMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
    [-0.31, 0.31].forEach((bx) => {
      const bob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.32), bobMat);
      bob.position.set(bx, 1.82, 0.02);
      parentGroup.add(bob);
    });
  } else if (style === 'sun') {
    // 21. SUN (MONKEY KING): Spiky Brown Hair + Golden Headband Circlet!
    const goldBand = new THREE.Mesh(
      new THREE.BoxGeometry(headW + 0.08, 0.09, headD + 0.08),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    goldBand.position.set(0, 2.05, 0);
    parentGroup.add(goldBand);

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    [-0.18, 0, 0.18].forEach((sx) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 5), hairMat);
      spike.position.set(sx, 2.28, 0);
      spike.rotation.z = -sx * 0.8;
      parentGroup.add(spike);
    });
  } else if (style === 'alex') {
    // 22. ALEX: Red Winter Ushanka Hat with Side Ear Flaps!
    const redHatMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const hatTop = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.1, 0.3, headD + 0.1), redHatMat);
    hatTop.position.set(0, 2.12, 0);
    parentGroup.add(hatTop);

    [-0.35, 0.35].forEach((fx) => {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.22), redHatMat);
      flap.position.set(fx, 1.82, 0);
      flap.rotation.z = fx < 0 ? 0.25 : -0.25;
      parentGroup.add(flap);
    });
  }

  // 5. Arms & Cartoon Hands
  const armW = 0.23;
  const armH = 0.74;
  const armD = 0.23;
  const armGeo = new THREE.BoxGeometry(armW, armH, armD);
  armGeo.translate(0, -armH / 2, 0);

  const armMaterial =
    style === 'valkyrie' || style === 'titan' || style === 'shinobi' || style === 'tasha' || style === 'alex'
      ? faceMat // Bare arms for tank tops / short sleeves!
      : suitMaterial;

  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-(torsoW / 2 + armW / 2 + 0.03), 1.44, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, armMaterial);
  leftArmMesh.castShadow = isHighQuality;
  leftArmGroup.add(leftArmMesh);

  const handGeo = new THREE.BoxGeometry(armW * 0.88, 0.17, armD * 0.88);
  const leftHand = new THREE.Mesh(handGeo, faceMat);
  leftHand.position.set(0, -armH - 0.06, 0);
  leftArmGroup.add(leftHand);

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(torsoW / 2 + armW / 2 + 0.03, 1.44, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, armMaterial);
  rightArmMesh.castShadow = isHighQuality;
  rightArmGroup.add(rightArmMesh);

  const rightHand = new THREE.Mesh(handGeo, faceMat);
  rightHand.position.set(0, -armH - 0.06, 0);
  rightArmGroup.add(rightHand);

  // Jake holding spray paint can in right hand!
  if (style === 'bolt') {
    const inHandCan = new THREE.Group();
    inHandCan.position.set(0, -armH - 0.04, 0.12);
    inHandCan.rotation.x = 0.25;

    const canGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.24, 12);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.25 });
    inHandCan.add(new THREE.Mesh(canGeo, canMat));

    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    tip.position.y = 0.14;
    inHandCan.add(tip);

    rightArmGroup.add(inHandCan);
    sprayCanInHand = inHandCan;
  }

  parentGroup.add(leftArmGroup);
  parentGroup.add(rightArmGroup);

  // 6. Legs & Iconic Subway Surfers Sneakers / Boots
  const legW = style === 'titan' ? 0.32 : 0.26; // Tricky has baggy skater jeans!
  const legH = 0.74;
  const legD = style === 'titan' ? 0.32 : 0.26;
  const legGeo = new THREE.BoxGeometry(legW, legH, legD);
  legGeo.translate(0, -legH / 2, 0);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.22, 0.7, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, armorMaterial);
  leftLegMesh.castShadow = isHighQuality;
  leftLegGroup.add(leftLegMesh);

  // Chunky Skate Sneakers (Green/White for Jake & Tricky, tall punk boots for Spike, etc.)
  const shoeColor =
    style === 'bolt' || style === 'titan'
      ? 0x22c55e
      : style === 'shinobi' || style === 'frank'
      ? 0x09090b
      : outfit.accentColor;

  const sneakerMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.45 });
  const shoeH = style === 'shinobi' ? 0.26 : 0.17;
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(legW + 0.06, shoeH, 0.46), sneakerMat);
  leftShoe.position.set(0, -legH + shoeH / 2, 0.08);
  leftLegGroup.add(leftShoe);

  const toeGeo = new THREE.BoxGeometry(legW + 0.07, 0.13, 0.16);
  const toeMat = new THREE.MeshStandardMaterial({
    color: style === 'shinobi' ? 0xdc2626 : 0xffffff,
    roughness: 0.3,
  });
  const leftToe = new THREE.Mesh(toeGeo, toeMat);
  leftToe.position.set(0, -legH + 0.05, 0.23);
  leftLegGroup.add(leftToe);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.22, 0.7, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, armorMaterial);
  rightLegMesh.castShadow = isHighQuality;
  rightLegGroup.add(rightLegMesh);

  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(legW + 0.06, shoeH, 0.46), sneakerMat);
  rightShoe.position.set(0, -legH + shoeH / 2, 0.08);
  rightLegGroup.add(rightShoe);

  const rightToe = new THREE.Mesh(toeGeo, toeMat);
  rightToe.position.set(0, -legH + 0.05, 0.23);
  rightLegGroup.add(rightToe);

  parentGroup.add(leftLegGroup);
  parentGroup.add(rightLegGroup);

  return {
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    torsoMesh,
    headMesh,
    floatingAccents,
    hoverboardMesh,
    sprayCanInHand,
  };
}
