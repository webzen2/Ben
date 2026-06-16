import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import AgentResultModal from './AgentResultModal.jsx';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const API_TOKEN = import.meta.env.VITE_JARVIS_TOKEN || '';
const apiHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

const AGENTS = [
  { id: 'jarvis', name: 'JARVIS', role: 'Main Operator & Orchestrator', color: '#38bdf8', icon: 'J', alwaysOnline: true, handles: ['Command routing', 'Task planning', 'Multi-agent orchestration'] },
  { id: 'nova', name: 'NOVA', role: 'Client & Sales Agent', color: '#f472b6', icon: 'N', handles: ['GHL pipeline', 'Follow-ups', 'Onboarding', 'Contracts'] },
  { id: 'echo', name: 'ECHO', role: 'Social Media Agent', color: '#a78bfa', icon: 'E', handles: ['Instagram/Facebook posts', 'Analytics', 'DM replies'] },
  { id: 'radar', name: 'RADAR', role: 'Research & Intel Agent', color: '#fb923c', icon: 'R', handles: ['Web search', 'Competitor intel', 'News'] },
  { id: 'vault', name: 'VAULT', role: 'Files & Memory Agent', color: '#4ade80', icon: 'V', handles: ['Notes', 'Documents', 'Memories', 'Knowledge base'] },
  { id: 'pulse', name: 'PULSE', role: 'Email & Calendar Agent', color: '#facc15', icon: 'P', handles: ['Inbox', 'Send email', 'Scheduling', 'Events'] },
];

