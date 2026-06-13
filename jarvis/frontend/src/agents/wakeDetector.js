let audioContext = null;
let analyser = null;
let microphone = null;
let wakeRecognition = null;
let isRunning = false;
let onWake = null;

const CLAP_THRESHOLD = 0.6;
const CLAP_WINDOW_MS = 500;
let lastClapTime = 0;
let clapCount = 0;

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

    if (peak > CLAP_THRESHOLD) {
      const now = Date.now();
      if (now - lastClapTime < CLAP_WINDOW_MS) {
        clapCount++;
        if (clapCount >= 2) {
          clapCount = 0;
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

function startHotwordDetection() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.lang = 'en-US';
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;

  wakeRecognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const text = e.results[i][0].transcript.toLowerCase();
      if (text.includes('jarvis')) {
        onWake?.('hotword');
        // Restart to clear buffer
        try { wakeRecognition.stop(); } catch {}
        setTimeout(() => {
          if (isRunning) {
            try { wakeRecognition.start(); } catch {}
          }
        }, 200);
        return;
      }
    }
  };

  wakeRecognition.onend = () => {
    if (isRunning) {
      setTimeout(() => {
        try { wakeRecognition.start(); } catch {}
      }, 100);
    }
  };

  wakeRecognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      console.error('[wakeDetector] error:', e.error);
    }
  };

  wakeRecognition.start();
}

export async function startWakeDetection(callback) {
  if (isRunning) return;
  onWake = callback;
  isRunning = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startClapDetection(stream);
  } catch (e) {
    console.warn('[wakeDetector] Mic access denied, clap detection disabled');
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
