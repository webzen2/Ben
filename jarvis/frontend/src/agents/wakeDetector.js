let audioContext = null;
let analyser = null;
let microphone = null;
let wakeRecognition = null;
let isRunning = false;
let isPaused = false;
let onWake = null;

const CLAP_THRESHOLD = 0.6;
const CLAP_WINDOW_MS = 600;
const CLAP_COOLDOWN_MS = 2000;
let lastClapTime = 0;
let clapCount = 0;
let clapCooldownUntil = 0;

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
    if (isPaused) {
      requestAnimationFrame(detectClap);
      return;
    }
    analyser.getFloatTimeDomainData(dataArray);

    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const abs = Math.abs(dataArray[i]);
      if (abs > peak) peak = abs;
    }

    const now = Date.now();

    if (peak > CLAP_THRESHOLD && now - lastPeakTime > PEAK_DEBOUNCE_MS) {
      lastPeakTime = now;

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

const HOTWORD_COOLDOWN_MS = 3000;
let hotwordCooldownUntil = 0;

function startHotwordRecognition() {
  if (!isRunning || isPaused) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.lang = 'en-US';
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.maxAlternatives = 1;

  wakeRecognition.onresult = (e) => {
    if (isPaused) return;
    const now = Date.now();
    if (now < hotwordCooldownUntil) return;

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const text = e.results[i][0].transcript.toLowerCase().trim();
      if (text.includes('jarvis')) {
        hotwordCooldownUntil = now + HOTWORD_COOLDOWN_MS;
        try { wakeRecognition.stop(); } catch {}
        onWake?.('hotword');
        return;
      }
    }
  };

  wakeRecognition.onend = () => {
    if (isRunning && !isPaused) {
      setTimeout(startHotwordRecognition, 150);
    }
  };

  wakeRecognition.onerror = (e) => {
    if (e.error === 'not-allowed') return;
    if (isRunning && !isPaused) setTimeout(startHotwordRecognition, 300);
  };

  try {
    wakeRecognition.start();
  } catch {
    if (isRunning && !isPaused) setTimeout(startHotwordRecognition, 500);
  }
}

export async function startWakeDetection(callback) {
  if (isRunning) return;
  onWake = callback;
  isRunning = true;
  isPaused = false;
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

  startHotwordRecognition();
}

// Pause hotword recognition so command listening can use the mic
export function pauseWakeDetection() {
  isPaused = true;
  try { wakeRecognition?.stop(); } catch {}
  wakeRecognition = null;
}

// Resume hotword recognition after command listening is done
export function resumeWakeDetection() {
  isPaused = false;
  if (isRunning) {
    startHotwordRecognition();
  }
}

export function stopWakeDetection() {
  isRunning = false;
  isPaused = false;
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