export default function AgentsPage() {
  const [agentStates, setAgentStates] = useState(() => {
    const states = {};
    AGENTS.forEach(a => {
      states[a.id] = {
        status: a.alwaysOnline ? 'ONLINE' : 'IDLE',
        log: [],
      };
    });
    return states;
  });
  const [commandInput, setCommandInput] = useState('');
  const [commandLog, setCommandLog] = useState([]);
  const [modalAgent, setModalAgent] = useState(null);
  const canvasRef = useRef(null);

  // Draw orchestrator connections
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let phase = 0;

    const draw = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      phase += 0.005;

      // Draw lines from center to each satellite agent
      const satellites = AGENTS.filter(a => a.id !== 'jarvis');
      const angleStep = (2 * Math.PI) / satellites.length;
      const radius = Math.min(cx, cy) * 0.7;

      satellites.forEach((agent, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;

        // Animated dash
        const isRunning = agentStates[agent.id]?.status === 'RUNNING';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = isRunning ? agent.color : `${agent.color}33`;
        ctx.lineWidth = isRunning ? 1.5 : 0.8;
        if (!isRunning) {
          ctx.setLineDash([4, 6]);
        } else {
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -phase * 200;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Node dot
        ctx.beginPath();
        ctx.arc(ex, ey, isRunning ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isRunning ? agent.color : `${agent.color}66`;
        ctx.fill();

        // Label
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = `${agent.color}aa`;
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, ex, ey + 16);
      });

      // Center node (Jarvis)
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = '#38bdf8aa';
      ctx.textAlign = 'center';
      ctx.fillText('JARVIS', cx, cy + 24);

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [agentStates]);

  const addLog = useCallback((agentId, message) => {
    setAgentStates(prev => {
      const agentState = prev[agentId];
      const newLog = [{ text: message, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }, ...agentState.log].slice(0, 3);
      return { ...prev, [agentId]: { ...agentState, log: newLog } };
    });
  }, []);

  const runAgent = useCallback(async (agentId) => {
    if (agentId === 'jarvis') return;
    setAgentStates(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], status: 'RUNNING', lastResult: null },
    }));
    addLog(agentId, 'Agent activated...');

    try {
      const { data } = await axios.post(`${API}/agents/run`, { agents: [agentId] }, { headers: apiHeaders });
      const result = data.results?.[agentId];
      addLog(agentId, result?.message || 'Done');
      setAgentStates(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], status: 'ONLINE', lastResult: result },
      }));
    } catch {
      addLog(agentId, 'Backend offline');
      setAgentStates(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], status: 'ONLINE', lastResult: { message: 'Backend offline', success: false } },
      }));
    }
  }, [addLog]);

  const parseAndRun = useCallback((input) => {
    const lc = input.toLowerCase().trim();
    if (!lc) return;

    setCommandLog(prev => [`> ${input}`, ...prev].slice(0, 20));

    if (/run all|activate all|launch all/.test(lc)) {
      AGENTS.filter(a => a.id !== 'jarvis').forEach(a => runAgent(a.id));
      setCommandLog(prev => ['JARVIS // Activating all agents...', ...prev].slice(0, 20));
      return;
    }

    const matched = [];
    AGENTS.forEach(a => {
      if (lc.includes(a.id) || lc.includes(a.name.toLowerCase())) {
        matched.push(a);
      }
    });

    if (matched.length > 0) {
      matched.forEach(a => runAgent(a.id));
      setCommandLog(prev => [`JARVIS // Running ${matched.map(a => a.name).join(', ')}...`, ...prev].slice(0, 20));
    } else {
      setCommandLog(prev => ['JARVIS // No agent matched. Try "run pulse" or "run all agents".', ...prev].slice(0, 20));
    }
  }, [runAgent]);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    parseAndRun(commandInput);
    setCommandInput('');
  };

  return (
    <div className="agents-page">
      {/* Command Bar */}
      <form className="agents-command-bar" onSubmit={handleCommandSubmit}>
        <span className="agents-command-prompt">&gt;</span>
        <input
          className="hud-input agents-command-input"
          value={commandInput}
          onChange={e => setCommandInput(e.target.value)}
          placeholder='Type "run pulse and vault" or "run all agents"...'
        />
        <button type="submit" className="hud-send-btn">EXECUTE</button>
      </form>

      {/* Command Log */}
      {commandLog.length > 0 && (
        <div className="agents-cmdlog">
          {commandLog.slice(0, 5).map((line, i) => (
            <div key={i} className="hud-log-entry" style={{ color: line.startsWith('>') ? 'var(--text-dim)' : 'var(--hud-blue)', fontSize: 10 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Network Visualization */}
      <div className="agents-network">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Agent Cards Grid */}
      <div className="agents-grid">
        {AGENTS.map(agent => {
          const state = agentStates[agent.id];
          const isRunning = state.status === 'RUNNING';
          const isOnline = state.status === 'ONLINE';
          return (
            <div
              key={agent.id}
              className={`agent-card ${isRunning ? 'agent-card--running' : ''}`}
              style={{ '--agent-color': agent.color }}
            >
              {/* Agent Icon */}
              <div className="agent-card-header">
                <div className={`agent-icon ${isRunning ? 'agent-icon--pulse' : ''}`} style={{ borderColor: agent.color, color: agent.color, boxShadow: isRunning ? `0 0 16px ${agent.color}44` : 'none' }}>
                  {agent.icon}
                </div>
                <div className="agent-card-info">
                  <div className="agent-card-name" style={{ color: agent.color }}>{agent.name}</div>
                  <div className="agent-card-role">{agent.role}</div>
                </div>
              </div>

              {/* Status */}
              <div className="agent-card-status">
                <span className={`agent-status-dot ${isRunning ? 'agent-status-dot--running' : isOnline ? 'agent-status-dot--online' : ''}`} style={{ background: isRunning ? agent.color : isOnline ? '#4ade80' : '#64748b' }} />
                <span className="agent-status-label">{state.status}</span>
              </div>

              {/* Handles */}
              <div className="agent-card-handles">
                {agent.handles.map((h, i) => (
                  <span key={i} className="agent-handle-tag" style={{ borderColor: `${agent.color}33`, color: `${agent.color}cc` }}>{h}</span>
                ))}
              </div>

              {/* Activity Log */}
              <div className="agent-card-log">
                {state.log.length === 0 && <div className="agent-log-empty">No recent activity</div>}
                {state.log.map((entry, i) => (
                  <div key={i} className="agent-log-line">
                    <span className="agent-log-time">{entry.time}</span>
                    <span className="agent-log-text">{entry.text}</span>
                  </div>
                ))}
              </div>

              {/* Result Data */}
              {state.lastResult?.data && (
                <div className="agent-card-result" style={{ borderColor: `${agent.color}22` }}>
                  <div className="agent-result-label" style={{ color: agent.color }}>LAST OUTPUT</div>
                  <pre className="agent-result-data">{JSON.stringify(state.lastResult.data, null, 2)}</pre>
                </div>
              )}

              {/* View Report Button */}
              {state.lastResult?.data && (
                <button
                  className="agent-run-btn"
                  style={{ borderColor: `${agent.color}55`, color: agent.color, marginTop: -4 }}
                  onClick={() => setModalAgent(agent.id)}
                >
                  VIEW REPORT
                </button>
              )}

              {/* Run Button */}
              {agent.id !== 'jarvis' && (
                <button
                  className="agent-run-btn"
                  style={{ borderColor: `${agent.color}55`, color: agent.color }}
                  onClick={() => runAgent(agent.id)}
                  disabled={isRunning}
                >
                  {isRunning ? 'RUNNING...' : 'RUN'}
                </button>
              )}
              {agent.id === 'jarvis' && (
                <div className="agent-always-on" style={{ color: agent.color }}>ALWAYS ACTIVE</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Agent Result Modal */}
      {modalAgent && agentStates[modalAgent]?.lastResult && (
        <AgentResultModal
          agent={AGENTS.find(a => a.id === modalAgent)}
          result={agentStates[modalAgent].lastResult}
          onClose={() => setModalAgent(null)}
        />
      )}
    </div>
  );
}
