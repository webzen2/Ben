let wakeRecognition = null;
let isRunning = false;
let isPaused = false;
let onWake = null;

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
  hotwordCooldownUntil = 0;

  startHotwordRecognition();
}

export function pauseWakeDetection() {
  isPaused = true;
  try { wakeRecognition?.stop(); } catch {}
  wakeRecognition = null;
}

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
}

export function isWakeDetectionRunning() {
  return isRunning;
}
