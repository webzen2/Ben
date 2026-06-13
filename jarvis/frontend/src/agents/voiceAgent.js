let recognition = null;

export function startListening({ onResult, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported');
    onEnd?.();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    onResult?.(text);
  };

  recognition.onend = () => onEnd?.();
  recognition.onerror = (e) => {
    console.error('Speech error', e.error);
    onEnd?.();
  };

  recognition.start();
}

export function stopListening() {
  recognition?.stop();
  recognition = null;
}

function getPreferredVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => /Google UK English Male|Daniel|Alex/i.test(v.name)) || null;
}

export function speak(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 0.9;
  utt.volume = 1;

  utt.onstart = () => onStart?.();
  utt.onend = () => onEnd?.();
  utt.onerror = () => onEnd?.();

  const doSpeak = () => {
    const preferred = getPreferredVoice();
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
    onStart?.();
  };

  // Voices may not be loaded on first call
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
  }
}
