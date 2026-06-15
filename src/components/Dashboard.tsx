import { useNavigate } from 'react-router-dom';
import UpdateBanner from './UpdateBanner';
import '../styles/global.css';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface DashboardProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const stats = [
    { label: 'Days Active', value: '1', icon: '📅' },
    { label: 'Sessions', value: '1', icon: '🔑' },
    { label: 'Security Score', value: '98%', icon: '🛡️' },
    { label: 'Storage Used', value: '2KB', icon: '💾' },
  ];

  const activities = [
    { action: 'Logged in successfully', time: 'Just now', icon: '✅' },
    { action: 'Account created', time: 'Today', icon: '🎉' },
    { action: 'Password encrypted with bcrypt', time: 'Today', icon: '🔒' },
  ];

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>AuthApp</span>
        </div>

        <nav style={styles.nav}>
          {[
            { icon: '🏠', label: 'Dashboard', active: true },
            { icon: '👤', label: 'Profile', active: false },
            { icon: '🔒', label: 'Security', active: false },
            { icon: '⚙️', label: 'Settings', active: false },
          ].map(item => (
            <div key={item.label} style={{
              ...styles.navItem,
              ...(item.active ? styles.navItemActive : {}),
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userChip}>
            <div style={styles.avatar}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
          <UpdateBanner />
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.greeting}>
              Good to see you, <span style={styles.name}>{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={styles.headerSub}>Here's your account overview</p>
          </div>
          <div style={styles.headerBadge}>
            <span style={styles.greenDot} />
            Session active
          </div>
        </div>

        {/* Stats grid */}
        <div style={styles.statsGrid}>
          {stats.map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statIcon}>{s.icon}</div>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div style={styles.contentGrid}>
          {/* Profile card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Account Details</h3>
            <div style={styles.profileAvatar}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email Address', value: user?.email },
              { label: 'User ID', value: `#${user?.id}` },
              { label: 'Member Since', value: user?.created_at?.split('T')[0] || 'Today' },
            ].map(row => (
              <div key={row.label} style={styles.profileRow}>
                <span style={styles.profileLabel}>{row.label}</span>
                <span style={styles.profileValue}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Activity card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Recent Activity</h3>
            <div style={{ marginTop: 16 }}>
              {activities.map((a, i) => (
                <div key={i} style={styles.activityItem}>
                  <div style={styles.activityIcon}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.activityAction}>{a.action}</div>
                    <div style={styles.activityTime}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.securityBanner}>
              <div style={{ fontSize: 24 }}>🔐</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f0f0ff' }}>
                  Password secured
                </div>
                <div style={{ fontSize: 12, color: '#8888aa', marginTop: 2 }}>
                  Hashed with bcrypt — never stored in plain text
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh', background: '#0a0a0f' },

  // Sidebar
  sidebar: {
    width: 240, background: '#111118',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    padding: '24px 16px',
    flexShrink: 0,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 8px', marginBottom: 32,
  },
  logoIcon: {
    width: 34, height: 34,
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  },
  logoText: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 700, fontSize: 18, color: '#f0f0ff',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    borderRadius: 8, cursor: 'pointer',
    color: '#8888aa', fontSize: 14, fontWeight: 500,
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'rgba(108,99,255,0.12)',
    color: '#a78bfa',
    border: '1px solid rgba(108,99,255,0.2)',
  },
  sidebarFooter: { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 },
  userChip: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0,
  },
  userName: { fontWeight: 600, fontSize: 13, color: '#f0f0ff' },
  userEmail: { fontSize: 11, color: '#55556a', marginTop: 1 },
  logoutBtn: {
    width: '100%', padding: '9px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8, color: '#ef4444',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.15s',
  },

  // Main
  main: { flex: 1, padding: '32px 40px', overflow: 'auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 32,
  },
  greeting: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 28, fontWeight: 700, color: '#f0f0ff',
  },
  name: {
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  headerSub: { color: '#8888aa', fontSize: 14, marginTop: 4 },
  headerBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 14px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 100,
    fontSize: 13, color: '#10b981',
  },
  greenDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#10b981', boxShadow: '0 0 6px #10b981',
    display: 'inline-block',
  },

  // Stats
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16, marginBottom: 28,
  },
  statCard: {
    background: '#16161f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: '20px 24px',
  },
  statIcon: { fontSize: 22, marginBottom: 10 },
  statValue: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 28, fontWeight: 700, color: '#f0f0ff', marginBottom: 4,
  },
  statLabel: { fontSize: 13, color: '#8888aa' },

  // Content
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: {
    background: '#16161f',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 24,
  },
  cardTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 16, fontWeight: 600, color: '#f0f0ff', marginBottom: 20,
  },
  profileAvatar: {
    width: 60, height: 60,
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 24, color: '#fff',
    marginBottom: 20,
  },
  profileRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '11px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  profileLabel: { fontSize: 13, color: '#8888aa' },
  profileValue: { fontSize: 13, color: '#f0f0ff', fontWeight: 500 },
  activityItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  activityIcon: {
    width: 36, height: 36,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  },
  activityAction: { fontSize: 13, color: '#f0f0ff', fontWeight: 500 },
  activityTime: { fontSize: 12, color: '#55556a', marginTop: 2 },
  securityBanner: {
    display: 'flex', alignItems: 'center', gap: 14,
    marginTop: 20, padding: '14px 16px',
    background: 'rgba(108,99,255,0.07)',
    border: '1px solid rgba(108,99,255,0.15)',
    borderRadius: 10,
  },
};