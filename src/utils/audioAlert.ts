import { AlarmSoundType } from '../types';

class AudioAlertManager {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private currentOscillators: (OscillatorNode | AudioNode)[] = [];
  private loopIntervalId: number | null = null;
  private keepAliveIntervalId: number | null = null;
  private silentGain: GainNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Keep audio pipeline active so browser does not freeze/throttle tab in background
   */
  public startBackgroundKeepAlive() {
    try {
      const ctx = this.initContext();
      if (!this.silentGain) {
        this.silentGain = ctx.createGain();
        this.silentGain.gain.value = 0.0001; // Inaudible
        this.silentGain.connect(ctx.destination);
      }

      if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);

      this.keepAliveIntervalId = window.setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running') return;
        try {
          // Micro pulse to keep audio stream active in background
          const osc = this.ctx.createOscillator();
          osc.frequency.setValueAtTime(40, this.ctx.currentTime);
          osc.connect(this.silentGain!);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.05);
        } catch {
          // Ignore
        }
      }, 5000);
    } catch (e) {
      console.warn('Failed to start background keep alive audio', e);
    }
  }

  public stopBackgroundKeepAlive() {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isAlarmPlaying;
  }

  /**
   * Play the loud siren alarm continuously until stopped
   */
  public startAlarm(soundType: AlarmSoundType, volume = 1.0, voiceAlert = true) {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    const ctx = this.initContext();

    // Trigger Speech synthesis in Vietnamese if enabled
    if (voiceAlert && 'speechSynthesis' in window) {
      this.triggerVoiceAlert();
    }

    // Trigger vibration on mobile devices
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 600]);
      } catch {
        // Ignore
      }
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (soundType === 'siren') {
      this.playSiren(ctx, masterGain);
    } else if (soundType === 'horn') {
      this.playHorn(ctx, masterGain);
    } else if (soundType === 'piercing_beep') {
      this.playPiercingBeep(ctx, masterGain);
    } else {
      this.playFireAlarm(ctx, masterGain);
    }
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;

    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }

    this.currentOscillators.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore
      }
    });
    this.currentOscillators = [];

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Test play for 1.8 seconds then stop
   */
  public testSound(soundType: AlarmSoundType, volume = 1.0) {
    this.stopAlarm();
    this.startAlarm(soundType, volume, false);
    setTimeout(() => {
      this.stopAlarm();
    }, 1800);
  }

  // --- Sound Synthesizers ---

  // 1. High frequency oscillating siren (penetrating 800Hz - 1600Hz waver)
  private playSiren(ctx: AudioContext, destination: AudioNode) {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, ctx.currentTime);

    // LFO modulation for siren sweep
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3.5, ctx.currentTime); // 3.5 sweeps per second
    lfoGain.gain.setValueAtTime(500, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(destination);

    osc.start();
    lfo.start();

    this.currentOscillators.push(osc, lfo, lfoGain);
  }

  // 2. Loud dissonant car horn cluster (Dual tones 440Hz + 554Hz)
  private playHorn(ctx: AudioContext, destination: AudioNode) {
    const playBurst = () => {
      if (!this.isAlarmPlaying) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const burstGain = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(392, ctx.currentTime); // G4
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(494, ctx.currentTime); // B4
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(587, ctx.currentTime); // D5

      burstGain.gain.setValueAtTime(0.8, ctx.currentTime);
      burstGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc1.connect(burstGain);
      osc2.connect(burstGain);
      osc3.connect(burstGain);
      burstGain.connect(destination);

      osc1.start();
      osc2.start();
      osc3.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
      osc3.stop(ctx.currentTime + 0.45);
    };

    playBurst();
    this.loopIntervalId = window.setInterval(playBurst, 550);
  }

  // 3. Piercing repetitive high-frequency beeps (1350Hz)
  private playPiercingBeep(ctx: AudioContext, destination: AudioNode) {
    const playPulse = () => {
      if (!this.isAlarmPlaying) return;
      const osc = ctx.createOscillator();
      const pulseGain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1350, ctx.currentTime);

      pulseGain.gain.setValueAtTime(0.9, ctx.currentTime);
      pulseGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(pulseGain);
      pulseGain.connect(destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    };

    playPulse();
    this.loopIntervalId = window.setInterval(playPulse, 200);
  }

  // 4. Industrial fire alarm bell
  private playFireAlarm(ctx: AudioContext, destination: AudioNode) {
    const playChime = () => {
      if (!this.isAlarmPlaying) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(750, ctx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1500, ctx.currentTime);

      chimeGain.gain.setValueAtTime(1.0, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.3);

      osc1.connect(chimeGain);
      osc2.connect(chimeGain);
      chimeGain.connect(destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    };

    playChime();
    this.loopIntervalId = window.setInterval(playChime, 400);
  }

  private triggerVoiceAlert() {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance('Dậy ngay! Bạn đang nhắm mắt buồn ngủ! Hãy mở mắt ra!');
      utter.rate = 1.25;
      utter.pitch = 1.1;
      utter.volume = 1.0;
      utter.lang = 'vi-VN';

      // Pick Vietnamese voice if available
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
      if (viVoice) {
        utter.voice = viVoice;
      }
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech synthesis error handled gracefully
    }
  }
}

export const audioAlert = new AudioAlertManager();
