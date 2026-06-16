import React, { useMemo } from 'react';

const STATE_COLORS = {
  idle:       { main: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
  listening:  { main: '#60a5fa', glow: 'rgba(96,165,250,0.5)' },
  speaking:   { main: '#4ade80', glow: 'rgba(74,222,128,0.45)' },
  processing: { main: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
};

export default function GlowOrb({ listening = false, speaking = false, processing = false, onClick }) {
  const state = listening ? 'listening' : speaking ? 'speaking' : processing ? 'processing' : 'idle';
  const colors = STATE_COLORS[state];

  // Generate particle positions at build time
  const particles = useMemo(() => [
    { duration: '4s', delay: '0s' },
    { duration: '5.5s', delay: '-1.5s' },
    { duration: '3.5s', delay: '-3s' },
    { duration: '6s', delay: '-0.8s' },
    { duration: '4.8s', delay: '-2.2s' },
  ], []);

  const stateClass = `reactor--${state}`;

  return (
    <div
      className={`reactor-wrapper ${stateClass}`}
      style={{ '--orb-color': colors.main, '--orb-glow': colors.glow }}
      onClick={onClick}
    >
      {/* Dashed outer ring */}
      <div className="reactor-ring reactor-ring--dashed" />
      {/* Outer ring */}
      <div className="reactor-ring reactor-ring--outer" />
      {/* Middle ring */}
      <div className="reactor-ring reactor-ring--mid" />
      {/* Inner ring */}
      <div className="reactor-ring reactor-ring--inner" />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="reactor-particle"
          style={{ animationDuration: p.duration, animationDelay: p.delay }}
        />
      ))}

      {/* Core */}
      <div className="reactor-core" />
    </div>
  );
}
