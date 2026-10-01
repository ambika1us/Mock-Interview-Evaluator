import { useEffect, useState } from 'react';
import type React from 'react';
import { api } from '../../api/client';
import type { Category } from '../../api/types';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<{ id?: string; name: string; description: string }>({
    name: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.adminCategories().then(({ categories: c }) => setCategories(c)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (form.id) await api.updateCategory(form.id, { name: form.name, description: form.description });
      else await api.createCategory({ name: form.name, description: form.description });
      setForm({ name: '', description: '' });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = async (c: Category) => {
    if (!window.confirm(`Archive "${c.name}"? It will no longer be selectable by candidates.`)) return;
    await api.archiveCategory(c._id);
    load();
  };

  return (
    <div className="stack-lg">
      <h1>Categories</h1>
      {error && <div className="alert error">{error}</div>}

      <div className="two-col">
        <div className="panel">
          <h2>{form.id ? 'Edit category' : 'Create category'}</h2>
          <form className="stack" onSubmit={save}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Machine Learning Engineer"
                required
                minLength={2}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description shown to candidates"
              />
            </label>
            <div className="row">
              <button className="btn btn-primary" disabled={busy}>
                {form.id ? 'Update' : 'Create'}
              </button>
              {form.id && (
                <button type="button" className="btn btn-ghost" onClick={() => setForm({ name: '', description: '' })}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="panel">
          <h2>Existing categories</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id} className={c.active ? '' : 'row-muted'}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="muted small">{c.description}</div>
                    </td>
                    <td>{c.questionCount ?? 0}</td>
                    <td>
                      <span className={`badge ${c.active ? 'ok' : 'neutral'}`}>{c.active ? 'Active' : 'Archived'}</span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-ghost sm"
                        onClick={() => setForm({ id: c._id, name: c.name, description: c.description || '' })}
                      >
                        Edit
                      </button>
                      {c.active && (
                        <button className="btn btn-ghost sm danger" onClick={() => archive(c)}>
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
