import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { speak, startListening, stopListening } from '../agents/voiceAgent.js';
import { startWakeDetection, stopWakeDetection, pauseWakeDetection, resumeWakeDetection } from '../agents/wakeDetector.js';

const API = import.meta.env.VITE_API_URL || '/api/agents';
const isElectron = !!window.jarvisDesktop;

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

  // Start listening for a voice command — pauses wake detection first
  const beginListening = useCallback(() => {
    pauseWakeDetection();
    setListening(true);
    startListening({
      onResult: (text) => {
        setTranscript(text);
        setListening(false);
        handleCommandRef.current?.(text);
      },
      onEnd: () => {
        setListening(false);
        // Resume always-on wake detection
        resumeWakeDetection();
      },
    });
  }, []);

  // Speak then auto-listen again for back-and-forth
  const speakAndRelisten = useCallback((text) => {
    setSpeaking(true);
    speak(text, {
      onEnd: () => {
        setSpeaking(false);
        setTimeout(() => {
          beginListening();
        }, 500);
      },
    });
  }, [beginListening]);

  const handleCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    setLoading(true);
    setResponse('');

    // Open websites in new tabs
    if (/^(open|show me|go to|navigate|launch|start)\s+/i.test(command)) {
      try {
        const { data } = await axios.post(`${API}/browser/open`, { command });
        const target = data.url;
        if (target) {
          window.open(target, '_blank');
          const msg = data.action === 'search'
            ? `Searching for "${command.replace(/^(open|show me|go to|navigate|launch|start)\s+/i, '').trim()}"`
            : `Opening ${target}`;
          setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: msg }]);
          setResponse(msg);
          speakAndRelisten(msg);
          setLoading(false);
          return;
        }
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
      speakAndRelisten(reply);

      if (data.url) {
        window.open(data.url, '_blank');
      }

      if (data.agent && data.agent !== 'general') {
        onAgentPanel?.({ agent: data.agent, data: data.data });
      }
    } catch (err) {
      // Backend not reachable — let the user know and keep listening
      const msg = 'Backend is offline. Start the Jarvis server to use AI commands.';
      setHistory(h => [...h, { role: 'user', text: command }, { role: 'jarvis', text: msg }]);
      setResponse(msg);
      speakAndRelisten(msg);
    }
    setLoading(false);
  }, [history, onAgentPanel, speakAndRelisten]);

  handleCommandRef.current = handleCommand;

  // Wake detection setup
  const toggleWake = useCallback(() => {
    if (wakeActive) {
      stopWakeDetection();
      setWakeActive(false);
    } else {
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
    }
  }, [wakeActive, beginListening]);

  // Auto-enable wake detection
  useEffect(() => {
    if (!wakeActive) {
      toggleWake();
    }
    return () => { if (wakeActive) stopWakeDetection(); };
  }, []);

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
    handleCommand(inputText);
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 680, padding: '0 20px' }}>

      {/* Status line */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: '0.05em', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>
          {listening ? 'LISTENING' : speaking ? 'SPEAKING' : loading ? 'PROCESSING' : 'JARVIS'}
        </span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: wakeActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${wakeActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: wakeActive ? '#86efac' : '#64748b',
        }}>
          {wakeActive ? 'ALWAYS ON' : 'OFF'}
        </span>
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
          cursor: 'pointer', fontSize: 12, marginBottom: 20,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: listening ? '#3b82f6' : '#64748b', letterSpacing: '0.05em',
        }}
      >
        {listening ? 'ON' : 'MIC'}
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

      {/* Conversation history */}
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
