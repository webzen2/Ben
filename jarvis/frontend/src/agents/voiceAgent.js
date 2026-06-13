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

export function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 0.9;
  utt.volume = 1;

  // Prefer a deeper male voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /Google UK English Male|Daniel|Alex/i.test(v.name));
  if (preferred) utt.voice = preferred;

  window.speechSynthesis.speak(utt);
}
