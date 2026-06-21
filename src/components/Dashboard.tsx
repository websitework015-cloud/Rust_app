import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import UpdateBanner from './UpdateBanner';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import FileManager from './FileManager';
import CreditShop from './CreditShop';
import AnalyzedFiles from './AnalyzedFiles';
import CdrAnalyzer from './CdrAnalyzer';
import { UserProfile } from '../App';
import { CdrAnalysisResult } from '../types/cdr';
import '../styles/global.css';

type SidebarTab = 'dashboard' | 'analyzed' | 'credits';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

interface AnalyzeTarget {
  id: number;
  original_name: string;
  file_type: string;
}

interface ViewTarget {
  id: number;
  file_name: string;
  result: CdrAnalysisResult;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const { } = useTheme();
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [credits, setCredits] = useState<number>(user.credits ?? 0);
  const [analyzeTarget, setAnalyzeTarget] = useState<AnalyzeTarget | null>(null);
  const [viewTarget, setViewTarget] = useState<ViewTarget | null>(null);
  const [analysisWasDone, setAnalysisWasDone] = useState(false);
  const [fileManagerKey, setFileManagerKey] = useState(0);

  const refreshCredits = async () => {
    try {
      const c = await invoke<number>('get_credits', { userId: user.id });
      setCredits(c);
    } catch {}
  };

  useEffect(() => { refreshCredits(); }, []);

  const handleLogout = () => { onLogout(); navigate('/'); };

  const handleAnalyzerClose = async () => {
    if (analysisWasDone && analyzeTarget) {
      try { await invoke('delete_file', { fileId: analyzeTarget.id }); } catch {}
      setFileManagerKey(k => k + 1);
    }
    setAnalyzeTarget(null);
    setViewTarget(null);
    setAnalysisWasDone(false);
  };

