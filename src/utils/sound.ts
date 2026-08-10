/**
 * Cheap Web Audio immersion — no asset files.
 * Build thud, coin ping, collapse dust, car whoosh, night hum.
 */

const MUTE_KEY = 'world.muted';

type Sfx = 'build' | 'buildBig' | 'coin' | 'coinBig' | 'collapse' | 'car' | 'sell';

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

class WorldSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private unlocked = false;
  private lastCarAt = 0;
  muted = loadMuted();

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Call from a click — browsers block audio until a gesture. */
  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = muted ? 0 : 0.7;
    if (muted) this.stopAmbience();
  }

  play(kind: Sfx): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;

    switch (kind) {
      case 'build':
        this.thud(t, 110, 0.09);
        this.noiseBurst(t, 0.05, 0.12, 800);
        break;
      case 'buildBig':
        // Deeper impact + longer debris for landmarks / big blocks
        this.thud(t, 85, 0.16);
        this.thud(t + 0.05, 140, 0.1);
        this.noiseBurst(t, 0.12, 0.2, 650);
        break;
      case 'coin':
        this.blip(t, 880, 0.08);
        this.blip(t + 0.06, 1320, 0.06);
        break;
      case 'coinBig':
        // Bright ascending fanfare — reads as a whale drop in clips
        this.blip(t, 660, 0.07);
        this.blip(t + 0.07, 880, 0.07);
        this.blip(t + 0.14, 1175, 0.08);
        this.blip(t + 0.22, 1568, 0.12);
        this.chord(t + 0.28, [784, 988, 1319], 0.22);
        break;
      case 'sell':
        this.blip(t, 420, 0.07);
        this.blip(t + 0.05, 280, 0.08);
        break;
      case 'collapse':
        this.noiseBurst(t, 0.22, 0.28, 400);
        this.thud(t, 70, 0.14);
        break;
      case 'car': {
        const now = performance.now();
        if (now - this.lastCarAt < 3500) return;
        this.lastCarAt = now;
        this.whoosh(t);
        break;
      }
    }
  }

  setNightAmbience(on: boolean): void {
    if (!on || this.muted) {
      this.stopAmbience();
      return;
    }
    const ctx = this.ensure();
    if (!ctx || !this.master || this.ambience) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.2);
    this.ambience = { src, gain };
  }

  private stopAmbience(): void {
    if (!this.ambience || !this.ctx) return;
    const { src, gain } = this.ambience;
    try {
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      window.setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* ignore */
        }
      }, 500);
    } catch {
      /* ignore */
    }
    this.ambience = null;
  }

  private thud(t: number, freq: number, dur: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private blip(t: number, freq: number, dur: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Soft major chord sparkle for whale buys. */
  private chord(t: number, freqs: number[], dur: number): void {
    const ctx = this.ctx!;
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  private noiseBurst(t: number, dur: number, vol: number, cutoff: number): void {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private whoosh(t: number): void {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + 0.38);
  }
}

export const worldSound = new WorldSound();
