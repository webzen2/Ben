import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { speak, startListening, stopListening, stopSpeaking } from '../agents/voiceAgent.js';
import { startWakeDetection, stopWakeDetection, pauseWakeDetection, resumeWakeDetection } from '../agents/wakeDetector.js';
import DocumentPreview from './DocumentPreview.jsx';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const API_TOKEN = import.meta.env.VITE_JARVIS_TOKEN || '';
const isElectron = !!window.jarvisDesktop;
const JARVIS_URL = window.location.origin;
const apiHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

const SITES = {
  'my website': 'https://bcautomations.vercel.app',
  'bcautomations': 'https://bcautomations.vercel.app',
  'bc automations': 'https://bcautomations.vercel.app',
  'ghl': 'https://app.gohighlevel.com',
  'gohighlevel': 'https://app.gohighlevel.com',
  'go high level': 'https://app.gohighlevel.com',
  'supabase': 'https://app.supabase.com',
  'vercel': 'https://vercel.com/dashboard',
  'make': 'https://make.com',
  'instagram': 'https://instagram.com',
  'facebook': 'https://facebook.com',
  'youtube': 'https://youtube.com',
  'twitter': 'https://x.com',
  'x': 'https://x.com',
  'linkedin': 'https://linkedin.com',
  'github': 'https://github.com',
  'gmail': 'https://mail.google.com',
  'email': 'https://mail.google.com',
  'google drive': 'https://drive.google.com',
  'drive': 'https://drive.google.com',
  'google docs': 'https://docs.google.com',
  'google sheets': 'https://sheets.google.com',
  'google calendar': 'https://calendar.google.com',
  'calendar': 'https://calendar.google.com',
  'chatgpt': 'https://chat.openai.com',
  'claude': 'https://claude.ai',
  'canva': 'https://canva.com',
  'stripe': 'https://dashboard.stripe.com',
  'railway': 'https://railway.app/dashboard',
  'slack': 'https://slack.com',
  'notion': 'https://notion.so',
  'tiktok': 'https://tiktok.com',
  'amazon': 'https://amazon.com',
  'netflix': 'https://netflix.com',
  'spotify': 'https://open.spotify.com',
  'reddit': 'https://reddit.com',
  'google': 'https://google.com',
};

function resolveUrl(query) {
  const lc = query.toLowerCase().trim();
  for (const [key, url] of Object.entries(SITES)) {
    if (lc.includes(key)) return url;
  }
  const urlMatch = lc.match(/https?:\/\/[^\s]+/);
  if (urlMatch) return urlMatch[0];
  const domainMatch = lc.match(/([a-z0-9-]+\.[a-z]{2,})/);
  if (domainMatch) return `https://${domainMatch[1]}`;
  return `https://www.google.com/search?q=${encodeURIComponent(lc)}`;
}

