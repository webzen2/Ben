import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';

const panelConfig = {
  client: {
    title: 'Client Pipeline',
    fetch: () => axios.get(`${API}/client/pipeline`),
    render: (d) => (
      <pre style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(d, null, 2)}
      </pre>
    ),
  },
  files: {
    title: 'Notes & Files',
    fetch: () => axios.get(`${API}/files/notes`),
    render: (d) => (
      <div>
        <label style={{
          display: 'block', marginBottom: 16, padding: '12px 16px',
          border: '1px dashed rgba(59,130,246,0.4)', borderRadius: 8,
          color: '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'center',
        }}>
          Upload PDF / Text file
          <input type="file" accept=".pdf,.txt" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const form = new FormData();
              form.append('file', file);
              const { data } = await axios.post(`${API}/files/upload`, form);
              alert(`Summary saved:\n\n${data.summary}`);
            }}
          />
        </label>
        {(d || []).length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>No notes yet. Say "save note" or upload a file.</p>}
        {(d || []).map((n, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>{n.topic} · {new Date(n.created_at).toLocaleDateString()}</div>
            <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 4 }}>{n.content}</div>
          </div>
        ))}
      </div>
    ),
  },
  research: {
    title: 'Competitor Intel',
    fetch: () => axios.get(`${API}/research/competitor-intel`),
    render: (d) => (
      <div>
        {(d || []).map((item, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <a href={item.link || item.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: '#7dd3fc', textDecoration: 'none' }}>
              {item.title}
            </a>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.snippet || item.description}</div>
          </div>
        ))}
      </div>
    ),
  },
  social: {
    title: 'Social Analytics',
    fetch: () => axios.get(`${API}/social/analytics`),
    render: (d) => (
      <pre style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(d, null, 2)}
      </pre>
    ),
  },
  tasks: {
    title: 'Tasks & Ideas',
    fetch: () => axios.get(`${API}/tasks`),
    render: (d) => (
      <div>
        {(d || []).length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>No open tasks.</p>}
        {(d || []).map((t, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{t.title}</div>
              {t.body && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.body}</div>}
            </div>
            <button
              onClick={() => axios.patch(`${API}/tasks/${t.id}/close`).then(() => window.location.reload())}
              style={{ background: 'none', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
            >Done</button>
          </div>
        ))}
      </div>
    ),
  },
  calendar: {
    title: 'Today\'s Schedule',
    fetch: () => axios.get(`${API}/calendar/today`),
    render: (d) => (
      <div>
        {(d || []).length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>No events today.</p>}
        {(d || []).map((e, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {e.location ? ` · ${e.location}` : ''}
            </div>
          </div>
        ))}
      </div>
    ),
  },
};

export default function AgentPanel({ agent, data: initialData, onClose }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const config = panelConfig[agent?.agent || agent] || panelConfig.client;

  useEffect(() => {
    if (initialData) return;
    config.fetch()
      .then(r => setData(r.data))
      .catch(() => onClose())
      .finally(() => setLoading(false));
  }, [agent]);

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 380,
      background: 'rgba(8,15,30,0.95)', borderLeft: '1px solid rgba(59,130,246,0.2)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#e2e8f0' }}>{config.title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>x</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading && <p style={{ color: '#64748b', fontSize: 13 }}>Loading...</p>}
        {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
        {!loading && !error && data && config.render(data)}
      </div>
    </div>
  );
}
