import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { api } from '../../api/client';
import type { Category, Question } from '../../api/types';

const TYPES = ['theory', 'programming'];
const DIFFS = ['Easy', 'Medium', 'Hard'];
const LEVELS = ['Fresher', 'Mid-Level', 'Senior'];

const emptyForm = {
  id: undefined as string | undefined,
  category: '',
  text: '',
  type: 'theory',
  difficulty: 'Easy',
  level: 'Fresher',
  language: '',
  expectedAnswer: '',
  keywords: '',
};

export default function Questions() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState({ category: '', type: '', difficulty: '', level: '', q: '' });
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminCategories().then(({ categories: c }) => {
      setCategories(c);
      if (!form.category && c.length) setForm((f) => ({ ...f, category: c[0]._id }));
    });
  }, []);

  const load = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;
    api.adminQuestions(params).then(({ questions: q }) => setQuestions(q)).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [filters]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c.name]));
    return (q: Question) => (typeof q.category === 'string' ? map.get(q.category) : (q.category as Category)?.name) || '—';
  }, [categories]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      category: form.category,
      text: form.text,
      type: form.type,
      difficulty: form.difficulty,
      level: form.level,
      language: form.language,
      expectedAnswer: form.expectedAnswer,
      keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
    };
    try {
      if (form.id) await api.updateQuestion(form.id, payload);
      else await api.createQuestion(payload);
      setForm({ ...emptyForm, category: form.category });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (q: Question) => {
    setForm({
      id: q._id,
      category: typeof q.category === 'string' ? q.category : q.category._id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      level: q.level,
      language: q.language || '',
      expectedAnswer: q.expectedAnswer || '',
      keywords: (q.keywords || []).join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const archive = async (q: Question) => {
    if (!window.confirm('Archive this question?')) return;
    await api.archiveQuestion(q._id);
    load();
  };

  return (
    <div className="stack-lg">
      <h1>Question bank</h1>
      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        <h2>{form.id ? 'Edit question' : 'Add question'}</h2>
        <form className="question-form" onSubmit={save}>
          <div className="form-row">
            <label>
              Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              Difficulty
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label>
              Level
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label>
              Language (for code)
              <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="JavaScript / Python / SQL" />
            </label>
          </div>

          <label>
            Question text
            <textarea rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required minLength={5} />
          </label>
          <label>
            Reference / expected answer
            <textarea rows={3} value={form.expectedAnswer} onChange={(e) => setForm({ ...form, expectedAnswer: e.target.value })} />
          </label>
          <label>
            Expected keywords (comma separated)
            <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="hash map, O(n), return" />
          </label>

          <div className="row">
            <button className="btn btn-primary" disabled={busy}>{form.id ? 'Update question' : 'Add question'}</button>
            {form.id && (
              <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...emptyForm, category: form.category })}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head-row">
          <h2>Questions ({questions.length})</h2>
          <div className="filters">
            <input placeholder="Search text..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
              <option value="">All difficulty</option>
              {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Level</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q._id} className={q.active ? '' : 'row-muted'}>
                  <td className="q-cell">
                    {q.text}
                    {q.keywords?.length ? <div className="muted small">Keywords: {q.keywords.join(', ')}</div> : null}
                  </td>
                  <td>{categoryName(q)}</td>
                  <td><span className="chip neutral">{q.type}</span></td>
                  <td><span className={`chip diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span></td>
                  <td>{q.level}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost sm" onClick={() => edit(q)}>Edit</button>
                    {q.active && <button className="btn btn-ghost sm danger" onClick={() => archive(q)}>Archive</button>}
                  </td>
                </tr>
              ))}
              {!questions.length && (
                <tr><td colSpan={6} className="muted center">No questions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
