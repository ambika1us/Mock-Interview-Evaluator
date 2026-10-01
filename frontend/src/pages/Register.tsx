import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', headline: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark big">AI</span>
          <h1>Create candidate account</h1>
          <p>Get instant structured feedback on your interview performance.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            Full name
            <input value={form.name} onChange={update('name')} placeholder="Jane Doe" required minLength={2} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
          </label>
          <label>
            Headline (optional)
            <input value={form.headline} onChange={update('headline')} placeholder="Frontend Engineer, 2 yrs" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn btn-primary block" disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
