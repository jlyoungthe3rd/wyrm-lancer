export type SoundEvent =
  | 'jump'
  | 'thrust'
  | 'hit'
  | 'shield_clang'
  | 'pogo'
  | 'hj_launch'
  | 'hj_dive'
  | 'hj_impact'
  | 'elusive'
  | 'lancet'
  | 'heal'
  | 'geirskogul'
  | 'stardiver'
  | 'crack_shatter'
  | 'hurt';

export class SoundBank {
  private ctx: AudioContext | null = null;
  muted = false;

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  play(event: SoundEvent): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    switch (event) {
      case 'jump':
        this.tone(240, 440, 0.08, 'triangle', 0.11);
        break;
      case 'thrust':
        this.noiseBurst(0.06, 1800, 0.09);
        this.tone(520, 260, 0.06, 'sawtooth', 0.06);
        break;
      case 'hit':
        this.noiseBurst(0.05, 900, 0.12);
        this.tone(180, 90, 0.07, 'square', 0.09);
        break;
      case 'shield_clang':
        this.tone(920, 680, 0.14, 'square', 0.11);
        this.tone(1380, 1140, 0.16, 'triangle', 0.09);
        break;
      case 'pogo':
        this.tone(420, 860, 0.1, 'triangle', 0.14);
        this.tone(680, 1080, 0.08, 'sine', 0.1);
        break;
      case 'hj_launch':
        this.noiseBurst(0.18, 2200, 0.12);
        this.tone(180, 740, 0.2, 'sawtooth', 0.11);
        break;
      case 'hj_dive':
        this.tone(620, 210, 0.15, 'sawtooth', 0.1);
        break;
      case 'hj_impact':
        this.noiseBurst(0.22, 420, 0.18);
        this.tone(130, 42, 0.24, 'sawtooth', 0.16);
        break;
      case 'elusive':
        this.noiseBurst(0.1, 2400, 0.1);
        this.tone(540, 320, 0.12, 'sine', 0.1);
        break;
      case 'lancet':
        this.tone(640, 980, 0.14, 'sine', 0.11);
        this.noiseBurst(0.08, 2600, 0.07);
        break;
      case 'heal':
        this.tone(523, 784, 0.14, 'sine', 0.11);
        this.tone(784, 1046, 0.18, 'triangle', 0.09);
        break;
      case 'geirskogul':
        this.noiseBurst(0.24, 1400, 0.15);
        this.tone(240, 120, 0.26, 'sawtooth', 0.14);
        this.tone(480, 720, 0.22, 'triangle', 0.1);
        break;
      case 'stardiver':
        this.noiseBurst(0.38, 360, 0.22);
        this.tone(160, 38, 0.36, 'sawtooth', 0.2);
        this.tone(320, 680, 0.22, 'square', 0.1);
        break;
      case 'crack_shatter':
        this.noiseBurst(0.18, 650, 0.16);
        this.tone(140, 65, 0.14, 'square', 0.12);
        break;
      case 'hurt':
        this.tone(190, 95, 0.16, 'sawtooth', 0.14);
        break;
    }
  }

  private tone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private noiseBurst(duration: number, filterFreq: number, volume: number): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }
}
