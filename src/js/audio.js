/**
 * AudioController - Sons de beep para sucesso e erro via Web Audio API
 */
class AudioController {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
  }
  init() {
    if (this.unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx && AC) this.ctx = new AC();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.value = 0;
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.1);
      this.unlocked = true;
    }
  }
  playSuccess() {
    if (this.ctx) {
      this.beep(880, 0.1, 0.5);
      setTimeout(() => this.beep(1100, 0.1, 0.5), 100);
    }
  }
  playError() {
    if (this.ctx) this.beep(200, 0.4, 0.8);
  }
  beep(f, d, v) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = f;
    gain.gain.setValueAtTime(v, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
    osc.start();
    osc.stop(this.ctx.currentTime + d);
  }
}
