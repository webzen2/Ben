import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { speak, startListening, stopListening } from '../agents/voiceAgent.js';
import { startWakeDetection, stopWakeDetection } from '../agents/wakeDetector.js';

const API = '/api/agents';
const isElectron = !!window.jarvisDesktop;

const QUICK_ACTIONS = [
  { label: 'Pipeline', icon: '📊', agent: 'client', action: 'pipeline' },
  { label: 'Notes', icon: '📝', agent: 'files', action: 'notes' },
  { label: 'Intel', icon: '🔍', agent: 'research', action: 'intel' },
  { label: 'Social', icon: '📱', agent: 'social', action: 'analytics' },
  { label: 'Calendar', icon: '📅', agent: 'calendar', action: 'today' },
  { label: 'Tasks', icon: '✅', agent: 'tasks', action: 'list' },
];

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

  useEffect(() => {
    onOrbState?.({ listening, speaking });
  }, [listening, speaking, onOrbState]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    setLoading(true);
    setResponse('');

    // Desktop app opener — intercept "open X" commands in Electron
    if (isElectron && /^(open|launch|start|show me|go to)\s+/i.test(command)) {
      const appName = command.replace(/^(open|launch|start|show me|go to)\s+/i, '').trim();
      try {
        const result = await window.jarvisDesktop.openApp(appName);
        let msg;
        if (result.opened) {
          msg = `Opening ${result.target}`;
        } else {
          // Unknown app — search Google or open as URL
          const looksLikeUrl = /^https?:\/\/|^[a-z0-9-]+\.[a-z]{2,}/i.test(appName);
          const target = looksLikeUrl
            ? (appName.startsWith('http') ? appName : `https://${appName}`)
            : `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
          await window.jarvisDesktop.openUrl(target);
          msg = looksLikeUrl ? `Opening ${target}` : `Searching Google for "${appName}"`;
        }
        setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: msg }]);
        setResponse(msg);
        setSpeaking(true);
        speak(msg, { onEnd: () => setSpeaking(false) });
        setLoading(false);
        return;
      } catch {}
    }

    // Web fallback — browser agent for URL resolution, Google search if unknown
    if (!isElectron && /^(open|show me|go to|navigate)\s+/i.test(command)) {
      try {
        const { data } = await axios.post(`${API}/browser/open`, { command });
        let target = data.url;
        if (!target) {
          const query = command.replace(/^(open|show me|go to|navigate)\s+/i, '').trim();
          target = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        window.open(target, '_blank');
        const msg = target.includes('google.com/search')
          ? `Searching Google for "${command.replace(/^(open|show me|go to|navigate)\s+/i, '').trim()}"`
          : `Opening ${target}`;
        setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: msg }]);
        setSpeaking(true);
        speak(msg, { onEnd: () => setSpeaking(false) });
        setLoading(false);
        return;
      } catch {}
    }

    try {
      const { data } = await axios.post(`${API}/dispatch`, {
        command,
        context: history.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      });

      const reply = data.response || 'Done.';
      setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: reply }]);
      setResponse(reply);
      setSpeaking(true);
      speak(reply, { onEnd: () => setSpeaking(false) });

      if (data.agent && data.agent !== 'general') {
        onAgentPanel?.({ agent: data.agent, data: data.data });
      }
    } catch (err) {
      const errMsg = `Error: ${err.response?.data?.error || err.message}`;
      setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: errMsg }]);
      speak('Something went wrong.');
    }
    setLoading(false);
  }, [history, onAgentPanel]);

  handleCommandRef.current = handleCommand;

  // Wake detection: "Jarvis" hotword or double-clap
  const toggleWake = useCallback(() => {
    if (wakeActive) {
      stopWakeDetection();
      setWakeActive(false);
    } else {
      startWakeDetection((trigger) => {
        // Activated by hotword or clap — start listening
        setSpeaking(true);
        speak('Hello Ben.', {
          onEnd: () => {
            setSpeaking(false);
            setListening(true);
            startListening({
              onResult: (text) => {
                setTranscript(text);
                setListening(false);
                handleCommandRef.current?.(text);
              },
              onEnd: () => setListening(false),
            });
          },
        });
      });
      setWakeActive(true);
    }
  }, [wakeActive]);

  // Auto-enable wake detection in Electron
  useEffect(() => {
    if (isElectron && !wakeActive) {
      toggleWake();
    }
    return () => { if (wakeActive) stopWakeDetection(); };
  }, []);

  const toggleListen = () => {
    if (listening) {
      stopListening();
      setListening(false);
    } else {
      setListening(true);
      startListening({
        onResult: (text) => {
          setTranscript(text);
          setListening(false);
          handleCommand(text);
        },
        onEnd: () => setListening(false),
      });
    }
  };

  const submitText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleCommand(inputText);
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 680, padding: '0 20px' }}>

      {/* Status line */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: '0.05em', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{listening ? '● LISTENING' : loading ? '◌ PROCESSING' : 'JARVIS · BCAUTOMATIONS OS'}</span>
        <button
          onClick={toggleWake}
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: wakeActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${wakeActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: wakeActive ? '#86efac' : '#64748b', cursor: 'pointer',
          }}
          title={wakeActive ? 'Wake detection ON — say "Jarvis" or double-clap' : 'Enable wake detection'}
        >
          {wakeActive ? 'WAKE ON' : 'WAKE OFF'}
        </button>
      </div>

      {/* Transcript / last response */}
      {(transcript || response) && (
        <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 16, textAlign: 'center', maxWidth: 500 }}>
          {transcript && <span style={{ color: '#e2e8f0' }}>"{transcript}"</span>}
          {response && <p style={{ marginTop: 6, color: '#7dd3fc' }}>{response}</p>}
        </div>
      )}

      {/* Voice button */}
      <button
        onClick={toggleListen}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: listening ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${listening ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer', fontSize: 24, marginBottom: 20,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Click to speak"
      >
        {listening ? '🔴' : '🎙️'}
      </button>

      {/* Text input */}
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

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {QUICK_ACTIONS.map(({ label, icon, agent, action }) => (
          <button
            key={label}
            onClick={() => handleCommand(`${label.toLowerCase()} ${action}`)}
            style={{
              padding: '6px 14px', borderRadius: 20,
              background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(59,130,246,0.2)',
              color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 5, alignItems: 'center',
            }}
          >
            {icon} {label}
          </button>
        ))}
        <button
          onClick={onBriefing}
          style={{
            padding: '6px 14px', borderRadius: 20,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#86efac', cursor: 'pointer', fontSize: 13,
          }}
        >
          ☀️ Briefing
        </button>
      </div>

      {/* Conversation history */}
      {history.length > 0 && (
        <div
          ref={historyRef}
          style={{
            width: '100%', maxHeight: 220, overflowY: 'auto',
            background: 'rgba(15,23,42,0.6)', borderRadius: 12,
            border: '1px solid rgba(59,130,246,0.15)', padding: 12,
          }}
        >
          {history.map((m, i) => (
            <div key={i} style={{
              fontSize: 13, marginBottom: 6,
              color: m.role === 'user' ? '#94a3b8' : '#7dd3fc',
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}>
              <span style={{ opacity: 0.5 }}>{m.role === 'user' ? 'Ben' : 'Jarvis'}: </span>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
