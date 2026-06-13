import React, { useEffect, useRef } from 'react';

export default function GlowOrb({ listening = false, speaking = false }) {
  const orbRef = useRef(null);

  useEffect(() => {
    const el = orbRef.current;
    let animId;
    let t = 0;

    const animate = () => {
      t += 0.02;
      const scale = 1 + Math.sin(t) * 0.04;
      const glow = listening ? '0 0 60px 20px rgba(59,130,246,0.6)' :
                   speaking  ? '0 0 60px 20px rgba(34,197,94,0.6)' :
                               '0 0 40px 12px rgba(59,130,246,0.3)';
      el.style.transform = `scale(${scale})`;
      el.style.boxShadow = glow;
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, [listening, speaking]);

  const color = listening ? '#3b82f6' : speaking ? '#22c55e' : '#1d4ed8';

  return (
    <div
      ref={orbRef}
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}44)`,
        border: `1px solid ${color}66`,
        marginBottom: 32,
        transition: 'background 0.4s',
        cursor: 'pointer',
      }}
    />
  );
}
