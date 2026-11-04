// All of the game's audio, synthesised at run time with the Web Audio API.
// Nothing is loaded from a file, so the game sounds the same offline and adds
// nothing to download.
//
// Two looping chiptune tracks are written out here as step sequences: an
// energetic rooftop theme and a calmer palace theme. The scheduler is pumped
// from the game's own update() rather than a timer of its own, and it queues
// notes slightly ahead of the audio clock so playback stays smooth while the
// frame rate wanders.

const STORAGE_KEY = 'shadow-ninja-muted';
const LOOKAHEAD = 0.18;

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function storeMuted(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch (error) {
    // Storage can be unavailable; muting still works for this session.
  }
}

const SEMITONES = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11
};

/// 'A4' -> 440, 'C5' -> 523.25, 'A2' -> 110.
function noteFrequency(note) {
  const match = /^([A-G]#?)(\d)$/.exec(note);
  if (!match) return 0;

  const steps = (Number(match[2]) - 4) * 12 + (SEMITONES[match[1]] - 9);
  return 440 * Math.pow(2, steps / 12);
}

function makeTrack(config) {
  return {
    ...config,
    stepDuration: 60 / config.bpm / config.subdivision,
    length: Math.max(config.lead.length, config.bass.length)
  };
}

const TRACKS = {
  // Sneaking across the rooftops: 16th-note lead over a walking bass.
  roof: makeTrack({
    bpm: 112,
    subdivision: 4,
    leadType: 'square',
    leadLevel: 0.16,
    leadLength: 0.13,
    bassType: 'triangle',
    bassLevel: 0.2,
    bassLength: 0.24,
    hats: true,
    hatLevel: 0.035,
    lead: [
      'A4', '-', 'C5', '-', 'E5', 'D5', 'C5', '-',
      'B4', '-', 'A4', '-', 'C5', 'B4', 'A4', 'G4',
      'A4', '-', 'E5', '-', 'G5', 'F5', 'E5', '-',
      'D5', '-', 'C5', 'B4', 'A4', '-', '-', '-',
      'E5', '-', 'G5', '-', 'A5', 'G5', 'E5', '-',
      'D5', '-', 'E5', '-', 'C5', 'D5', 'E5', '-',
      'C5', '-', 'A4', '-', 'C5', 'D5', 'E5', 'G5',
      'A5', '-', 'G5', 'E5', 'D5', '-', '-', '-'
    ],
    bass: [
      'A2', '-', '-', '-', 'E2', '-', '-', '-', 'F2', '-', '-', '-', 'G2', '-', '-', '-',
      'A2', '-', '-', '-', 'E2', '-', '-', '-', 'F2', '-', '-', '-', 'G2', '-', '-', '-',
      'F2', '-', '-', '-', 'G2', '-', '-', '-', 'A2', '-', '-', '-', 'E2', '-', '-', '-',
      'F2', '-', '-', '-', 'G2', '-', '-', '-', 'A2', '-', '-', '-', 'E2', '-', '-', '-'
    ]
  }),

  // Inside the palace: slow, sparse, nothing to hurry about.
  palace: makeTrack({
    bpm: 74,
    subdivision: 2,
    leadType: 'triangle',
    leadLevel: 0.16,
    leadLength: 0.36,
    bassType: 'sine',
    bassLevel: 0.15,
    bassLength: 1.2,
    hats: false,
    lead: [
      'A4', '-', 'C5', 'E5', '-', '-', 'D5', '-',
      'C5', '-', 'A4', '-', 'G4', '-', '-', '-',
      'F4', '-', 'A4', '-', 'C5', '-', 'E5', '-',
      'D5', '-', 'B4', '-', 'A4', '-', '-', '-'
    ],
    bass: [
      'A2', '-', '-', '-', '-', '-', '-', '-',
      'F2', '-', '-', '-', '-', '-', '-', '-',
      'C3', '-', '-', '-', '-', '-', '-', '-',
      'E2', '-', '-', '-', '-', '-', '-', '-'
    ]
  })
};

class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;

    this.muted = readMuted();
    this.pendingTrack = null;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextStepTime = 0;

    if (typeof window !== 'undefined') {
      // Browsers only allow audio after a real gesture, so the context is built
      // on the first touch or key press rather than at load.
      const unlock = () => this.unlock();
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('touchend', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }
  }

  ensureContext() {
    if (this.context) return this.context;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    this.context = new Ctx();

    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(this.context.destination);

    this.musicBus = this.context.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.master);

    this.sfxBus = this.context.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    return this.context;
  }

  unlock() {
    const context = this.ensureContext();
    if (!context) return;

    if (context.state === 'suspended') {
      const resumed = context.resume();
      if (resumed && resumed.catch) resumed.catch(() => {});
    }

    if (this.pendingTrack) {
      const name = this.pendingTrack;
      this.pendingTrack = null;
      this.startTrack(name);
    }
  }

  // ------------------------------------------------------------------ music

  playMusic(name) {
    if (!TRACKS[name]) return;

    this.pendingTrack = name;
    if (this.context && this.context.state === 'running') this.startTrack(name);
  }

  stopMusic() {
    this.pendingTrack = null;
    this.track = null;
    this.trackName = null;
  }

  startTrack(name) {
    if (this.trackName === name && this.track) return;

    this.track = TRACKS[name];
    this.trackName = name;
    this.step = 0;
    this.nextStepTime = this.context.currentTime + 0.08;
  }

  /// Called once per frame by the game scene.
  update() {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.track || this.muted) return;

    const now = context.currentTime;
    if (this.nextStepTime < now) this.nextStepTime = now + 0.02;

    let queued = 0;
    while (this.nextStepTime < now + LOOKAHEAD && queued < 64) {
      this.scheduleStep(this.track, this.step, this.nextStepTime);
      this.step = (this.step + 1) % this.track.length;
      this.nextStepTime += this.track.stepDuration;
      queued += 1;
    }
  }

  scheduleStep(track, step, when) {
    const lead = track.lead[step];
    if (lead && lead !== '-') {
      const frequency = noteFrequency(lead);
      this.tone(when, track.leadType, frequency, frequency, track.leadLength, track.leadLevel, this.musicBus);
    }

    const bass = track.bass[step];
    if (bass && bass !== '-') {
      const frequency = noteFrequency(bass);
      this.tone(when, track.bassType, frequency, frequency, track.bassLength, track.bassLevel, this.musicBus);
    }

    if (track.hats && step % 2 === 0) {
      this.noise(when, 0.04, track.hatLevel, 8000, 5000, 'highpass', this.musicBus);
    }
  }

  // ---------------------------------------------------------------- effects

  play(name) {
    if (this.muted || !this.context || this.context.state !== 'running') return;

    const at = this.context.currentTime + 0.004;

    switch (name) {
      case 'jump':
        this.tone(at, 'triangle', 320, 620, 0.13, 0.18, this.sfxBus);
        break;

      case 'dash':
        this.noise(at, 0.22, 0.2, 900, 3600);
        break;

      case 'swing':
        this.noise(at, 0.18, 0.22, 2400, 420);
        break;

      case 'heavy':
        this.noise(at, 0.32, 0.3, 1400, 6000);
        this.tone(at, 'square', 180, 80, 0.22, 0.14, this.sfxBus);
        break;

      case 'hit':
        this.noise(at, 0.14, 0.3, 1700, 220);
        this.tone(at, 'square', 220, 90, 0.16, 0.16, this.sfxBus);
        break;

      case 'die':
        this.tone(at, 'sawtooth', 420, 60, 0.75, 0.18, this.sfxBus);
        this.noise(at, 0.34, 0.13, 900, 140);
        break;

      case 'clear': {
        const arpeggio = [440, 523.25, 659.25, 880, 1318.5];
        arpeggio.forEach((frequency, index) => {
          this.tone(at + index * 0.11, 'square', frequency, frequency, 0.3, 0.13, this.sfxBus);
        });
        this.tone(at + 0.56, 'triangle', 440, 440, 0.7, 0.16, this.sfxBus);
        this.tone(at + 0.56, 'triangle', 659.25, 659.25, 0.7, 0.12, this.sfxBus);
        break;
      }

      case 'gem':
        this.tone(at, 'square', 1046.5, 1046.5, 0.08, 0.12, this.sfxBus);
        this.tone(at + 0.07, 'square', 1568, 1568, 0.12, 0.12, this.sfxBus);
        break;

      case 'trap':
        this.noise(at, 0.1, 0.24, 3000, 800);
        this.tone(at, 'square', 130, 70, 0.2, 0.14, this.sfxBus);
        break;

      default:
        break;
    }
  }

  tone(when, type, from, to, duration, level, bus) {
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, when);
    if (to !== from) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, to), when + duration);
    }

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    oscillator.connect(gain);
    gain.connect(bus || this.sfxBus);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
  }

  noise(when, duration, level, from, to, type = 'bandpass', bus) {
    const context = this.context;

    if (!this.noiseBuffer) {
      const frames = Math.floor(context.sampleRate * 1);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }

    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(from, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), when + duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus || this.sfxBus);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  // ------------------------------------------------------------------- mute

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    storeMuted(this.muted);

    const context = this.context;
    if (!context || !this.master) return;

    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, now, 0.02);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

export const sound = new SoundEngine();
