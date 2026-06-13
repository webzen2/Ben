import React, { useState, useEffect } from 'react';
import StarField from './components/StarField.jsx';
import GlowOrb from './components/GlowOrb.jsx';
import JarvisUI from './components/JarvisUI.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import MorningBriefing from './components/MorningBriefing.jsx';

export default function App() {
  const [activePanel, setActivePanel] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);

  // Auto-show briefing on first load in the morning
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setShowBriefing(true);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <StarField />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>
        <GlowOrb />
        <JarvisUI onAgentPanel={setActivePanel} onBriefing={() => setShowBriefing(true)} />
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
