let audioContext = null;
let analyser = null;
let microphone = null;
let wakeRecognition = null;
let isRunning = false;
let onWake = null;

const CLAP_THRESHOLD = 0.6;
const CLAP_WINDOW_MS = 600;   // two claps must be within 600ms of each other
const CLAP_COOLDOWN_MS = 2000; // 2s cooldown after a double-clap fires
let lastClapTime = 0;
let clapCount = 0;
let clapCooldownUntil = 0;

// Debounce so a single loud clap doesn't register multiple peaks
const PEAK_DEBOUNCE_MS = 120;
let lastPeakTime = 0;

function startClapDetection(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  microphone = audioContext.createMediaStreamSource(stream);
  microphone.connect(analyser);

  const dataArray = new Float32Array(analyser.fftSize);

  const detectClap = () => {
    if (!isRunning) return;
    analyser.getFloatTimeDomainData(dataArray);

    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const abs = Math.abs(dataArray[i]);
      if (abs > peak) peak = abs;
    }

    const now = Date.now();

    if (peak > CLAP_THRESHOLD && now - lastPeakTime > PEAK_DEBOUNCE_MS) {
      lastPeakTime = now;

      // Ignore if we're still in cooldown from a previous double-clap
      if (now < clapCooldownUntil) {
        requestAnimationFrame(detectClap);
        return;
      }

      if (now - lastClapTime < CLAP_WINDOW_MS) {
        clapCount++;
        if (clapCount >= 2) {
          clapCount = 0;
          clapCooldownUntil = now + CLAP_COOLDOWN_MS;
          onWake?.('clap');
        }
      } else {
        clapCount = 1;
      }
      lastClapTime = now;
    }

    requestAnimationFrame(detectClap);
  };

  detectClap();
}

// Cooldown so hotword doesn't fire multiple times from the same utterance
const HOTWORD_COOLDOWN_MS = 3000;
let hotwordCooldownUntil = 0;

function startHotwordDetection() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[wakeDetector] SpeechRecognition not supported — hotword unavailable');
    return;
  }

  const createRecognition = () => {
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  };

  const startRec = () => {
    if (!isRunning) return;
    wakeRecognition = createRecognition();

    wakeRecognition.onresult = (e) => {
      const now = Date.now();
      if (now < hotwordCooldownUntil) return;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.toLowerCase().trim();
        if (text.includes('jarvis')) {
          hotwordCooldownUntil = now + HOTWORD_COOLDOWN_MS;
          onWake?.('hotword');
          // Stop and restart to clear the recognition buffer
          try { wakeRecognition.stop(); } catch {}
          return;
        }
      }
    };

    wakeRecognition.onend = () => {
      if (isRunning) {
        setTimeout(startRec, 150);
      }
    };

    wakeRecognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        console.error('[wakeDetector] Mic permission denied');
        return;
      }
      // no-speech and aborted are normal — just restart
      if (isRunning) setTimeout(startRec, 300);
    };

    try {
      wakeRecognition.start();
    } catch (e) {
      if (isRunning) setTimeout(startRec, 500);
    }
  };

  startRec();
}

export async function startWakeDetection(callback) {
  if (isRunning) return;
  onWake = callback;
  isRunning = true;
  clapCount = 0;
  lastClapTime = 0;
  clapCooldownUntil = 0;
  hotwordCooldownUntil = 0;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startClapDetection(stream);
  } catch (e) {
    console.warn('[wakeDetector] Mic access denied — clap detection disabled');
  }

  startHotwordDetection();
}

export function stopWakeDetection() {
  isRunning = false;
  onWake = null;

  try { wakeRecognition?.stop(); } catch {}
  wakeRecognition = null;

  if (microphone) { microphone.disconnect(); microphone = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  analyser = null;
}

export function isWakeDetectionRunning() {
  return isRunning;
}
