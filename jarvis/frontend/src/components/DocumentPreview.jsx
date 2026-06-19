import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';

const API = import.meta.env.VITE_API_URL || 'https://ben-production-1559.up.railway.app/api/agents';
const API_TOKEN = import.meta.env.VITE_JARVIS_TOKEN || '';
const apiHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

function downloadCSV(title, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title, sections) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`JARVIS // ${title.toUpperCase()}`, 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 14, y);
  y += 12;
  doc.setTextColor(0);

  sections.forEach(section => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (section.heading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(section.heading.toUpperCase(), 14, y);
      y += 7;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (section.lines) {
      section.lines.forEach(line => {
        if (y > 275) { doc.addPage(); y = 20; }
        const split = doc.splitTextToSize(line, 180);
        doc.text(split, 14, y);
        y += split.length * 5;
      });
      y += 4;
    }
    if (section.table) {
      const { headers, rows } = section.table;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const colW = 180 / headers.length;
      headers.forEach((h, i) => doc.text(h, 14 + i * colW, y));
      y += 5;
      doc.setFont('helvetica', 'normal');
      rows.forEach(row => {
        if (y > 275) { doc.addPage(); y = 20; }
        row.forEach((cell, i) => {
          const txt = doc.splitTextToSize(String(cell), colW - 4);
          doc.text(txt, 14 + i * colW, y);
        });
        y += 6;
      });
      y += 4;
    }
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

function parseDocumentData(data) {
  const sections = [];
  if (!data) return sections;

  if (typeof data === 'string') {
    sections.push({ lines: data.split('\n') });
    return sections;
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object') {
      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(h => item[h] || ''));
      sections.push({ table: { headers, rows } });
    } else {
      sections.push({ lines: data.map(String) });
    }
    return sections;
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === 'tip' || key === 'type' || key === 'title' || key === 'week' || key === 'n8nWorkflow') continue;
    if (typeof value === 'string') {
      sections.push({ heading: key, lines: [value] });
    } else if (Array.isArray(value)) {
      sections.push({ heading: key, lines: value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)) });
    } else if (typeof value === 'object' && value !== null) {
      const lines = [];
      for (const [k, v] of Object.entries(value)) {
        if (Array.isArray(v)) {
          lines.push(`${k}:`);
          v.forEach(item => lines.push(`  - ${typeof item === 'object' ? JSON.stringify(item) : item}`));
        } else {
          lines.push(`${k}: ${v}`);
        }
      }
      sections.push({ heading: key, lines });
    }
  }
  return sections;
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DocumentPreview({ document: doc, onClose }) {
  if (!doc) return null;

  const title = doc.title || doc.response || 'Document';
  const sections = parseDocumentData(doc.data);
  const n8nWorkflow = doc.data?.n8nWorkflow;

  const handlePDF = () => downloadPDF(title, sections);
  const handleN8nExport = () => downloadJSON(`${title.replace(/\s+/g, '_').toLowerCase()}.n8n.json`, n8nWorkflow);

  const handleCSV = () => {
    const allRows = [];
    sections.forEach(s => {
      if (s.table) {
        allRows.push(s.table.headers);
        allRows.push(...s.table.rows);
      } else if (s.lines) {
        if (s.heading) allRows.push([s.heading]);
        s.lines.forEach(l => allRows.push([l]));
      }
    });
    if (allRows.length) downloadCSV(title, allRows);
  };

  return (
    <div className="doc-preview-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="doc-preview">
        <div className="doc-preview-header">
          <div>
            <div className="doc-preview-title">{title}</div>
            <div className="doc-preview-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>CLOSE</button>
        </div>

        <div className="doc-preview-body">
          {sections.length === 0 && (
            <div className="modal-empty">No document data to display</div>
          )}
          {sections.map((section, i) => (
            <div key={i} className="doc-section">
              {section.heading && (
                <div className="doc-section-title">{section.heading.toUpperCase()}</div>
              )}
              {section.lines && (
                <div className="doc-section-lines">
                  {section.lines.map((line, j) => (
                    <div key={j} className="doc-line">{line}</div>
                  ))}
                </div>
              )}
              {section.table && (
                <div className="doc-table-wrap">
                  <table className="doc-table">
                    <thead>
                      <tr>{section.table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, j) => (
                        <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="doc-preview-actions">
          <button className="modal-pdf-btn" onClick={handlePDF}>DOWNLOAD PDF</button>
          <button className="doc-csv-btn" onClick={handleCSV}>DOWNLOAD CSV</button>
          {n8nWorkflow && (
            <button className="doc-csv-btn" onClick={handleN8nExport}>EXPORT N8N JSON</button>
          )}
        </div>
      </div>
    </div>
  );
}
