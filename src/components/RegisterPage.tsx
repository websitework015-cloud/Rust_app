import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import '../styles/global.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('All fields are required.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }

    setLoading(true);
    try {
      await invoke('register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div style={s.page}>
      {/* Animated orbs */}
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)', width: 650, height: 650, top: '-15%', right: '-8%', animation: 'float 11s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', width: 500, height: 500, bottom: '-10%', left: '-5%', animation: 'float2 13s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', width: 320, height: 320, top: '40%', left: '10%', animation: 'float3 9s ease-in-out infinite' }} />

      <div style={s.grid} />

      <div style={s.card}>
        <button onClick={() => navigate('/')} style={s.backBtn}>← Back</button>

        <div style={s.iconWrap}>
          <img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
        </div>
        <h2 style={s.title}>Create an account</h2>
        <p style={s.sub}>Fill in the details below to get started</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <div className="input-group">
            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={form.name} onChange={set('name')} />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={set('confirmPassword')} />
          </div>

          <div style={{ marginTop: 10 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </div>
        </form>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        <p style={s.switchText}>
          Already have an account?{' '}
          <span style={s.link} onClick={() => navigate('/login')}>Sign in</span>
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
    width: 450,
    background: 'rgba(12, 12, 28, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(167,139,250,0.2)',
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
  dividerText: { fontSize: 12, color: '#475569' },
  switchText: { textAlign: 'center' as const, marginTop: 16, color: '#475569', fontSize: 14 },
  link: {
    color: '#a78bfa',
    cursor: 'pointer',
    fontWeight: 600,
  },
};
