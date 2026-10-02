import { useState } from 'react';
import type React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      const dest = user.role === 'admin' ? '/admin' : location.state?.from || '/';
      navigate(dest, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark big">AI</span>
          <h1>Mock Interview Evaluator</h1>
          <p>Practice interviews with automatic correctness, confidence and behavior analysis.</p>
        </div>

        <form onSubmit={submit} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn btn-primary block" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="muted center">
          New candidate? <Link to="/register">Create an account</Link>
        </p>
        <div className="demo-hint">
          <strong>Demo admin:</strong> admin@example.com / xxxxxx
        </div>
      </div>
    </div>
  );
}
