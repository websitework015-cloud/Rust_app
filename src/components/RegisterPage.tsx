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
    <div style={styles.page}>
      <div style={styles.orb} />
      <div style={styles.card}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>

        <div style={styles.iconWrap}>
          <span style={{ fontSize: 28 }}>✨</span>
        </div>
        <h2 style={styles.title}>Create an account</h2>
        <p style={styles.sub}>Fill in the details to get started</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
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

          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <span style={styles.link} onClick={() => navigate('/login')}>Sign in</span>
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
    background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  card: {
    width: 440,
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
    background: 'rgba(167,139,250,0.1)',
    border: '1px solid rgba(167,139,250,0.25)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 26, fontWeight: 700, color: '#f0f0ff', marginBottom: 6,
  },
  sub: { color: '#8888aa', fontSize: 14 },
  switchText: { textAlign: 'center' as const, marginTop: 24, color: '#8888aa', fontSize: 14 },
  link: { color: '#6c63ff', cursor: 'pointer', fontWeight: 500 },
};