const JarvisUI = forwardRef(function JarvisUI({ onAgentPanel, onBriefing, onOrbState }, ref) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [wakeActive, setWakeActive] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const historyRef = useRef(null);
  const handleCommandRef = useRef(null);
  const isProcessingRef = useRef(false);
  const speakingRef = useRef(false);

  // Report all state changes (listening, speaking, loading) to parent
  useEffect(() => {
    onOrbState?.({ listening, speaking, loading });
  }, [listening, speaking, loading, onOrbState]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const interruptSpeaking = useCallback(() => {
    if (speakingRef.current) {
      stopSpeaking();
      setSpeaking(false);
      speakingRef.current = false;
      isProcessingRef.current = false;
    }
  }, []);

  const beginListening = useCallback(() => {
    if (isProcessingRef.current) return;
    pauseWakeDetection();
    setListening(true);
    startListening({
      onResult: (text) => {
        setTranscript(text);
        setListening(false);
        isProcessingRef.current = true;
        handleCommandRef.current?.(text);
      },
      onEnd: () => {
        setListening(false);
        if (!isProcessingRef.current) {
          resumeWakeDetection();
        }
      },
    });
  }, []);

  const speakAndRelisten = useCallback((text) => {
    pauseWakeDetection();
    setSpeaking(true);
    speakingRef.current = true;
    speak(text, {
      onEnd: () => {
        setSpeaking(false);
        speakingRef.current = false;
        isProcessingRef.current = false;
        setTimeout(() => {
          beginListening();
        }, 400);
      },
    });
  }, [beginListening]);

  const handleCommand = useCallback(async (command) => {
    if (!command.trim()) {
      isProcessingRef.current = false;
      return;
    }

    // Add user message to history
    setHistory(h => [...h, { role: 'user', text: command }]);

    const lc = command.toLowerCase().trim();

    // "Stop" / "Jarvis stop" — silence and go back to listening
    if (/^(jarvis\s+)?(stop|shut up|quiet|silence|enough|ok stop)$/i.test(lc)) {
      interruptSpeaking();
      setLoading(false);
      setResponse('');
      isProcessingRef.current = false;
      setTimeout(() => beginListening(), 300);
      return;
    }

    // "Go home" / "go back home" — focus the Jarvis tab
    if (/^(jarvis\s+)?(go\s*(back\s*)?home|come back|go back)$/i.test(lc)) {
      window.focus();
      const msg = "I'm right here, Ben.";
      setResponse(msg);
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      speakAndRelisten(msg);
      setLoading(false);
      return;
    }

    // Timer / Reminders — "remind me in 5 minutes to call John"
    const timerMatch = lc.match(/(?:remind me|set.*(?:timer|alarm)|wake me)\s+(?:in\s+)?(\d+)\s*(second|minute|min|hour|sec|hr)s?\s*(?:to\s+)?(.+)?/i);
    if (timerMatch) {
      const amount = parseInt(timerMatch[1]);
      const unit = timerMatch[2].toLowerCase();
      const task = timerMatch[3] || 'timer done';
      const ms = unit.startsWith('sec') ? amount * 1000
        : unit.startsWith('min') ? amount * 60000
        : amount * 3600000;
      const label = `${amount} ${unit}${amount > 1 ? 's' : ''}`;
      setTimeout(() => {
        interruptSpeaking();
        const reminder = task === 'timer done' ? `Ben, your ${label} timer is up.` : `Ben, reminder: ${task}`;
        setResponse(reminder);
        setHistory(h => [...h, { role: 'jarvis', text: reminder }]);
        speakAndRelisten(reminder);
      }, ms);
      const msg = `Got it, I'll remind you in ${label}.`;
      setResponse(msg);
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      speakAndRelisten(msg);
      return;
    }

    // Quick math — "what's 15% of 3200", "calculate 500 + 200"
    const mathMatch = lc.match(/(?:what(?:'s| is)\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?\$?(\d+(?:[,.]?\d+)*)/);
    if (mathMatch) {
      const pct = parseFloat(mathMatch[1]);
      const base = parseFloat(mathMatch[2].replace(/,/g, ''));
      const result = (pct / 100 * base).toFixed(2);
      const msg = `${pct}% of $${base.toLocaleString()} is $${parseFloat(result).toLocaleString()}`;
      setResponse(msg);
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      speakAndRelisten(msg);
      return;
    }
    const calcMatch = lc.match(/(?:calculate|what(?:'s| is)\s+)?([\d.]+)\s*([+\-*/x×])\s*([\d.]+)/);
    if (calcMatch) {
      const a = parseFloat(calcMatch[1]);
      const op = calcMatch[2];
      const b = parseFloat(calcMatch[3]);
      let result;
      if (op === '+') result = a + b;
      else if (op === '-') result = a - b;
      else if (op === '*' || op === 'x' || op === '×') result = a * b;
      else if (op === '/') result = b !== 0 ? a / b : 'undefined';
      const msg = `That's ${typeof result === 'number' ? result.toLocaleString() : result}`;
      setResponse(msg);
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      speakAndRelisten(msg);
      return;
    }

    setLoading(true);
    setResponse('');

    // Open websites in new tabs — resolved locally, no backend needed
    if (/^(open|show me|go to|navigate|launch|start)\s+/i.test(command)) {
      const query = command.replace(/^(open|show me|go to|navigate|launch|start)\s+/i, '').trim();
      // "open home" or "open jarvis" goes back to Jarvis
      if (/^(home|jarvis)$/i.test(query)) {
        window.focus();
        const msg = "I'm right here.";
        setResponse(msg);
        setHistory(h => [...h, { role: 'jarvis', text: msg }]);
        speakAndRelisten(msg);
        setLoading(false);
        return;
      }
      const target = resolveUrl(query);
      window.open(target, '_blank');
      const msg = target.includes('google.com/search')
        ? `Searching for "${query}"`
        : `Opening ${query}`;
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      setResponse(msg);
      speakAndRelisten(msg);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`${API}/dispatch`, {
        command,
        context: history.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      }, { headers: apiHeaders });

      const reply = data.response || 'Done.';
      setHistory(h => [...h, { role: 'jarvis', text: reply }]);
      setResponse(reply);

      if (data.action === 'confirm' && data.pendingPlan) {
        speakAndRelisten(reply);
        setLoading(false);
        return;
      }

      speakAndRelisten(reply);

      if (data.url) {
        window.open(data.url, '_blank');
      }

      if (data.data && typeof data.data === 'object') {
        setActiveDoc({ title: reply, data: data.data, response: reply });
      }

      if (data.agent && data.agent !== 'general') {
        onAgentPanel?.({ agent: data.agent, data: data.data });
      }
    } catch (err) {
      const msg = 'Backend is offline. Start the Jarvis server to use AI commands.';
      setHistory(h => [...h, { role: 'jarvis', text: msg }]);
      setResponse(msg);
      speakAndRelisten(msg);
    }
    setLoading(false);
  }, [history, onAgentPanel, speakAndRelisten, interruptSpeaking, beginListening]);

  handleCommandRef.current = handleCommand;

  // Expose injectCommand to parent via ref
  useImperativeHandle(ref, () => ({
    injectCommand: (command) => {
      interruptSpeaking();
      isProcessingRef.current = true;
      handleCommand(command);
    },
  }), [handleCommand, interruptSpeaking]);

  // Wake detection — "Jarvis" hotword triggers greeting then listening
  useEffect(() => {
    if (wakeActive) return;
    startWakeDetection(() => {
      if (isElectron) window.jarvisDesktop.showWindow();
      interruptSpeaking();
      pauseWakeDetection();
      setSpeaking(true);
      speakingRef.current = true;
      speak('Hello Ben.', {
        onEnd: () => {
          setSpeaking(false);
          speakingRef.current = false;
          setTimeout(() => {
            beginListening();
          }, 300);
        },
      });
    });
    setWakeActive(true);
    return () => stopWakeDetection();
  }, [beginListening, interruptSpeaking]);

  const toggleListen = () => {
    if (speaking) {
      interruptSpeaking();
      isProcessingRef.current = false;
      setTimeout(() => beginListening(), 200);
      return;
    }
    if (listening) {
      stopListening();
      setListening(false);
      resumeWakeDetection();
    } else {
      beginListening();
    }
  };

  const submitText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    interruptSpeaking();
    isProcessingRef.current = true;
    handleCommand(inputText);
    setInputText('');
  };

  const micClass = listening ? 'hud-mic-btn hud-mic-btn--listening'
    : speaking ? 'hud-mic-btn hud-mic-btn--speaking'
    : 'hud-mic-btn';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Response text */}
      {response && (
        <div className="hud-response">{response}</div>
      )}

      {/* Mic toggle */}
      <button onClick={toggleListen} className={micClass}>
        {listening ? 'ON' : speaking ? 'STOP' : 'MIC'}
      </button>

      {/* Text input */}
      <form onSubmit={submitText} className="hud-input-row">
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a command..."
          className="hud-input"
        />
        <button type="submit" className="hud-send-btn">SEND</button>
      </form>

      {/* Chat log */}
      {history.length > 0 && (
        <div ref={historyRef} className="hud-log">
          {history.map((m, i) => (
            <div
              key={i}
              className={`hud-log-entry ${m.role === 'user' ? 'hud-log-entry--user' : 'hud-log-entry--jarvis'}`}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      {activeDoc && (
        <DocumentPreview document={activeDoc} onClose={() => setActiveDoc(null)} />
      )}
    </div>
  );
});

export default JarvisUI;
