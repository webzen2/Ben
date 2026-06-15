import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { speak } from '../agents/voiceAgent.js';

export default function MorningBriefing({ onClose }) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents'}/briefing`)
      .then(r => {
        const text = r.data.briefing || 'Good morning, Ben. Have a great day.';
        setBriefing(text);
        speak(text);
      })
      .catch(() => {
        const fallback = `Good morning, Ben. Jarvis is online. Have a productive day building BCAutomations.`;
        setBriefing(fallback);
        speak(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 520, width: '90%', padding: 36,
        background: 'rgba(8,15,30,0.95)', borderRadius: 20,
        border: '1px solid rgba(59,130,246,0.25)',
        boxShadow: '0 0 60px rgba(59,130,246,0.1)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 300, color: '#e2e8f0', marginBottom: 20, letterSpacing: '-0.01em' }}>
          Morning Briefing
        </div>

        {loading ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>Compiling your briefing...</p>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{briefing}</p>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 24, padding: '10px 24px', borderRadius: 24,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#93c5fd', cursor: 'pointer', fontSize: 14,
          }}
        >
          Let's go
        </button>
      </div>
    </div>
  );
}
