import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { speak, startListening, stopListening } from '../agents/voiceAgent.js';

const API = '/api/agents';

const QUICK_ACTIONS = [
  { label: 'Pipeline', icon: '📊', agent: 'client', action: 'pipeline' },
  { label: 'Notes', icon: '📝', agent: 'files', action: 'notes' },
  { label: 'Intel', icon: '🔍', agent: 'research', action: 'intel' },
  { label: 'Social', icon: '📱', agent: 'social', action: 'analytics' },
  { label: 'Calendar', icon: '📅', agent: 'calendar', action: 'today' },
];

export default function JarvisUI({ onAgentPanel, onBriefing }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const historyRef = useRef(null);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    setLoading(true);
    setResponse('');

    // Browser agent — handle client-side without backend round-trip
    if (/open|show me|go to|navigate/i.test(command)) {
      const { data } = await axios.post(`${API}/browser/open`, { command });
      if (data.url) {
        window.open(data.url, '_blank');
        const msg = `Opening ${data.url}`;
        setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: msg }]);
        speak(msg);
        setLoading(false);
        return;
      }
    }

    try {
      const { data } = await axios.post(`${API}/dispatch`, {
        command,
        context: history.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      });

      const reply = data.response || 'Done.';
      setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: reply }]);
      setResponse(reply);
      speak(reply);

      // If agent returned a panel-worthy payload, open it
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
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: '0.05em' }}>
        {listening ? '● LISTENING' : loading ? '◌ PROCESSING' : 'JARVIS · BCAUTOMATIONS OS'}
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
        title="Hold to speak"
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
