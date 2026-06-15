import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const API_TOKEN = import.meta.env.VITE_JARVIS_TOKEN || '';
const apiHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

const CATEGORIES = ['general', 'business', 'clients', 'preferences', 'credentials'];

export default function TrainingPage() {
  // Teach a Memory
  const [memContent, setMemContent] = useState('');
  const [memCategory, setMemCategory] = useState('general');
  const [memSaving, setMemSaving] = useState(false);
  const [memStatus, setMemStatus] = useState('');

  // Custom Commands
  const [cmdTrigger, setCmdTrigger] = useState('');
  const [cmdResponse, setCmdResponse] = useState('');
  const [cmdSaving, setCmdSaving] = useState(false);
  const [cmdStatus, setCmdStatus] = useState('');

  // Quick Train
  const [quickText, setQuickText] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickStatus, setQuickStatus] = useState('');

  // Knowledge Base
  const [grouped, setGrouped] = useState({});
  const [kbLoading, setKbLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    setKbLoading(true);
    try {
      const { data } = await axios.get(`${API}/memory/grouped`, { headers: apiHeaders });
      setGrouped(data || {});
    } catch {
      // Fallback: fetch ungrouped and group client-side
      try {
        const { data } = await axios.get(`${API}/memory`, { headers: apiHeaders });
        const g = {};
        (Array.isArray(data) ? data : []).forEach(m => {
          const cat = m.category || 'general';
          if (!g[cat]) g[cat] = [];
          g[cat].push(m);
        });
        setGrouped(g);
      } catch {
        setGrouped({});
      }
    }
    setKbLoading(false);
  }, []);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const saveMemory = async (e) => {
    e.preventDefault();
    if (!memContent.trim()) return;
    setMemSaving(true);
    setMemStatus('');
    try {
      await axios.post(`${API}/memory`, { content: memContent.trim(), category: memCategory }, { headers: apiHeaders });
      setMemStatus('Memory saved.');
      setMemContent('');
      fetchMemories();
    } catch {
      setMemStatus('Failed to save.');
    }
    setMemSaving(false);
    setTimeout(() => setMemStatus(''), 3000);
  };

  const saveCommand = async (e) => {
    e.preventDefault();
    if (!cmdTrigger.trim() || !cmdResponse.trim()) return;
    setCmdSaving(true);
    setCmdStatus('');
    try {
      await axios.post(`${API}/memory`, {
        content: `COMMAND: "${cmdTrigger.trim()}" => ${cmdResponse.trim()}`,
        category: 'commands',
      }, { headers: apiHeaders });
      setCmdStatus('Command saved.');
      setCmdTrigger('');
      setCmdResponse('');
      fetchMemories();
    } catch {
      setCmdStatus('Failed to save.');
    }
    setCmdSaving(false);
    setTimeout(() => setCmdStatus(''), 3000);
  };

  const quickTrain = async (e) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    setQuickSaving(true);
    setQuickStatus('');
    try {
      await axios.post(`${API}/memory`, { content: quickText.trim(), category: 'general' }, { headers: apiHeaders });
      setQuickStatus('Saved.');
      setQuickText('');
      fetchMemories();
    } catch {
      setQuickStatus('Failed to save.');
    }
    setQuickSaving(false);
    setTimeout(() => setQuickStatus(''), 3000);
  };

  const deleteMemory = async (id) => {
    try {
      await axios.delete(`${API}/memory/${id}`, { headers: apiHeaders });
      fetchMemories();
    } catch {
      // silent
    }
  };

  return (
    <div className="training-page">
      <div className="training-page-title">JARVIS // TRAINING INTERFACE</div>

      {/* Quick Train */}
      <div className="training-section">
        <div className="training-section-title">QUICK TRAIN</div>
        <div className="training-section-desc">Type naturally. Example: "Remember that my business hours are 9-5 CST"</div>
        <form className="training-form" onSubmit={quickTrain}>
          <textarea
            className="training-textarea"
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            placeholder="Tell Jarvis something to remember..."
            rows={3}
          />
          <div className="training-form-row">
            <button type="submit" className="training-submit-btn" disabled={quickSaving}>
              {quickSaving ? 'SAVING...' : 'SAVE'}
            </button>
            {quickStatus && <span className="training-status">{quickStatus}</span>}
          </div>
        </form>
      </div>

      {/* Teach a Memory */}
      <div className="training-section">
        <div className="training-section-title">TEACH A MEMORY</div>
        <form className="training-form" onSubmit={saveMemory}>
          <textarea
            className="training-textarea"
            value={memContent}
            onChange={e => setMemContent(e.target.value)}
            placeholder="What should Jarvis remember?"
            rows={3}
          />
          <select
            className="training-select"
            value={memCategory}
            onChange={e => setMemCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
          <div className="training-form-row">
            <button type="submit" className="training-submit-btn" disabled={memSaving}>
              {memSaving ? 'SAVING...' : 'SAVE'}
            </button>
            {memStatus && <span className="training-status">{memStatus}</span>}
          </div>
        </form>
      </div>

      {/* Custom Commands */}
      <div className="training-section">
        <div className="training-section-title">CUSTOM COMMANDS</div>
        <div className="training-section-desc">Define trigger phrases and what Jarvis should do when you say them.</div>
        <form className="training-form" onSubmit={saveCommand}>
          <input
            className="training-input"
            value={cmdTrigger}
            onChange={e => setCmdTrigger(e.target.value)}
            placeholder='Trigger phrase (e.g. "status update")'
          />
          <textarea
            className="training-textarea"
            value={cmdResponse}
            onChange={e => setCmdResponse(e.target.value)}
            placeholder='Response template (e.g. "Check pipeline, then check emails, then brief me")'
            rows={2}
          />
          <div className="training-form-row">
            <button type="submit" className="training-submit-btn" disabled={cmdSaving}>
              {cmdSaving ? 'SAVING...' : 'SAVE'}
            </button>
            {cmdStatus && <span className="training-status">{cmdStatus}</span>}
          </div>
        </form>
      </div>

      {/* Knowledge Base */}
      <div className="training-section">
        <div className="training-section-title">KNOWLEDGE BASE</div>
        <div className="training-section-desc">All stored memories, grouped by category.</div>
        {kbLoading ? (
          <div className="training-loading">Loading memories...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="training-loading">No memories stored yet.</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="knowledge-category">
              <div className="knowledge-category-title">{cat.toUpperCase()} ({items.length})</div>
              {items.map((m, i) => (
                <div key={m.id || m._id || i} className="knowledge-card">
                  <div className="knowledge-card-content">{m.content || m.text || JSON.stringify(m)}</div>
                  <div className="knowledge-card-footer">
                    <span className="knowledge-card-date">
                      {m.created_at || m.createdAt ? new Date(m.created_at || m.createdAt).toLocaleDateString() : ''}
                    </span>
                    <button
                      className="knowledge-delete-btn"
                      onClick={() => deleteMemory(m.id || m._id)}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
