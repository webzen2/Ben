import React, { useState, useEffect, useRef, useCallback } from 'react';
import StarField from './components/StarField.jsx';
import GlowOrb from './components/GlowOrb.jsx';
import JarvisUI from './components/JarvisUI.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import MorningBriefing from './components/MorningBriefing.jsx';
import AgentsPage from './components/AgentsPage.jsx';
import DevOpsPage from './components/DevOpsPage.jsx';

const isElectron = !!window.jarvisDesktop;

const QUICK_ACTIONS = [
  { id: 'email',    icon: '@',  label: 'Email',     command: 'check my email' },
  { id: 'schedule', icon: '#',  label: 'Schedule',   command: "what's on my calendar today" },
  { id: 'tasks',    icon: '/',  label: 'Tasks',      command: 'show my tasks' },
  { id: 'research', icon: '~',  label: 'Research',   command: 'competitor intel update' },
  { id: 'briefing', icon: '>',  label: 'Briefing',   command: null }, // special: triggers briefing
  { id: 'memory',   icon: '?',  label: 'Memory',     command: 'what do you know' },
];

function useClockTick() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatTime(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
}

const NAV_TABS = [
  { id: 'jarvis', label: 'JARVIS' },
  { id: 'agents', label: 'AGENTS' },
  { id: 'devops', label: 'DEV OPS' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('jarvis');
  const [activePanel, setActivePanel] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [orbState, setOrbState] = useState({ listening: false, speaking: false, loading: false });
  const [maximized, setMaximized] = useState(false);
  const jarvisRef = useRef(null);
  const now = useClockTick();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setShowBriefing(true);
  }, []);

  const toggleMaximize = async () => {
    if (!isElectron) return;
    if (maximized) {
      await window.jarvisDesktop.setWindowSize(420, 700);
      setMaximized(false);
    } else {
      await window.jarvisDesktop.setWindowSize(900, 800);
      setMaximized(true);
    }
  };

  const hideJarvis = () => {
    if (isElectron) window.jarvisDesktop.hideWindow();
  };

  const handleQuickAction = useCallback((action) => {
    if (action.id === 'briefing') {
      setShowBriefing(true);
      return;
    }
    if (action.command && jarvisRef.current?.injectCommand) {
      jarvisRef.current.injectCommand(action.command);
    }
  }, []);

  const btnStyle = {
    WebkitAppRegion: 'no-drag',
    background: 'none', border: 'none', color: '#475569',
    cursor: 'pointer', fontSize: 13, padding: '0 4px',
  };

  const statusKey = orbState.listening ? 'listening'
    : orbState.speaking ? 'speaking'
    : orbState.loading ? 'processing'
    : 'idle';

  const statusLabels = { idle: 'STANDBY', listening: 'LISTENING', speaking: 'SPEAKING', processing: 'PROCESSING' };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <StarField />
      <div className="hud-scanline" />

      {isElectron && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 32,
          WebkitAppRegion: 'drag', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
        }}>
          <span style={{ fontSize: 11, color: '#475569', WebkitAppRegion: 'no-drag' }}>JARVIS</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleMaximize} style={btnStyle} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? '◇' : '◻'}
            </button>
            <button onClick={hideJarvis} style={{ ...btnStyle, color: '#ef4444' }} title="Hide (double-clap to bring back)">
              x
            </button>
          </div>
        </div>
      )}

      {/* HUD Navigation Bar */}
      <nav className="hud-nav">
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            className={`hud-nav-tab ${currentPage === tab.id ? 'hud-nav-tab--active' : ''}`}
            onClick={() => setCurrentPage(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
        paddingTop: isElectron ? 72 : 52,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* JARVIS Home Page */}
        {currentPage === 'jarvis' && (
          <>
            {/* HUD Header */}
            <div className="hud-header">
              <div className="hud-version">JARVIS v2.0 -- TACTICAL INTERFACE</div>
              <div className="hud-clock">{formatTime(now)}</div>
              <div className="hud-date">{formatDate(now)}</div>
            </div>

            {/* Arc Reactor Orb */}
            <GlowOrb
              listening={orbState.listening}
              speaking={orbState.speaking}
              processing={orbState.loading}
            />

            {/* Status Badge */}
            <div className={`hud-status hud-status--${statusKey}`}>
              {statusLabels[statusKey]}
            </div>

            {/* JarvisUI - all voice/command logic */}
            <div style={{ width: '100%', maxWidth: 680, padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <JarvisUI
                ref={jarvisRef}
                onAgentPanel={setActivePanel}
                onBriefing={() => setShowBriefing(true)}
                onOrbState={setOrbState}
              />
            </div>

            {/* Quick Action Grid */}
            <div className="hud-grid">
              {QUICK_ACTIONS.map((action) => (
                <div
                  key={action.id}
                  className="hud-tile"
                  onClick={() => handleQuickAction(action)}
                >
                  <span className="hud-tile-icon">{action.icon}</span>
                  <span className="hud-tile-label">{action.label}</span>
                </div>
              ))}
            </div>

            {/* Hint */}
            <div className="hud-hint">SAY &quot;JARVIS&quot; TO BEGIN</div>
          </>
        )}

        {/* Agents Page */}
        {currentPage === 'agents' && <AgentsPage />}

        {/* Dev Ops Page */}
        {currentPage === 'devops' && <DevOpsPage />}
      </div>

      {activePanel && (
        <AgentPanel agent={activePanel} onClose={() => setActivePanel(null)} />
      )}

      {showBriefing && (
        <MorningBriefing onClose={() => setShowBriefing(false)} />
      )}
    </div>
  );
}
