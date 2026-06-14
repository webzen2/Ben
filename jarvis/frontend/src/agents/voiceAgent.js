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

let cachedVoice = null;

function getPreferredVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    /Google UK English Male/i,
    /Daniel/i,
    /Aaron/i,
    /James/i,
    /Arthur/i,
    /Google US English/i,
    /Samantha/i,
    /Alex/i,
  ];
  for (const pattern of preferred) {
    const match = voices.find(v => pattern.test(v.name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }
  const english = voices.find(v => v.lang.startsWith('en'));
  if (english) cachedVoice = english;
  return english || null;
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1.0;
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

  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
  }
}
