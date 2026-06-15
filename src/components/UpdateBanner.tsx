import { useUpdater } from '../hooks/useUpdater';

export default function UpdateBanner() {
  const { status, installUpdate } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  // silent fail on error or dismissed
  if (status.error || dismissed) return null;

  if (status.downloading) {
    return (
      <div style={styles.banner}>
        <div style={styles.left}>
          <span style={{ fontSize: 20 }}>⬇️</span>
          <div>
            <div style={styles.title}>Downloading update v{status.version}...</div>
            <div style={styles.sub}>Please don't close the app</div>
          </div>
        </div>
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressBar, width: `${status.progress}%` }} />
          </div>
          <span style={styles.pct}>{status.progress}%</span>
        </div>
      </div>
    );
  }

  if (status.available) {
    return (
      <div style={styles.banner}>
        <div style={styles.left}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <div>
            <div style={styles.title}>Update available — v{status.version}</div>
            <div style={styles.sub}>
              {status.body || 'A new version is ready to install'}
            </div>
          </div>
        </div>
        <div style={styles.actions}>
          <button onClick={installUpdate} style={styles.installBtn}>
            Install & Restart
          </button>
          <button onClick={() => setDismissed(true)} style={styles.dismissBtn}>
            Later
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// add missing useState import
import { useState } from 'react';

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(167,139,250,0.1))',
    border: '1px solid rgba(108,99,255,0.3)',
    borderRadius: 12,
    marginBottom: 24,
    gap: 16,
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 600, fontSize: 14, color: '#f0f0ff',
  },
  sub: { fontSize: 12, color: '#8888aa', marginTop: 2 },
  actions: { display: 'flex', gap: 10, flexShrink: 0 },
  installBtn: {
    padding: '8px 18px',
    background: '#6c63ff', border: 'none',
    borderRadius: 8, color: '#fff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  dismissBtn: {
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#8888aa',
    fontSize: 13, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  progressWrap: {
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  },
  progressTrack: {
    width: 160, height: 6,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  pct: { fontSize: 13, color: '#a78bfa', minWidth: 36 },
};