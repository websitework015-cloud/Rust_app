import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import '../styles/global.css';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface LoginPageProps {
  onLogin: (user: UserProfile) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const user = await invoke<UserProfile>('login', {
        email: form.email,
        password: form.password,
      });
      onLogin(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.orb} />
      <div style={styles.card}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>

        <div style={styles.iconWrap}>
          <span style={{ fontSize: 28 }}>🔐</span>
        </div>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.sub}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          {error && <div className="error-msg">{error}</div>}

          <div className="input-group">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <span style={styles.link} onClick={() => navigate('/register')}>
            Create one
          </span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0f', position: 'relative', overflow: 'hidden',
  },
  orb: {
    position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  card: {
    width: 420,
    background: '#16161f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: '36px 40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 1,
  },
  backBtn: {
    background: 'none', border: 'none', color: '#8888aa',
    cursor: 'pointer', fontSize: 14, padding: 0,
    marginBottom: 24, fontFamily: 'Inter, sans-serif',
  },
  iconWrap: {
    width: 56, height: 56,
    background: 'rgba(108,99,255,0.12)',
    border: '1px solid rgba(108,99,255,0.25)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 26, fontWeight: 700,
    color: '#f0f0ff', marginBottom: 6,
  },
  sub: { color: '#8888aa', fontSize: 14 },
  switchText: { textAlign: 'center' as const, marginTop: 24, color: '#8888aa', fontSize: 14 },
  link: { color: '#6c63ff', cursor: 'pointer', fontWeight: 500 },
};