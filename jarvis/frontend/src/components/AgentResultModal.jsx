import React, { useCallback } from 'react';
import { jsPDF } from 'jspdf';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).toUpperCase();
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* ── Per-agent formatted views ── */

function NovaResult({ data }) {
  const { pipeline, contracts } = data || {};
  return (
    <div className="agent-modal-sections">
      {pipeline && pipeline.length > 0 && (
        <div className="agent-modal-section">
          <div className="agent-modal-section-title">PIPELINE CONTACTS</div>
          <table className="agent-modal-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>STAGE</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((c, i) => (
                <tr key={i}>
                  <td>{c.name || c.contactName || c.firstName || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.stage || c.pipelineStage || c.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {contracts && contracts.length > 0 && (
        <div className="agent-modal-section">
          <div className="agent-modal-section-title">CONTRACT STATUS</div>
          {contracts.map((c, i) => (
            <div key={i} className="agent-modal-card">
              <span className="agent-modal-card-title">{c.name || c.title || `Contract #${i + 1}`}</span>
              <span className="agent-modal-card-meta">{c.status || '—'}</span>
            </div>
          ))}
        </div>
      )}
      {(!pipeline || pipeline.length === 0) && (!contracts || contracts.length === 0) && (
        <div className="agent-modal-empty">No pipeline or contract data available.</div>
      )}
    </div>
  );
}

function EchoResult({ data }) {
  const { analytics, dms } = data || {};
  return (
    <div className="agent-modal-sections">
      {analytics && (
        <div className="agent-modal-section">
          <div className="agent-modal-section-title">SOCIAL MEDIA STATS</div>
          <div className="agent-modal-stats-grid">
            {Object.entries(analytics).map(([key, val]) => (
              <div key={key} className="agent-modal-stat">
                <div className="agent-modal-stat-value">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                <div className="agent-modal-stat-label">{key.replace(/_/g, ' ').toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {dms && dms.length > 0 && (
        <div className="agent-modal-section">
          <div className="agent-modal-section-title">DM DRAFTS</div>
          {dms.map((dm, i) => (
            <div key={i} className="agent-modal-card">
              <span className="agent-modal-card-title">{dm.to || dm.recipient || dm.username || `DM #${i + 1}`}</span>
              <p className="agent-modal-card-body">{dm.message || dm.text || dm.draft || '—'}</p>
            </div>
          ))}
        </div>
      )}
      {!analytics && (!dms || dms.length === 0) && (
        <div className="agent-modal-empty">No social data available.</div>
      )}
    </div>
  );
}

function RadarResult({ data }) {
  const items = data?.intel || [];
  return (
    <div className="agent-modal-sections">
      {items.length > 0 ? (
        <div className="agent-modal-section">
          <div className="agent-modal-section-title">COMPETITOR INTEL</div>
          <div className="agent-modal-cards-grid">
            {items.map((item, i) => (
              <div key={i} className="agent-modal-card agent-modal-card--wide">
                <span className="agent-modal-card-title">{item.title || item.name || `Intel #${i + 1}`}</span>
                {item.snippet && <p className="agent-modal-card-body">{item.snippet}</p>}
                {item.description && <p className="agent-modal-card-body">{item.description}</p>}
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="agent-modal-card-link">
                    {item.link}
                  </a>
                )}
                {item.url && !item.link && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="agent-modal-card-link">
                    {item.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="agent-modal-empty">No intel data available.</div>
      )}
    </div>
  );
}

function VaultResult({ data }) {
  const { memories, categories } = data || {};
  const grouped = {};
  (memories || []).forEach(m => {
    const cat = m.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  return (
    <div className="agent-modal-sections">
      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="agent-modal-section">
            <div className="agent-modal-section-title">{cat.toUpperCase()} ({items.length})</div>
            {items.map((m, i) => (
              <div key={i} className="agent-modal-card">
                <span className="agent-modal-card-body">{m.content || m.text || JSON.stringify(m)}</span>
              </div>
            ))}
          </div>
        ))
      ) : (
        <div className="agent-modal-empty">No memories stored.</div>
      )}
    </div>
  );
}

function PulseResult({ data }) {
  const { schedule, emails } = data || {};
  const events = Array.isArray(schedule) ? schedule : schedule?.events || schedule?.items || [];
  const messages = emails?.messages || emails?.items || (Array.isArray(emails) ? emails : []);

  return (
    <div className="agent-modal-sections">
      <div className="agent-modal-section">
        <div className="agent-modal-section-title">TODAY'S EVENTS ({events.length})</div>
        {events.length > 0 ? events.map((e, i) => (
          <div key={i} className="agent-modal-card">
            <span className="agent-modal-card-title">{e.summary || e.title || e.name || `Event #${i + 1}`}</span>
            <span className="agent-modal-card-meta">
              {e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : e.time || '—'}
            </span>
          </div>
        )) : <div className="agent-modal-empty">No events today.</div>}
      </div>

      <div className="agent-modal-section">
        <div className="agent-modal-section-title">RECENT EMAILS ({messages.length})</div>
        {messages.length > 0 ? messages.map((m, i) => (
          <div key={i} className="agent-modal-card">
            <span className="agent-modal-card-title">{m.subject || m.snippet || `Email #${i + 1}`}</span>
            <span className="agent-modal-card-meta">{m.from || m.sender || '—'}</span>
          </div>
        )) : <div className="agent-modal-empty">No recent emails.</div>}
      </div>
    </div>
  );
}

function GenericResult({ data }) {
  return (
    <div className="agent-modal-sections">
      <pre className="agent-modal-raw">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

const RESULT_RENDERERS = {
  nova: NovaResult,
  echo: EchoResult,
  radar: RadarResult,
  vault: VaultResult,
  pulse: PulseResult,
};

/* ── PDF Generation ── */

function generatePDF(agentName, agentColor, data) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (text, size = 10, color = [40, 40, 40], isBold = false) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(size);
    doc.setTextColor(...color);
    if (isBold) doc.setFont('courier', 'bold');
    else doc.setFont('courier', 'normal');
    const lines = doc.splitTextToSize(text, pageW - 40);
    doc.text(lines, 20, y);
    y += lines.length * (size * 0.5) + 4;
  };

  // Title
  addLine(`JARVIS // ${agentName.toUpperCase()} REPORT`, 18, [20, 20, 20], true);
  addLine(formatDate() + '  ' + formatTime(), 10, [100, 100, 100]);
  y += 6;
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageW - 20, y);
  y += 10;

  const flatPrint = (obj, indent = 0) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          addLine(`${' '.repeat(indent)}#${i + 1}`, 10, [56, 130, 200], true);
          flatPrint(item, indent + 2);
          y += 2;
        } else {
          addLine(`${' '.repeat(indent)}- ${String(item)}`, 10, [40, 40, 40]);
        }
      });
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => {
        if (val && typeof val === 'object') {
          addLine(`${' '.repeat(indent)}${key.toUpperCase()}:`, 10, [56, 130, 200], true);
          flatPrint(val, indent + 2);
        } else {
          addLine(`${' '.repeat(indent)}${key}: ${String(val ?? '—')}`, 10, [40, 40, 40]);
        }
      });
    } else {
      addLine(`${' '.repeat(indent)}${String(obj)}`, 10, [40, 40, 40]);
    }
  };

  flatPrint(data);

  // Footer
  y += 10;
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, y, pageW - 20, y);
  y += 6;
  addLine('Generated by JARVIS AI', 8, [150, 150, 150]);

  doc.save(`JARVIS_${agentName.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── Modal Component ── */

export default function AgentResultModal({ agent, result, onClose }) {
  const Renderer = RESULT_RENDERERS[agent.id] || GenericResult;

  const handleDownload = useCallback(() => {
    generatePDF(agent.name, agent.color, result.data);
  }, [agent, result]);

  return (
    <div className="agent-modal" onClick={onClose}>
      <div className="agent-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="agent-modal-header" style={{ borderColor: `${agent.color}44` }}>
          <div className="agent-modal-icon" style={{ borderColor: agent.color, color: agent.color, boxShadow: `0 0 16px ${agent.color}44` }}>
            {agent.icon}
          </div>
          <div>
            <div className="agent-modal-name" style={{ color: agent.color }}>{agent.name}</div>
            <div className="agent-modal-role">{agent.role}</div>
          </div>
          <div className="agent-modal-date">{formatDate()}<br />{formatTime()}</div>
        </div>

        {/* Body */}
        <div className="agent-modal-body">
          {result?.message && (
            <div className="agent-modal-summary">{result.message}</div>
          )}
          {result?.data ? (
            <Renderer data={result.data} />
          ) : (
            <div className="agent-modal-empty">No result data available.</div>
          )}
        </div>

        {/* Actions */}
        <div className="agent-modal-actions">
          {result?.data && (
            <button className="agent-modal-btn agent-modal-btn--download" onClick={handleDownload}>
              DOWNLOAD PDF
            </button>
          )}
          <button className="agent-modal-btn agent-modal-btn--close" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
