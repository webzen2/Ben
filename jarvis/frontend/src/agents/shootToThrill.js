let audioCtx = null;

// Shoot to Thrill intro riff — power chord progression (E5 - G5 - A5)
// Recreated with distorted oscillators to sound like the AC/DC guitar intro
const RIFF_NOTES = [
  { freq: 82.41, dur: 0.15 },  // E2
  { freq: 82.41, dur: 0.15 },  // E2
  { freq: 110, dur: 0.12 },    // A2
  { freq: 110, dur: 0.12 },    // A2
  { freq: 98, dur: 0.2 },      // G2
  { freq: 82.41, dur: 0.15 },  // E2
  { freq: 82.41, dur: 0.15 },  // E2
  { freq: 110, dur: 0.12 },    // A2
  { freq: 130.81, dur: 0.3 },  // C3
  { freq: 110, dur: 0.4 },     // A2 (held)
];

function createDistortion(ctx, amount = 80) {
  const curve = new Float32Array(ctx.sampleRate);
  const deg = Math.PI / 180;
  for (let i = 0; i < ctx.sampleRate; i++) {
    const x = (i * 2) / ctx.sampleRate - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = '4x';
  return shaper;
}

export function playShootToThrill() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);

  const distortion = createDistortion(audioCtx, 100);
  distortion.connect(masterGain);

  let time = audioCtx.currentTime + 0.05;

  RIFF_NOTES.forEach(({ freq, dur }) => {
    // Root note
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;

    // Power chord fifth
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 1.5;

    // Octave
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'square';
    osc3.frequency.value = freq * 2;

    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0.6, time);
    noteGain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    osc3.connect(noteGain);
    noteGain.connect(distortion);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
    osc3.stop(time + dur);

    time += dur + 0.02;
  });

  // Auto-cleanup
  setTimeout(() => {
    audioCtx?.close();
    audioCtx = null;
  }, 3000);
}
