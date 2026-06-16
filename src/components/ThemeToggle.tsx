import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} style={styles.btn} title="Toggle theme">
      <div style={{
        ...styles.track,
        background: theme === 'dark'
          ? 'rgba(108,99,255,0.3)'
          : 'rgba(108,99,255,0.15)',
        border: theme === 'dark'
          ? '1px solid rgba(108,99,255,0.4)'
          : '1px solid rgba(108,99,255,0.25)',
      }}>
        <div style={{
          ...styles.thumb,
          transform: theme === 'dark' ? 'translateX(0px)' : 'translateX(22px)',
          background: theme === 'dark' ? '#6c63ff' : '#6c63ff',
        }}>
          <span style={{ fontSize: 10 }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  track: {
    width: 52, height: 28,
    borderRadius: 100,
    padding: 3,
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
  },
  thumb: {
    width: 22, height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
};