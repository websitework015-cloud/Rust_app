import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractContacts, ExtractionResult } from '../utils/contactExtractor';

interface FileRecord {
  id: number;
  original_name: string;
  file_type: string;
}

interface ContactExtractorProps {
  file: FileRecord;
  onClose: () => void;
}

function parseHtmlTable(html: string): string[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return [];
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      cells.push((cell.textContent ?? '').trim());
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

export default function ContactExtractor({ file, onClose }: ContactExtractorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [view, setView] = useState<'duplicates' | 'all'>('duplicates');

  useEffect(() => {
    run();
  }, [file.id]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const content = await invoke<string>('read_file_content', { fileId: file.id });
      let rows: string[][] = [];

      if (file.file_type === 'csv') {
        const parsed = Papa.parse<string[]>(content, { skipEmptyLines: true });
        rows = parsed.data;
      } else if (file.file_type === 'xlsx' || file.file_type === 'xls') {
        const binary = atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
      } else if (file.file_type === 'html') {
        rows = parseHtmlTable(content);
      }

      if (rows.length === 0) {
        setError('No tabular data could be read from this file.');
        setLoading(false);
        return;
      }

      const extraction = extractContacts(rows);
      setResult(extraction);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Extracted Contacts — {file.original_name}</div>
            {result && (
              <div style={styles.subtitle}>
                Detected columns: <strong>{result.nameColumn ?? 'not found'}</strong> (name),{' '}
                <strong>{result.phoneColumn ?? 'not found'}</strong> (phone)
              </div>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading && <div style={styles.centerMsg}>Analyzing file...</div>}
        {error && <div style={{ ...styles.centerMsg, color: 'var(--accent-red)' }}>⚠️ {error}</div>}

        {!loading && !error && result && (
          <>
            <div style={styles.statsRow}>
              <div style={styles.statPill}>
                <span style={styles.statNum}>{result.totalRows}</span> total rows
              </div>
              <div style={styles.statPill}>
                <span style={styles.statNum}>{result.duplicateGroups.length}</span> duplicate groups
              </div>
              <div style={styles.statPill}>
                <span style={styles.statNum}>{result.uniqueContacts.length}</span> unique contacts
              </div>
            </div>

            <div style={styles.tabs}>
              <button
                onClick={() => setView('duplicates')}
                style={view === 'duplicates' ? styles.tabActive : styles.tab}
              >
                Duplicates
              </button>
              <button
                onClick={() => setView('all')}
                style={view === 'all' ? styles.tabActive : styles.tab}
              >
                All Unique
              </button>
            </div>

            <div style={styles.body}>
              {view === 'duplicates' && (
                result.duplicateGroups.length === 0 ? (
                  <div style={styles.emptyMsg}>No duplicate names or phone numbers found.</div>
                ) : (
                  result.duplicateGroups.map((group, gi) => (
                    <div key={gi} style={styles.groupCard}>
                      <div style={styles.groupHeader}>
                        <span style={styles.groupBadge}>
                          Same {group.matchType === 'phone' ? 'phone number' : 'name'}
                        </span>
                        <span style={styles.groupKey}>
                          {group.matchType === 'phone' ? group.key : group.key}
                        </span>
                        <span style={styles.groupCount}>{group.contacts.length} entries</span>
                      </div>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.contacts.map((c, ci) => (
                            <tr key={ci}>
                              <td style={styles.td}>{c.name || '—'}</td>
                              <td style={styles.td}>{c.phone || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )
              )}

              {view === 'all' && (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.uniqueContacts.map((c, i) => (
                      <tr key={i}>
                        <td style={styles.td}>{c.name || '—'}</td>
                        <td style={styles.td}>{c.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '88%', height: '85%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 22px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 600, fontSize: 16,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-secondary)', fontSize: 16,
    cursor: 'pointer', padding: 4,
  },
  centerMsg: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', fontSize: 14,
  },
  statsRow: {
    display: 'flex', gap: 10,
    padding: '14px 22px 0',
  },
  statPill: {
    padding: '6px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 100,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  statNum: {
    color: 'var(--accent-secondary)',
    fontWeight: 700,
    fontFamily: 'Space Grotesk, sans-serif',
  },
  tabs: {
    display: 'flex', gap: 8,
    padding: '14px 22px 0',
  },
  tab: {
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
  },
  tabActive: {
    padding: '7px 16px',
    background: 'rgba(108,99,255,0.12)',
    border: '1px solid rgba(108,99,255,0.3)',
    borderRadius: 8,
    color: 'var(--accent-secondary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  body: {
    flex: 1, overflow: 'auto', padding: '16px 22px 22px',
  },
  emptyMsg: {
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
    fontSize: 13,
    padding: '40px 0',
  },
  groupCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  groupHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 10,
  },
  groupBadge: {
    fontSize: 11, fontWeight: 600,
    padding: '3px 10px',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: 100,
    color: 'var(--accent-green)',
  },
  groupKey: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
  },
  groupCount: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontWeight: 600,
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '7px 12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
};