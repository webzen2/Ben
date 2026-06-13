import React, { useState, useEffect } from 'react';
import StarField from './components/StarField.jsx';
import GlowOrb from './components/GlowOrb.jsx';
import JarvisUI from './components/JarvisUI.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import MorningBriefing from './components/MorningBriefing.jsx';

const isElectron = !!window.jarvisDesktop;

export default function App() {
  const [activePanel, setActivePanel] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [orbState, setOrbState] = useState({ listening: false, speaking: false });
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setShowBriefing(true);
  }, []);

  const toggleMinimize = async () => {
    if (!isElectron) return;
    if (minimized) {
      await window.jarvisDesktop.expandFromOrb();
      setMinimized(false);
    } else {
      await window.jarvisDesktop.minimizeToOrb();
      setMinimized(true);
    }
  };

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

  if (minimized) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', cursor: 'pointer' }}
        onClick={toggleMinimize}>
        <StarField />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <GlowOrb listening={orbState.listening} speaking={orbState.speaking} />
        </div>
      </div>
    );
  }

  const btnStyle = {
    WebkitAppRegion: 'no-drag',
    background: 'none', border: 'none', color: '#475569',
    cursor: 'pointer', fontSize: 13, padding: '0 4px',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <StarField />

      {isElectron && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 32,
          WebkitAppRegion: 'drag', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
        }}>
          <span style={{ fontSize: 11, color: '#475569', WebkitAppRegion: 'no-drag' }}>JARVIS</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleMinimize} style={btnStyle} title="Minimize to orb">—</button>
            <button onClick={toggleMaximize} style={btnStyle} title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? '◇' : '◻'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
        paddingTop: isElectron ? 32 : 0,
      }}>
        <GlowOrb listening={orbState.listening} speaking={orbState.speaking} />
        <JarvisUI
          onAgentPanel={setActivePanel}
          onBriefing={() => setShowBriefing(true)}
          onOrbState={setOrbState}
        />
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
