import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { AdminReportRow, Category } from '../../api/types';

const recClass = (r?: string) => (r === 'Hire' ? 'ok' : r === 'Improve' ? 'warn' : 'bad');

export default function Reports() {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({ category: '', recommendation: '', level: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminCategories().then(({ categories: c }) => setCategories(c)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;
    api.adminReports(params).then(({ reports: r }) => setReports(r)).catch((e) => setError(e.message));
  }, [filters]);

  return (
    <div className="stack-lg">
      <h1>Candidate reports</h1>
      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        <div className="panel-head-row">
          <h2>{reports.length} evaluation(s)</h2>
          <div className="filters">
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
              <option value="">All levels</option>
              {['Fresher', 'Mid-Level', 'Senior'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={filters.recommendation} onChange={(e) => setFilters({ ...filters, recommendation: e.target.value })}>
              <option value="">All recommendations</option>
              {['Hire', 'Improve', 'Reject'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Category</th>
                <th>Level</th>
                <th>Correctness</th>
                <th>Confidence</th>
                <th>Behavior</th>
                <th>Overall</th>
                <th>Recommendation</th>
                <th>Completed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.sessionId}>
                  <td>
                    <strong>{r.candidate?.name || 'Unknown'}</strong>
                    <div className="muted small">{r.candidate?.email}</div>
                  </td>
                  <td>{r.categoryName}</td>
                  <td>{r.level}</td>
                  <td>{r.report?.correctnessScore}</td>
                  <td>{r.report?.confidenceScore}</td>
                  <td>{r.report?.behaviorScore}</td>
                  <td><strong>{r.report?.overallRating}</strong> ({r.report?.grade})</td>
                  <td><span className={`badge ${recClass(r.report?.recommendation)}`}>{r.report?.recommendation}</span></td>
                  <td className="muted small">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link className="btn btn-ghost sm" to={`/admin/reports/${r.sessionId}`}>View</Link>
                  </td>
                </tr>
              ))}
              {!reports.length && (
                <tr><td colSpan={10} className="muted center">No reports match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
