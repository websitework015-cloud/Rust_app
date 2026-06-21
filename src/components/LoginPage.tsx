import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { UserProfile } from '../App';
import '../styles/global.css';

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
    <div style={s.page}>
      {/* Animated orbs */}
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)', width: 600, height: 600, top: '-10%', left: '-5%', animation: 'float 10s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', width: 480, height: 480, bottom: '-5%', right: '-5%', animation: 'float2 14s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', width: 300, height: 300, top: '55%', right: '15%', animation: 'float3 8s ease-in-out infinite' }} />

      {/* Grid pattern */}
      <div style={s.grid} />

      <div style={s.card}>
        <button onClick={() => navigate('/')} style={s.backBtn}>← Back</button>

        <div style={s.iconWrap}>
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
        </div>
        <h2 style={s.title}>Welcome back</h2>
        <p style={s.sub}>Sign in to continue to your account</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
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

          <div style={{ marginTop: 10 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </div>
        </form>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        <p style={s.switchText}>
          Don't have an account?{' '}
          <span style={s.link} onClick={() => navigate('/register')}>
            Create one free
          </span>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#06060f',
    position: 'relative',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '36px 36px',
    zIndex: 0,
    pointerEvents: 'none',
    maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 100%)',
  },
  card: {
    width: 430,
    background: 'rgba(12, 12, 28, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 20,
    padding: '40px 44px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    position: 'relative',
    zIndex: 1,
    animation: 'card-appear 0.4s ease forwards',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
    marginBottom: 28,
    fontFamily: 'Inter, sans-serif',
  },
  iconWrap: {
    width: 72,
    height: 72,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    boxShadow: '0 0 32px rgba(6,182,212,0.2)',
    overflow: 'hidden' as const,
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 26,
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  sub: { color: '#475569', fontSize: 14 },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    display: 'block',
  },
  dividerText: {
    fontSize: 12,
    color: '#475569',
  },
  switchText: { textAlign: 'center' as const, marginTop: 16, color: '#475569', fontSize: 14 },
  link: {
    color: '#a78bfa',
    cursor: 'pointer',
    fontWeight: 600,
  },
};
