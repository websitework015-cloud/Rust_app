import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={s.container}>
      {/* Animated background orbs */}
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)', top: '-10%', left: '-8%', width: 700, height: 700, animation: 'float 10s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)', top: '30%', right: '-5%', width: 550, height: 550, animation: 'float2 13s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', bottom: '-10%', left: '25%', width: 500, height: 500, animation: 'float3 9s ease-in-out infinite' }} />
      <div style={{ ...s.orb, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', top: '60%', left: '5%', width: 300, height: 300, animation: 'float 12s ease-in-out infinite 3s' }} />

      {/* Subtle grid */}
      <div style={s.grid} />

      <div style={s.inner}>
        {/* Left: Content */}
        <div style={s.content}>
          {/* Live badge */}
          <div style={s.badge}>
            <span style={s.badgeDot} />
            <span>CDR Intelligence Platform · v0.3</span>
          </div>

          {/* Headline */}
          <h1 style={s.headline}>
            Analyze. Discover.
            <br />
            <span style={s.gradientHeadline}>Act on your data.</span>
          </h1>

          <p style={s.subtitle}>
            Upload CDR files and unlock deep intelligence — call patterns,
            location stays, IMEI tracking — all offline and secure.
          </p>

          {/* CTA buttons */}
          <div style={s.actions}>
            <button style={s.btnPrimary} onClick={() => navigate('/register')}>
              Get Started Free
              <span style={{ marginLeft: 8 }}>→</span>
            </button>
            <button style={s.btnSecondary} onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>

          {/* Stats row */}
          <div style={s.stats}>
            {[
              { value: '100%', label: 'Offline & Private' },
              { value: '<1s', label: 'Analysis Speed' },
              { value: 'CSV/XLSX', label: 'File Support' },
            ].map(stat => (
              <div key={stat.label} style={s.stat}>
                <div style={s.statValue}>{stat.value}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: App preview mockup */}
        <div style={s.previewWrap}>
          <div style={s.appPreview}>
            {/* Window chrome */}
            <div style={s.windowBar}>
              <div style={{ ...s.dot, background: '#f87171' }} />
              <div style={{ ...s.dot, background: '#f59e0b' }} />
              <div style={{ ...s.dot, background: '#10b981' }} />
              <span style={s.windowTitle}>CDR App — Dashboard</span>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Sidebar mockup */}
              <div style={s.mockSidebar}>
                <div style={s.mockLogo}>
                  <img src="/logo.png" alt="Logo" style={{ ...s.mockLogoIcon, borderRadius: 6, objectFit: 'cover' as const }} />
                </div>
                {[
                  { icon: '🏠', label: 'Dashboard', active: true },
                  { icon: '📁', label: 'Files' },
                  { icon: '💎', label: 'Credits' },
                ].map(item => (
                  <div key={item.label} style={{
                    ...s.mockNavItem,
                    ...(item.active ? s.mockNavActive : {}),
                  }}>
                    <span style={{ fontSize: 12 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
                <div style={s.mockCreditChip}>
                  <span style={{ fontSize: 12 }}>💎</span>
                  <span>24 credits</span>
                </div>
              </div>

              {/* Content mockup */}
              <div style={s.mockContent}>
                <div style={s.mockGreeting}>Good morning, Taufiq 👋</div>
                {/* Stats cards row */}
                <div style={s.mockStatsRow}>
                  {['#8b5cf6', '#06b6d4', '#10b981'].map((color, i) => (
                    <div key={i} style={{ ...s.mockStatCard, borderTop: `2px solid ${color}` }}>
                      <div style={{ ...s.mockStatNum, color }} />
                      <div style={s.mockStatBar} />
                    </div>
                  ))}
                </div>
                {/* File card */}
                <div style={s.mockFileCard}>
                  <div style={s.mockFileIcon}>📊</div>
                  <div style={s.mockFileLines}>
                    <div style={s.mockLine} />
                    <div style={{ ...s.mockLine, width: '60%', marginTop: 4 }} />
                  </div>
                  <div style={s.mockAnalyzeBtn}>Analyze</div>
                </div>
                <div style={{ ...s.mockFileCard, marginTop: 6 }}>
                  <div style={{ ...s.mockFileIcon, background: 'rgba(6,182,212,0.12)' }}>📗</div>
                  <div style={s.mockFileLines}>
                    <div style={s.mockLine} />
                    <div style={{ ...s.mockLine, width: '50%', marginTop: 4 }} />
                  </div>
                  <div style={{ ...s.mockAnalyzeBtn, background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>Analyze</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating glow behind the card */}
          <div style={s.previewGlow} />
        </div>
      </div>

      {/* Bottom features */}
      <div style={s.features}>
        {[
          { icon: '🔒', title: 'End-to-End Secure', desc: 'Files never leave your device' },
          { icon: '⚡', title: 'Rust-Powered Speed', desc: 'Native performance, zero lag' },
          { icon: '📊', title: 'Deep CDR Analytics', desc: 'IMEI, IMSI, call patterns' },
          { icon: '🌐', title: 'Cloud-Synced Auth', desc: 'Secure login via MySQL' },
        ].map(f => (
          <div key={f.title} style={s.featureCard}>
            <div style={s.featureIcon}>{f.icon}</div>
            <div style={s.featureTitle}>{f.title}</div>
            <div style={s.featureDesc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#06060f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 48px 60px',
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
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 50%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 50%, transparent 100%)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: 72,
    maxWidth: 1200,
    width: '100%',
    paddingTop: 80,
    paddingBottom: 60,
    zIndex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    maxWidth: 520,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 600,
    color: '#a78bfa',
    marginBottom: 28,
    letterSpacing: '0.02em',
  },
  badgeDot: {
    width: 7, height: 7,
    borderRadius: '50%',
    background: '#10b981',
    display: 'inline-block',
    animation: 'dot-pulse 2s ease-in-out infinite',
  },
  headline: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 56,
    fontWeight: 800,
    lineHeight: 1.1,
    color: '#f1f5f9',
    marginBottom: 22,
    letterSpacing: '-0.03em',
  },
  gradientHeadline: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 40%, #06b6d4 100%)',
    backgroundSize: '200% 200%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'gradient-shift 4s ease infinite',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 17,
    lineHeight: 1.75,
    marginBottom: 36,
  },
  actions: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  btnPrimary: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.01em',
  },
  btnSecondary: {
    padding: '13px 28px',
    background: 'rgba(139,92,246,0.06)',
    color: '#a78bfa',
    border: '1.5px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  stats: {
    display: 'flex',
    gap: 32,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statValue: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 22,
    fontWeight: 800,
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    letterSpacing: '0.03em',
  },

  /* App preview */
  previewWrap: {
    flex: 1,
    maxWidth: 520,
    position: 'relative',
    zIndex: 1,
    flexShrink: 0,
  },
  previewGlow: {
    position: 'absolute',
    inset: -40,
    background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 70%)',
    borderRadius: '50%',
    zIndex: -1,
    pointerEvents: 'none',
  },
  appPreview: {
    background: 'rgba(10,10,22,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(20px)',
  },
  windowBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  windowTitle: {
    fontSize: 11,
    color: '#475569',
    marginLeft: 8,
    letterSpacing: '0.03em',
  },
  mockSidebar: {
    width: 140,
    background: 'rgba(6,6,15,0.9)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
  },
  mockLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    marginBottom: 12,
  },
  mockLogoIcon: {
    width: 26, height: 26,
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
  },
  mockNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 8px',
    borderRadius: 6,
    fontSize: 11,
    color: '#475569',
  },
  mockNavActive: {
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.25)',
  },
  mockCreditChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 8px',
    marginTop: 'auto',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 8,
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: 600,
  },
  mockContent: {
    flex: 1,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflow: 'hidden',
  },
  mockGreeting: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: 4,
  },
  mockStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  mockStatCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '8px 10px',
  },
  mockStatNum: {
    height: 8,
    width: '60%',
    borderRadius: 4,
    background: 'currentColor',
    opacity: 0.7,
    marginBottom: 6,
  },
  mockStatBar: {
    height: 5,
    width: '80%',
    borderRadius: 3,
    background: 'rgba(255,255,255,0.08)',
  },
  mockFileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '8px 10px',
  },
  mockFileIcon: {
    width: 28, height: 28,
    background: 'rgba(139,92,246,0.12)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    flexShrink: 0,
  },
  mockFileLines: {
    flex: 1,
    minWidth: 0,
  },
  mockLine: {
    height: 7,
    width: '80%',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  mockAnalyzeBtn: {
    padding: '4px 10px',
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 5,
    fontSize: 10,
    fontWeight: 700,
    color: '#a78bfa',
    flexShrink: 0,
  },

  /* Features strip */
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 1,
    maxWidth: 1200,
    width: '100%',
    zIndex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.03)',
  },
  featureCard: {
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderRight: '1px solid rgba(255,255,255,0.07)',
    transition: 'background 0.2s',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  featureTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  featureDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.5,
  },
};
