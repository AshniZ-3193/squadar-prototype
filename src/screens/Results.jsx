import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import PinGate from '../components/PinGate.jsx';

export default function Results() {
  return <PinGate title="Feedback results">{(pin) => <Table pin={pin} />}</PinGate>;
}

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function Table({ pin }) {
  const [rows, setRows] = useState(null);
  const load = () => supabase.rpc('get_feedback', { pin }).then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []);
  if (!rows) return <main className="screen center"><div className="spinner" /></main>;

  const cols = rows.length ? Object.keys(rows[0]).filter((c) => c !== 'id') : [];
  const avg = (k) => {
    const v = rows.map((r) => r[k]).filter((x) => typeof x === 'number');
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—';
  };
  const download = () => {
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `squadar-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <main className="screen wide">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 className="h-display h1 grow">Feedback · {rows.length}</h1>
        <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={load}>Refresh</button>
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={download} disabled={!rows.length}>Download CSV</button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="tag">Would use (avg of 5): {avg('q2_would_use_1to5')}</span>
        <span className="tag">Like own limit (avg of 5): {avg('q10_like_own_limit_1to5')}</span>
        <span className="tag">“More useful” than current: {rows.filter((r) => r.q3_vs_current === 'More useful').length}</span>
      </div>
      {rows.length === 0 ? <p className="muted">No responses yet.</p> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}>{cols.map((c) => <td key={c} title={r[c] ?? ''}>{r[c] == null ? '' : String(r[c])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
