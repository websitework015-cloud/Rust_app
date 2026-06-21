import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CdrAnalysisResult } from '../types/cdr';

interface AnalysisRecord {
  id: number;
  user_id: number;
  file_name: string;
  analyzed_at: string | null;
}

interface AnalyzedFilesProps {
  userId: number;
  onView: (id: number, file_name: string, result: CdrAnalysisResult) => void;
}

export default function AnalyzedFiles({ userId, onView }: AnalyzedFilesProps) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await invoke<AnalysisRecord[]>('list_analyses', { userId });
      setRecords(list);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const handleView = async (record: AnalysisRecord) => {
    setLoadingId(record.id);
    try {
      const result = await invoke<CdrAnalysisResult>('get_analysis', { id: record.id });
      onView(record.id, record.file_name, result);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await invoke('delete_analysis', { id });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return 'Unknown date';
    return s.replace('T', ' ').substring(0, 16);
  };

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner}>⏳</div>
        Loading analysis history...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={s.errorMsg}>⚠️ {error}</div>
      )}

      {records.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>🔬</div>
          <div style={s.emptyTitle}>No analyses yet</div>
          <div style={s.emptySub}>
            Go to Dashboard, upload a CDR file, and click Analyze to get started.
            <br />Your analyses will appear here for free re-viewing.
          </div>
        </div>
      ) : (
        <div>
          {/* Header card */}
          <div style={s.headerCard}>
            <div style={s.headerLeft}>
              <div style={s.headerIcon}>📊</div>
              <div>
                <div style={s.headerTitle}>Analysis History</div>
                <div style={s.headerSub}>{records.length} saved analysis{records.length !== 1 ? 'es' : ''} · Free to re-open</div>
              </div>
            </div>
            <div style={s.freeBadge}>
              <span>✓</span> Always Free
            </div>
          </div>

          {/* Records list */}
          <div style={s.list}>
            {records.map((rec, idx) => (
              <div
                key={rec.id}
                style={{
                  ...s.row,
                  background: hovered === rec.id ? 'rgba(139,92,246,0.06)' : 'var(--bg-card)',
                  borderColor: hovered === rec.id ? 'rgba(139,92,246,0.25)' : 'var(--border)',
                  boxShadow: hovered === rec.id ? '0 4px 20px rgba(139,92,246,0.1)' : 'none',
                }}
                onMouseEnter={() => setHovered(rec.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Index badge */}
                <div style={s.indexBadge}>{idx + 1}</div>

                {/* Icon */}
                <div style={s.fileIconWrap}>
                  <span style={{ fontSize: 18 }}>📊</span>
                </div>

                {/* Info */}
                <div style={s.info}>
                  <div style={s.fileName}>{rec.file_name}</div>
                  <div style={s.meta}>
                    <span style={s.metaDot} />
                    Analyzed: {formatDate(rec.analyzed_at)}
                  </div>
                </div>

                {/* View button */}
                <button
                  style={{
                    ...s.viewBtn,
                    background: loadingId === rec.id ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.1)',
                    opacity: loadingId !== null && loadingId !== rec.id ? 0.5 : 1,
                  }}
                  onClick={() => handleView(rec)}
                  disabled={loadingId === rec.id}
                >
                  {loadingId === rec.id ? '⏳ Loading...' : '👁 View Analysis'}
                </button>

                {/* Delete button */}
                <button
                  style={s.deleteBtn}
                  onClick={() => handleDelete(rec.id)}
                  title="Delete this analysis record"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  center: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    color: 'var(--text-muted)',
    fontSize: 15,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  spinner: { fontSize: 32 },

  empty: {
    textAlign: 'center' as const,
    padding: '72px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  emptySub: {
    fontSize: 14,
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    maxWidth: 420,
    textAlign: 'center' as const,
  },

  errorMsg: {
    color: 'var(--accent-red)',
    fontSize: 13,
    padding: '10px 14px',
    background: 'rgba(248,113,113,0.07)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 10,
    marginBottom: 16,
  },

  /* Header card */
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 14,
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    background: 'rgba(139,92,246,0.12)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  headerTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  headerSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  freeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 700,
    color: '#10b981',
  },

  /* List */
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    border: '1px solid var(--border)',
    borderRadius: 12,
    transition: 'all 0.2s ease',
  },
  indexBadge: {
    width: 26,
    height: 26,
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent-secondary)',
    flexShrink: 0,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    background: 'rgba(139,92,246,0.08)',
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 3,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'inline-block',
    flexShrink: 0,
  },
  viewBtn: {
    padding: '7px 16px',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 8,
    color: 'var(--accent-secondary)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
    letterSpacing: '0.01em',
  },
  deleteBtn: {
    padding: '7px 10px',
    background: 'rgba(248,113,113,0.07)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 8,
    color: '#f87171',
    fontSize: 14,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
};
