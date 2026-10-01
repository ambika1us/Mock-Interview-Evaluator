import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../api/client';
import type { Category, SessionSummary } from '../api/types';
import { useAuth } from '../context/AuthContext';

const LEVELS = ['Fresher', 'Mid-Level', 'Senior'] as const;
const LEVEL_DESC: Record<string, string> = {
  Fresher: '0-1 years, fundamentals focus',
  'Mid-Level': '2-5 years, applied depth',
  Senior: '5+ years, design & trade-offs',
};

export default function CandidateHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('Fresher');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.categories().then(({ categories: c }) => setCategories(c)).catch(() => {});
    api.mySessions().then(({ sessions: s }) => setSessions(s)).catch(() => {});
  }, []);

  const start = async () => {
    if (!categoryId) {
      setError('Choose a category to begin.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { session } = await api.startInterview({ categoryId, level });
      navigate(`/interview/${session.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not start the interview');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="container">
        <section className="hero">
          <div>
            <h1>Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
            <p className="muted">
              Pick a role and experience level. You will get 5 theory questions plus 1-2 coding questions,
              with automatic scoring of correctness, confidence and behavior.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>1. Choose a category</h2>
          <div className="category-grid">
            {categories.map((c) => (
              <button
                key={c._id}
                className={`category-card ${categoryId === c._id ? 'selected' : ''}`}
                onClick={() => setCategoryId(c._id)}
              >
                <span className="category-name">{c.name}</span>
                <span className="category-desc">{c.description}</span>
              </button>
            ))}
            {!categories.length && <p className="muted">No categories available yet.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>2. Experience level</h2>
          <div className="level-row">
            {LEVELS.map((l) => (
              <button
                key={l}
                className={`level-card ${level === l ? 'selected' : ''}`}
                onClick={() => setLevel(l)}
              >
                <span className="level-name">{l}</span>
                <span className="level-desc">{LEVEL_DESC[l]}</span>
              </button>
            ))}
          </div>
          {error && <div className="alert error">{error}</div>}
          <button className="btn btn-primary" onClick={start} disabled={busy}>
            {busy ? 'Preparing interview...' : 'Start interview'}
          </button>
        </section>

        <section className="panel">
          <h2>Your interview history</h2>
          {sessions.length === 0 ? (
            <p className="muted">No interviews yet. Start your first one above.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Overall</th>
                    <th>Recommendation</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id}>
                      <td>{s.categoryName}</td>
                      <td>{s.level}</td>
                      <td>
                        <span className={`badge ${s.status === 'completed' ? 'ok' : 'warn'}`}>
                          {s.status === 'completed' ? 'Completed' : 'In progress'}
                        </span>
                      </td>
                      <td>{s.report?.overallRating ?? '--'}</td>
                      <td>{s.report?.recommendation ?? '--'}</td>
                      <td>
                        <Link
                          className="btn btn-ghost sm"
                          to={s.status === 'completed' ? `/report/${s._id}` : `/interview/${s._id}`}
                        >
                          {s.status === 'completed' ? 'View report' : 'Resume'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