  const navItems: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '⚡', label: 'Dashboard' },
    { id: 'analyzed',  icon: '📁', label: 'Analyzed Files' },
    { id: 'credits',   icon: '💎', label: 'Buy Credits' },
  ];

  const headings: Record<SidebarTab, { title: React.ReactNode; sub: string }> = {
    dashboard: {
      title: <>Good to see you, <span style={s.nameGradient}>{user.name?.split(' ')[0]}</span> 👋</>,
      sub: 'Upload a CDR file and analyze it. Each analysis costs 1 credit.',
    },
    analyzed: {
      title: 'Analyzed Files',
      sub: 'View your previous CDR analyses. No credits needed to re-open.',
    },
    credits: {
      title: 'Buy Credits',
      sub: 'Purchase credits to unlock more CDR analyses.',
    },
  };

  const showingAnalyzer = analyzeTarget !== null || viewTarget !== null;

  return (
    <div style={{ ...s.page, background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
        <div style={s.logo}>
          <img src="/logo.png" alt="Logo" style={s.logoIcon} />
          <div>
            <div style={s.logoText}>CDR App</div>
            <div style={s.logoSub}>Intelligence Platform</div>
          </div>
        </div>

        <nav style={s.nav}>
          <div style={s.navLabel}>NAVIGATION</div>
          {navItems.map(item => (
            <div
              key={item.id}
              onClick={() => { setActiveTab(item.id); setAnalyzeTarget(null); setViewTarget(null); }}
              style={{ ...s.navItem, ...(activeTab === item.id && !showingAnalyzer ? s.navItemActive : {}) }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.id && !showingAnalyzer && <span style={s.navActiveDot} />}
            </div>
          ))}
        </nav>

        <div style={s.creditChip}>
          <div style={s.creditLeft}>
            <span style={s.creditGem}>💎</span>
            <div>
              <div style={s.creditNum}>{credits}</div>
              <div style={s.creditLbl}>credits remaining</div>
            </div>
          </div>
          <div style={s.creditAddBtn} onClick={() => setActiveTab('credits')} title="Buy more credits">+</div>
        </div>

        <div style={{ ...s.sidebarFooter, borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={s.userChip}>
            <div style={s.avatar}>{user.name?.[0]?.toUpperCase() || 'U'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={s.userName}>{user.name}</div>
              <div style={s.userEmail} title={user.email}>{user.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>↩ Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <UpdateBanner />

        {/* Full-page CdrAnalyzer — replaces all content when active */}
        {showingAnalyzer ? (
          <div style={s.analyzerWrap}>
            <CdrAnalyzer
              fullPage
              file={
                analyzeTarget
                  ? { id: analyzeTarget.id, original_name: analyzeTarget.original_name, file_type: analyzeTarget.file_type }
                  : { id: viewTarget!.id, original_name: viewTarget!.file_name, file_type: '' }
              }
              userId={user.id}
              preloadedResult={viewTarget?.result}
              onClose={handleAnalyzerClose}
              onCreditUsed={refreshCredits}
              onFileAnalyzed={() => setAnalysisWasDone(true)}
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={s.header}>
              <div>
                <h1 style={{ ...s.greeting, color: 'var(--text-primary)' }}>
                  {headings[activeTab].title}
                </h1>
                <p style={{ ...s.headerSub, color: 'var(--text-secondary)' }}>
                  {headings[activeTab].sub}
                </p>
              </div>
              <div style={s.headerRight}>
                <ThemeToggle />
                <div style={s.headerBadge}>
                  <span style={s.liveGlow} />
                  <span style={{ color: 'var(--accent-secondary)' }}>💎</span>
                  <span>{credits} credits</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={s.contentArea}>
              {activeTab === 'dashboard' && (
                <FileManager
                  key={fileManagerKey}
                  userId={user.id}
                  onAnalyze={(file) => setAnalyzeTarget(file)}
                />
              )}
              {activeTab === 'analyzed' && (
                <AnalyzedFiles
                  userId={user.id}
                  onView={(id, file_name, result) => setViewTarget({ id, file_name, result })}
                />
              )}
              {activeTab === 'credits' && (
                <CreditShop userId={user.id} onPurchase={refreshCredits} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh' },

  sidebar: {
    width: 252,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 14px',
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 28 },
  logoIcon: {
    width: 36, height: 36,
    borderRadius: 9, flexShrink: 0,
    objectFit: 'cover' as const,
    boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
    animation: 'logo-glow 3s ease-in-out infinite',
  },
  logoText: {
    fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 16,
    color: 'var(--text-primary)', letterSpacing: '-0.01em',
  },
  logoSub: { fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: 1 },

  navLabel: {
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.1em', padding: '0 10px', marginBottom: 8,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
    borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)',
    fontSize: 14, fontWeight: 500, transition: 'all 0.15s ease', position: 'relative',
  },
  navItemActive: {
    background: 'var(--nav-active-bg)', color: 'var(--accent-secondary)',
    border: '1px solid var(--nav-active-border)', fontWeight: 600,
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' as const, flexShrink: 0 },
  navActiveDot: {
    width: 6, height: 6, background: 'var(--accent-primary)',
    borderRadius: '50%', marginLeft: 'auto', flexShrink: 0, boxShadow: '0 0 8px var(--accent-primary)',
  },

  creditChip: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12,
    marginBottom: 14, animation: 'credit-pulse 4s ease-in-out infinite',
  },
  creditLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  creditGem: { fontSize: 20 },
  creditNum: {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 800,
    color: 'var(--accent-secondary)', lineHeight: 1,
  },
  creditLbl: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.04em' },
  creditAddBtn: {
    width: 26, height: 26, background: 'rgba(139,92,246,0.2)',
    border: '1px solid rgba(139,92,246,0.35)', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--accent-secondary)', fontSize: 18, cursor: 'pointer', fontWeight: 600, flexShrink: 0,
  },

  sidebarFooter: { paddingTop: 14 },
  userChip: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0,
    boxShadow: '0 4px 12px rgba(139,92,246,0.35)',
  },
  userName: {
    fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: 11, color: 'var(--text-muted)', marginTop: 1,
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  logoutBtn: {
    width: '100%', padding: '9px',
    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
    borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', letterSpacing: '0.01em',
  },

  main: { flex: 1, padding: '32px 40px', overflow: 'auto', display: 'flex', flexDirection: 'column' },

  /* Full-page analyzer wrapper */
  analyzerWrap: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  greeting: {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 800,
    letterSpacing: '-0.02em', marginBottom: 6,
  },
  nameGradient: {
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', backgroundSize: '200% 200%',
    animation: 'gradient-shift 4s ease infinite',
  },
  headerSub: { fontSize: 14 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  headerBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100,
    fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
  },
  liveGlow: {
    width: 7, height: 7, borderRadius: '50%', background: '#10b981',
    display: 'inline-block', boxShadow: '0 0 8px #10b981',
    animation: 'dot-pulse 2s ease-in-out infinite',
  },

  contentArea: { flex: 1 },
};
