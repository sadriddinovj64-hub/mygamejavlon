/**
 * Web Audio API synthesizer for Apex Runner 3D.
 * Generates all sound effects and dynamic background arcade music purely in-browser
 * with zero external audio assets, zero loading latency, and 100% offline reliability.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private musicMuted: boolean = true;
  private sfxVolume: number = 0.95;
  private musicVolume: number = 0;
  private musicInterval: number | null = null;
  private isMusicPlaying: boolean = false;
  private coinComboCount: number = 0;
  private lastCoinTime: number = 0;

  constructor() {
    // Automatically unlock Web Audio API on first user touch, click, or keypress
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.initContext();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
      this.musicGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx?.currentTime || 0);
    }
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx?.currentTime || 0);
    }
  }

  public toggleSfx(enabled: boolean) {
    this.isMuted = !enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
    }
  }

  public toggleMusic(_enabled: boolean) {
    // Background music/song removed per user request so game SFX are 100% clear
    this.musicMuted = true;
    this.stopMusic();
  }

  // --- Sound Effects ---

  /**
   * Pure, Loud, Crystal-Clear Coin "TING!" Sound
   */
  public playCoin() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (t - this.lastCoinTime < 0.4) {
      this.coinComboCount = Math.min(8, this.coinComboCount + 1);
    } else {
      this.coinComboCount = 0;
    }
    this.lastCoinTime = t;

    const pitchMult = 1 + this.coinComboCount * 0.025;

    // 1. Crisp metallic "T-" strike (B5 -> E6 bell ping)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77 * pitchMult, t); // B5
    osc.frequency.setValueAtTime(1318.51 * pitchMult, t + 0.05); // E6 ("TING!")

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);

    // 2. High metallic bell resonance overtone ("-ING!")
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(2637.02 * pitchMult, t + 0.05); // E7 harmonic
    bellGain.gain.setValueAtTime(0.3, t + 0.05);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bellOsc.start(t + 0.05);
    bellOsc.stop(t + 0.26);
  }

  public playCollectCoin() {
    this.playCoin();
  }

  /**
   * Crisp Subway Surfers Left/Right Lane Dodge "Whoosh"
   */
  public playLaneSwitch(direction: 'left' | 'right' = 'right') {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = direction === 'left' ? 290 : 330;
    const endFreq = direction === 'left' ? 490 : 560;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.09);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.095);
  }

  /**
   * Crisp Subway Surfers Jump "Hup / Whoosh" (or Super Sneakers Spring Boing)
   */
  public playJump(isSuperSneakers: boolean = false) {
    if (isSuperSneakers) {
      this.playSpring();
      return;
    }

    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Punchy upward synth hop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(590, t + 0.16);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);

    // 2. Air whoosh burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.13);
    filter.Q.setValueAtTime(1.5, t);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.18, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.14);
  }

  /**
   * Landing sound — distinct hollow metallic clank on train roof vs soft thud on track ground
   */
  public playLand(onTrainRoof: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (onTrainRoof) {
      // Metallic steel roof clank + bass thud
      [195, 370].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.42, t + 0.11);

        gain.gain.setValueAtTime(idx === 0 ? 0.28 : 0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } else {
      // Soft track gravel sneaker thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.095);
    }
  }

  /**
   * Slide / Roll under obstacle sound (plus fast mid-air slam down!)
   */
  public playSlide(isFastDrop: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // 1. Downward synth swoosh
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isFastDrop ? 420 : 310, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.22);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);

    // 2. Ground friction slide noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(1600, t);
    nFilter.frequency.exponentialRampToValueAtTime(380, t + 0.22);
    nFilter.Q.setValueAtTime(1.2, t);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.22, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.22);
  }

  /**
   * Direct Frontal Collision / Crash into Train or Barrier
   */
  public playHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Heavy low-end impact punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.36);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);

    // 2. Metallic barrier clatter + crunch noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.26);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1900, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.25);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.26);
  }

  /**
   * Side Stumble / Bump into side of train
   */
  public playStumble() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.22);

    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  /**
   * Smashing through obstacles while Speed Boost is active
   */
  public playBoostSmash() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    [320, 480, 640].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(90, t + i * 0.03 + 0.18);

      gain.gain.setValueAtTime(0.25, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.19);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.19);
    });
  }

  /**
   * Shield Absorbing & Breaking on Obstacle Impact
   */
  public playShieldBreak() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [1174.66, 880, 587.33, 392];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.045);
      gain.gain.setValueAtTime(0.28, t + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.045 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.045);
      osc.stop(t + i * 0.045 + 0.18);
    });
  }

  /**
   * Speed Boost / Turbo Pickup Sound ("Tezlik olganda reaktiv ovoz")
   * Distinct jet afterburner WHOOSH + turbine roar!
   */
  public playSpeedBoost() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Jet engine turbine spin-up (low rumble to high scream)
    const jetOsc = this.ctx.createOscillator();
    const jetFilter = this.ctx.createBiquadFilter();
    const jetGain = this.ctx.createGain();

    jetOsc.type = 'sawtooth';
    jetOsc.frequency.setValueAtTime(95, t);
    jetOsc.frequency.exponentialRampToValueAtTime(740, t + 0.45);

    jetFilter.type = 'bandpass';
    jetFilter.frequency.setValueAtTime(300, t);
    jetFilter.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
    jetFilter.Q.setValueAtTime(2.0, t);

    jetGain.gain.setValueAtTime(0.55, t);
    jetGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    jetOsc.connect(jetFilter);
    jetFilter.connect(jetGain);
    jetGain.connect(this.sfxGain);
    jetOsc.start(t);
    jetOsc.stop(t + 0.5);

    // 2. Aerodynamic Nitro Air Whoosh Burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(400, t);
    nFilter.frequency.exponentialRampToValueAtTime(3200, t + 0.25);
    nFilter.frequency.exponentialRampToValueAtTime(800, t + 0.45);
    nFilter.Q.setValueAtTime(1.4, t);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.45);
  }

  /**
   * Coin Magnet Pickup Sound ("Magnit olganda elektr magnit ovozi")
   * Distinct electric magnetic BZZZ-ZING hum!
   */
  public playMagnetPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Electric magnet buzz-hum with strong 30Hz magnetic pulse modulation
    const carrier = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'square';
    carrier.frequency.setValueAtTime(180, t);
    carrier.frequency.linearRampToValueAtTime(360, t + 0.18);
    carrier.frequency.linearRampToValueAtTime(240, t + 0.36);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(32, t);
    lfoGain.gain.setValueAtTime(65, t);

    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);

    mainGain.gain.setValueAtTime(0.38, t);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    carrier.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.sfxGain);

    lfo.start(t);
    carrier.start(t);
    lfo.stop(t + 0.38);
    carrier.stop(t + 0.38);
  }

  /**
   * Gift / Mystery Box Pickup Sound ("Sovg'a olganda maxsus bayramona ovoz")
   * Magical box pop + sparkling treasure arpeggio!
   */
  public playGiftBox() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Surprise Box "POP!"
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(220, t);
    popOsc.frequency.exponentialRampToValueAtTime(680, t + 0.07);
    popGain.gain.setValueAtTime(0.48, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);
    popOsc.start(t);
    popOsc.stop(t + 0.08);

    // 2. Magical Sparkling Gift Fanfare (C5 - E5 - G5 - B5 - C6 - E6 - G6)
    const giftNotes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51, 1567.98];
    giftNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = t + 0.06 + idx * 0.045;
      const dur = idx === giftNotes.length - 1 ? 0.38 : 0.16;

      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.36, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + dur);
    });
  }

  /**
   * Shield Forcefield Pickup Sound
   */
  public playShieldPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 783.99]; // G major shimmer
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      gain.gain.setValueAtTime(0.28, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.32);
    });
  }

  /**
   * Super Sneakers Pickup Sound (Double spring boing + chime)
   */
  public playSneakersPickup() {
    this.playSpring();
  }

  /**
   * Extra Heart / Life Pickup Sound (1-UP warm bell melody)
   */
  public playHeartPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [659.25, 783.99, 1318.51, 1046.5, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = t + i * 0.055;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  public playPowerup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);

      gain.gain.setValueAtTime(0.25, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.2);
    });
  }

  public playLevelComplete() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Fanfare: C4 - G4 - C5 - E5 - G5
    const fanfare = [
      { f: 261.63, dur: 0.12, d: 0 },
      { f: 392.00, dur: 0.12, d: 0.14 },
      { f: 523.25, dur: 0.14, d: 0.28 },
      { f: 659.25, dur: 0.16, d: 0.44 },
      { f: 783.99, dur: 0.45, d: 0.62 },
    ];

    fanfare.forEach(item => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, t + item.d);

      gain.gain.setValueAtTime(0.35, t + item.d);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.d + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + item.d);
      osc.stop(t + item.d + item.dur);
    });
  }

  public playGameOver() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Descending melancholy cadence
    const notes = [
      { f: 493.88, d: 0, dur: 0.16 }, // B4
      { f: 440.00, d: 0.18, dur: 0.16 }, // A4
      { f: 392.00, d: 0.36, dur: 0.18 }, // G4
      { f: 329.63, d: 0.56, dur: 0.4 }, // E4
    ];

    notes.forEach(item => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.f, t + item.d);

      gain.gain.setValueAtTime(0.28, t + item.d);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.d + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + item.d);
      osc.stop(t + item.d + item.dur);
    });
  }

  public playPoliceWhistle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Two harmonized whistle tones with pea flutter
    [2550, 2850].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Flutter vibrato
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(24, t);
      lfoGain.gain.setValueAtTime(75, t);
      lfo.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 0.42);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  public playChaserRoar() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(130, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.48);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.52);
  }

  public playChaserStomp() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playMenuClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playIntroStinger() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Dramatic futuristic chords for game launch
    const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const start = t + idx * 0.07;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.65);
    });
  }

  public playSprayCan() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Metallic rattle ball bearing 'clack' followed by aerosol hiss
    const clackOsc = this.ctx.createOscillator();
    const clackGain = this.ctx.createGain();
    clackOsc.type = 'triangle';
    clackOsc.frequency.setValueAtTime(1400, t);
    clackOsc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    clackGain.gain.setValueAtTime(0.25, t);
    clackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    clackOsc.connect(clackGain);
    clackGain.connect(this.sfxGain);
    clackOsc.start(t);
    clackOsc.stop(t + 0.04);

    // Aerosol spray hiss (filtered white noise)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200, t + 0.04);
    filter.Q.setValueAtTime(1.8, t + 0.04);

    const hissGain = this.ctx.createGain();
    hissGain.gain.setValueAtTime(0.001, t);
    hissGain.gain.setValueAtTime(0.28, t + 0.05);
    hissGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(hissGain);
    hissGain.connect(this.sfxGain);

    noise.start(t + 0.04);
    noise.stop(t + 0.38);
  }

  public playDogBark() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Inspector's bulldog two throaty barks
    [0, 0.18].forEach((delay) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const start = t + delay;
      osc.frequency.setValueAtTime(320, start);
      osc.frequency.linearRampToValueAtTime(480, start + 0.04);
      osc.frequency.exponentialRampToValueAtTime(140, start + 0.14);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  public playSpring() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Bouncy Super Sneakers boing sound (frequency sweep with vibrato)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.28);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playJetpack() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // High-energy rocket thruster sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(280, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  public playHoverboard() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Magnetic skateboard thruster power-up sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.18);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  public playVictory() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const chords = [
      [523.25, 659.25, 783.99], // C major
      [587.33, 739.99, 880.00], // D major
      [659.25, 830.61, 987.77], // E major
      [783.99, 987.77, 1174.66, 1567.98] // G major grand finish
    ];

    chords.forEach((chord, stepIdx) => {
      chord.forEach(freq => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        const start = t + stepIdx * 0.22;
        const dur = stepIdx === chords.length - 1 ? 0.9 : 0.2;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(start);
        osc.stop(start + dur);
      });
    });
  }

  // --- Background Music Removed (SFX-Only Mode) ---

  public startMusic() {
    this.stopMusic();
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }
}

export const soundManager = new SoundEngine();
