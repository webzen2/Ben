import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const API_TOKEN = import.meta.env.VITE_JARVIS_TOKEN || '';
const apiHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

const SERVICES = [
  { id: 'backend', name: 'Backend', provider: 'Railway', checkUrl: `${API.replace('/api/agents', '')}/health` },
  { id: 'database', name: 'Database', provider: 'Supabase' },
  { id: 'frontend', name: 'Frontend', provider: 'Vercel' },
];

const INTEGRATIONS = [
  { id: 'gmail', name: 'Gmail', icon: '@' },
  { id: 'ghl', name: 'GoHighLevel', icon: '#' },
  { id: 'instagram', name: 'Instagram', icon: 'IG' },
  { id: 'facebook', name: 'Facebook', icon: 'FB' },
  { id: 'brave', name: 'Brave/Serper', icon: '~' },
];

export default function DevOpsPage() {
  const [serviceStatus, setServiceStatus] = useState({});
  const [activityFeed, setActivityFeed] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState({});
  const logRef = useRef(null);

  // Check services on mount and poll
  useEffect(() => {
    const checkServices = async () => {
      // Backend health check
      try {
        const start = Date.now();
        const { data } = await axios.get(SERVICES[0].checkUrl, { timeout: 5000 });
        const latency = Date.now() - start;
        setServiceStatus(prev => ({ ...prev, backend: { up: true, latency } }));
      } catch {
        setServiceStatus(prev => ({ ...prev, backend: { up: false } }));
      }

      // Frontend is up if we're rendering
      setServiceStatus(prev => ({ ...prev, frontend: { up: true, latency: 0 } }));

      // Database — we check via a backend status endpoint
      try {
        const { data } = await axios.get(`${API}/status`, { headers: apiHeaders, timeout: 5000 });
        setSystemInfo(data);
        setServiceStatus(prev => ({ ...prev, database: { up: true } }));

        // Integration status from backend
        if (data.integrations) {
          setIntegrationStatus(data.integrations);
        }
      } catch {
        setServiceStatus(prev => ({ ...prev, database: { up: false } }));
      }

      // Fetch activity
      try {
        const { data } = await axios.get(`${API}/activity`, { headers: apiHeaders, timeout: 5000 });
        setActivityFeed(data.activities || []);
        setErrorLog(data.errors || []);
      } catch {
        // Simulated data when backend is offline
        setErrorLog(prev => prev.length ? prev : [
          { ts: new Date().toISOString(), level: 'WARN', message: 'Could not reach backend for activity feed' },
        ]);
      }
    };

    checkServices();
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [errorLog]);

  return (
    <div className="devops-page">
      {/* System Status */}
      <div className="devops-section">
        <div className="devops-section-title">SYSTEM STATUS</div>
        <div className="devops-status-grid">
          {SERVICES.map(svc => {
            const status = serviceStatus[svc.id];
            const isUp = status?.up;
            return (
              <div key={svc.id} className="devops-status-card">
                <div className="devops-status-header">
                  <span className={`devops-status-dot ${isUp ? 'devops-status-dot--up' : isUp === false ? 'devops-status-dot--down' : 'devops-status-dot--unknown'}`} />
                  <span className="devops-status-name">{svc.name}</span>
                </div>
                <div className="devops-status-provider">{svc.provider}</div>
                <div className="devops-status-label">{isUp ? 'OPERATIONAL' : isUp === false ? 'DOWN' : 'CHECKING...'}</div>
                {status?.latency != null && (
                  <div className="devops-status-latency">{status.latency}ms</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* System Info */}
      {systemInfo && (
        <div className="devops-section">
          <div className="devops-section-title">SYSTEM INFO</div>
          <div className="devops-info-row">
            <span className="devops-info-label">UPTIME</span>
            <span className="devops-info-value">{Math.floor((systemInfo.uptime || 0) / 60)}m {Math.floor((systemInfo.uptime || 0) % 60)}s</span>
          </div>
          <div className="devops-info-row">
            <span className="devops-info-label">MEMORY</span>
            <span className="devops-info-value">{systemInfo.memoryMB ? `${systemInfo.memoryMB}MB` : 'N/A'}</span>
          </div>
          <div className="devops-info-row">
            <span className="devops-info-label">AGENTS</span>
            <span className="devops-info-value">{systemInfo.agentCount || 6} registered</span>
          </div>
        </div>
      )}

      {/* Error Log */}
      <div className="devops-section">
        <div className="devops-section-title">ERROR LOG</div>
        <div className="devops-terminal" ref={logRef}>
          {errorLog.length === 0 && (
            <div className="devops-terminal-line devops-terminal-line--dim">No errors logged. System nominal.</div>
          )}
          {errorLog.map((entry, i) => (
            <div key={i} className={`devops-terminal-line ${entry.level === 'ERROR' ? 'devops-terminal-line--error' : entry.level === 'WARN' ? 'devops-terminal-line--warn' : ''}`}>
              <span className="devops-terminal-ts">{new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
              <span className="devops-terminal-level">[{entry.level}]</span>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Activity Feed */}
      <div className="devops-section">
        <div className="devops-section-title">AGENT ACTIVITY FEED</div>
        <div className="devops-activity-feed">
          {activityFeed.length === 0 && (
            <div className="devops-activity-empty">No recent agent activity</div>
          )}
          {activityFeed.map((entry, i) => (
            <div key={i} className="devops-activity-item">
              <div className="devops-activity-dot" style={{ background: entry.success ? '#4ade80' : '#ef4444' }} />
              <div className="devops-activity-content">
                <div className="devops-activity-header">
                  <span className="devops-activity-agent">{(entry.agent || '').toUpperCase()}</span>
                  <span className="devops-activity-ts">{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                </div>
                <div className="devops-activity-action">{entry.action}</div>
              </div>
              <span className={`devops-activity-badge ${entry.success ? 'devops-activity-badge--ok' : 'devops-activity-badge--fail'}`}>
                {entry.success ? 'OK' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      <div className="devops-section">
        <div className="devops-section-title">INTEGRATIONS</div>
        <div className="devops-integrations-grid">
          {INTEGRATIONS.map(intg => {
            const connected = integrationStatus[intg.id] ?? null;
            return (
              <div key={intg.id} className="devops-integration-card">
                <div className="devops-integration-icon">{intg.icon}</div>
                <div className="devops-integration-name">{intg.name}</div>
                <div className={`devops-integration-status ${connected ? 'devops-integration-status--connected' : connected === false ? 'devops-integration-status--disconnected' : ''}`}>
                  {connected ? 'CONNECTED' : connected === false ? 'DISCONNECTED' : 'UNKNOWN'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fix with Claude */}
      <div className="devops-section" style={{ textAlign: 'center' }}>
        <button
          className="devops-claude-btn"
          onClick={() => window.open('https://claude.ai', '_blank')}
        >
          FIX WITH CLAUDE
        </button>
      </div>
    </div>
  );
}
