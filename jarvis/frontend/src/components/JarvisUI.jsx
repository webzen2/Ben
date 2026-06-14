import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { speak, startListening, stopListening } from '../agents/voiceAgent.js';
import { startWakeDetection, stopWakeDetection, pauseWakeDetection, resumeWakeDetection } from '../agents/wakeDetector.js';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const isElectron = !!window.jarvisDesktop;

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

export default function JarvisUI({ onAgentPanel, onBriefing, onOrbState }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [wakeActive, setWakeActive] = useState(false);
  const historyRef = useRef(null);
  const handleCommandRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    onOrbState?.({ listening, speaking });
  }, [listening, speaking, onOrbState]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

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
    speak(text, {
      onEnd: () => {
        setSpeaking(false);
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

    setLoading(true);
    setResponse('');

    // Open websites in new tabs — resolved locally, no backend needed
    if (/^(open|show me|go to|navigate|launch|start)\s+/i.test(command)) {
      const query = command.replace(/^(open|show me|go to|navigate|launch|start)\s+/i, '').trim();
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
      });

      const reply = data.response || 'Done.';
      setHistory(h => [...h, { role: 'jarvis', text: reply }]);
      setResponse(reply);
      speakAndRelisten(reply);

      if (data.url) {
        window.open(data.url, '_blank');
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
  }, [history, onAgentPanel, speakAndRelisten]);

  handleCommandRef.current = handleCommand;

  // Wake detection — "Jarvis" hotword triggers greeting then listening
  useEffect(() => {
    if (wakeActive) return;
    startWakeDetection(() => {
      if (isElectron) window.jarvisDesktop.showWindow();
      pauseWakeDetection();
      setSpeaking(true);
      speak('Hello Ben.', {
        onEnd: () => {
          setSpeaking(false);
          setTimeout(() => {
            beginListening();
          }, 300);
        },
      });
    });
    setWakeActive(true);
    return () => stopWakeDetection();
  }, [beginListening]);

  const toggleListen = () => {
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
    isProcessingRef.current = true;
    handleCommand(inputText);
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 680, padding: '0 20px' }}>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: '0.05em', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>
          {listening ? 'LISTENING' : speaking ? 'SPEAKING' : loading ? 'PROCESSING' : 'JARVIS'}
        </span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.4)',
          color: '#86efac',
        }}>
          ALWAYS ON
        </span>
      </div>

      {response && (
        <div style={{ fontSize: 15, color: '#7dd3fc', marginBottom: 16, textAlign: 'center', maxWidth: 500 }}>
          {response}
        </div>
      )}

      <button
        onClick={toggleListen}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: listening ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${listening ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer', fontSize: 12, marginBottom: 20,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: listening ? '#3b82f6' : '#64748b', letterSpacing: '0.05em',
        }}
      >
        {listening ? 'ON' : 'MIC'}
      </button>

      <form onSubmit={submitText} style={{ display: 'flex', width: '100%', gap: 8, marginBottom: 20 }}>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a command..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 24,
            background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.25)',
            color: '#e2e8f0', fontSize: 14, outline: 'none',
          }}
        />
        <button type="submit" style={{
          padding: '10px 20px', borderRadius: 24,
          background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
          color: '#93c5fd', cursor: 'pointer', fontSize: 14,
        }}>Send</button>
      </form>

      {history.length > 0 && (
        <div
          ref={historyRef}
          style={{
            width: '100%', maxHeight: 280, overflowY: 'auto',
            background: 'rgba(15,23,42,0.6)', borderRadius: 12,
            border: '1px solid rgba(59,130,246,0.15)', padding: 12,
          }}
        >
          {history.map((m, i) => (
            <div key={i} style={{
              fontSize: 13, marginBottom: 6,
              color: '#7dd3fc',
              textAlign: 'left',
            }}>
              <span style={{ opacity: 0.5 }}>Jarvis: </span>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
