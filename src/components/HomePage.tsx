import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      <div style={styles.content}>
        {/* Badge */}
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          Secure Desktop Authentication
        </div>

        {/* Headline */}
        <h1 style={styles.headline}>
          Your workspace,<br />
          <span style={styles.gradientText}>beautifully secured.</span>
        </h1>

        <p style={styles.subtitle}>
          A lightning-fast, offline-first desktop app with local SQLite auth.<br />
          No cloud. No tracking. Just you and your data.
        </p>

        {/* CTA Buttons */}
        <div style={styles.actions}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '14px 40px', fontSize: '16px' }}
            onClick={() => navigate('/register')}
          >
            Get Started →
          </button>
          <button
            className="btn-outline"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>

        {/* Feature pills */}
        <div style={styles.features}>
          {['🔒 Local SQLite', '⚡ Tauri v2', '🦀 Rust Backend', '🎨 React + TS'].map(f => (
            <span key={f} style={styles.pill}>{f}</span>
          ))}
        </div>
      </div>

      {/* Floating card preview */}
      <div style={styles.cardPreview}>
        <div style={styles.previewHeader}>
          <div style={{ ...styles.dot, background: '#ef4444' }} />
          <div style={{ ...styles.dot, background: '#f59e0b' }} />
          <div style={{ ...styles.dot, background: '#10b981' }} />
        </div>
        <div style={styles.previewContent}>
          <div style={styles.previewLine} />
          <div style={{ ...styles.previewLine, width: '70%' }} />
          <div style={{ ...styles.previewLine, width: '85%', marginTop: 16 }} />
          <div style={{ ...styles.previewLine, width: '55%' }} />
          <div style={styles.previewBtn} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 80,
    padding: '40px 60px',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: '-20%', left: '-10%',
    width: 500, height: 500,
    background: 'radial-gradient(circle, rgba(108,99,255,0.2) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', bottom: '-20%', right: '-5%',
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  orb3: {
    position: 'absolute', top: '50%', left: '40%',
    width: 300, height: 300,
    background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  content: { maxWidth: 520, zIndex: 1 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 16px',
    background: 'rgba(108,99,255,0.1)',
    border: '1px solid rgba(108,99,255,0.25)',
    borderRadius: 100,
    fontSize: 13, fontWeight: 500,
    color: '#a78bfa',
    marginBottom: 24,
    fontFamily: 'Inter, sans-serif',
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 6px #10b981',
    display: 'inline-block',
  },
  headline: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 52, fontWeight: 700,
    lineHeight: 1.15,
    color: '#f0f0ff',
    marginBottom: 20,
    letterSpacing: '-0.02em',
  },
  gradientText: {
    background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 50%, #c4b5fd 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    color: '#8888aa',
    fontSize: 16, lineHeight: 1.7,
    marginBottom: 36,
  },
  actions: {
    display: 'flex', gap: 16, alignItems: 'center',
    marginBottom: 36,
  },
  features: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 10,
  },
  pill: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 100,
    fontSize: 13, color: '#8888aa',
    fontFamily: 'Inter, sans-serif',
  },
  // Card preview
  cardPreview: {
    width: 280, background: '#16161f',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden', zIndex: 1,
    flexShrink: 0,
  },
  previewHeader: {
    display: 'flex', gap: 6, padding: '14px 16px',
    background: '#111118',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  dot: { width: 10, height: 10, borderRadius: '50%' },
  previewContent: { padding: 20 },
  previewLine: {
    height: 10, width: '90%',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 5, marginBottom: 10,
  },
  previewBtn: {
    height: 36, width: '100%',
    background: 'rgba(108,99,255,0.3)',
    borderRadius: 8, marginTop: 20,
  },
};