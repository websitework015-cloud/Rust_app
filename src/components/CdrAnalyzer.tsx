import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CdrAnalysisResult, CallListRow, SmsListRow, CdrRecord } from '../types/cdr';

interface FileRecord {
  id: number;
  original_name: string;
  file_type: string;
}

interface CdrAnalyzerProps {
  file: FileRecord;
  onClose: () => void;
}

type Tab = 'imei_imsi' | 'stay' | 'calls' | 'sms' | 'shortcall';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default function CdrAnalyzer({ file, onClose }: CdrAnalyzerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CdrAnalysisResult | null>(null);
  const [tab, setTab] = useState<Tab>('imei_imsi');
  const [bpartyDetail, setBpartyDetail] = useState<{ bparty: string; type: 'call' | 'sms' } | null>(null);

  useEffect(() => {
    run();
  }, [file.id]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoke<CdrAnalysisResult>('analyze_cdr', { fileId: file.id });
      setResult(res);
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
            <div style={styles.title}>CDR Analysis — {file.original_name}</div>
            {result && (
              <div style={styles.subtitle}>
                A-Party: <strong>{result.aparty}</strong> · {result.total_records.toLocaleString()} total records
              </div>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading && <div style={styles.centerMsg}>Analyzing CDR data, this may take a moment...</div>}
        {error && <div style={{ ...styles.centerMsg, color: 'var(--accent-red)' }}>⚠️ {error}</div>}

        {!loading && !error && result && (
          <>
            <div style={styles.tabs}>
              {[
                { id: 'imei_imsi', label: 'IMEI & IMSI' },
                { id: 'stay', label: 'Stay Places' },
                { id: 'calls', label: 'Call List' },
                { id: 'sms', label: 'SMS List' },
                { id: 'shortcall', label: 'Short Call Form' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as Tab)}
                  style={tab === t.id ? styles.tabActive : styles.tab}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={styles.body}>
              {tab === 'imei_imsi' && <ImeiImsiTab result={result} />}
              {tab === 'stay' && <StayPlacesTab result={result} />}
              {tab === 'calls' && (
                <CallListTab
                  result={result}
                  onViewDetails={(bparty) => setBpartyDetail({ bparty, type: 'call' })}
                />
              )}
              {tab === 'sms' && (
                <SmsListTab
                  result={result}
                  onViewDetails={(bparty) => setBpartyDetail({ bparty, type: 'sms' })}
                />
              )}
              {tab === 'shortcall' && <ShortCallFormTab result={result} onViewDetails={(bparty) => setBpartyDetail({ bparty, type: 'call' })} />}
            </div>
          </>
        )}

        {bpartyDetail && (
          <BPartyDetailModal
            bparty={bpartyDetail.bparty}
            allRecords={result!.all_records}
            type={bpartyDetail.type}
            onClose={() => setBpartyDetail(null)}
          />
        )}
      </div>
    </div>
  );
}

// ---------- Tab: IMEI & IMSI ----------
function ImeiImsiTab({ result }: { result: CdrAnalysisResult }) {
  return (
    <div style={styles.twoColGrid}>
      <div>
        <div style={styles.sectionLabel}>IMEI Usage ({result.imei_table.length})</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>IMEI</th>
              <th style={styles.th}>Events</th>
              <th style={styles.th}>Info</th>
            </tr>
          </thead>
          <tbody>
            {result.imei_table.map((row, i) => (
              <tr key={i}>
                <td style={styles.td}>{row.imei}</td>
                <td style={styles.td}>{row.events}</td>
                <td style={styles.td}>
                  <button
                    style={styles.linkBtn}
                    onClick={() => window.open(`https://www.imei.info/?imei=${row.imei}`, '_blank')}
                  >
                    See phone info
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div style={styles.sectionLabel}>IMSI Usage ({result.imsi_table.length})</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>IMSI</th>
              <th style={styles.th}>Events</th>
            </tr>
          </thead>
          <tbody>
            {result.imsi_table.map((row, i) => (
              <tr key={i}>
                <td style={styles.td}>{row.imsi}</td>
                <td style={styles.td}>{row.events}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Tab: Stay Places ----------
function StayPlacesTab({ result }: { result: CdrAnalysisResult }) {
  const sections = [
    { title: 'Top 3 Day Stay (6am–6pm)', rows: result.day_stay },
    { title: 'Top 3 Evening Stay (6pm–10pm)', rows: result.evening_stay },
    { title: 'Top 3 Night Stay (10pm–6am)', rows: result.night_stay },
  ];
  return (
    <div>
      {sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <div style={styles.sectionLabel}>{sec.title}</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>LAC-CI</th>
                <th style={styles.th}>Events</th>
              </tr>
            </thead>
            <tbody>
              {sec.rows.length === 0 ? (
                <tr><td style={styles.td} colSpan={3}>No data for this period</td></tr>
              ) : (
                sec.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{row.address || '—'}</td>
                    <td style={styles.td}>{row.lac_ci}</td>
                    <td style={styles.td}>{row.events}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ---------- Tab: Call List ----------
function CallListTab({ result, onViewDetails }: { result: CdrAnalysisResult; onViewDetails: (bparty: string) => void }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>B-Party</th>
          <th style={styles.th}>Total Events</th>
          <th style={styles.th}>MOC</th>
          <th style={styles.th}>MTC</th>
          <th style={styles.th}>Total Duration</th>
          <th style={styles.th}>Full Details</th>
        </tr>
      </thead>
      <tbody>
        {result.call_list.map((row: CallListRow, i) => (
          <tr key={i}>
            <td style={styles.td}>{row.bparty}</td>
            <td style={styles.td}>{row.total_events}</td>
            <td style={styles.td}>{row.moc}</td>
            <td style={styles.td}>{row.mtc}</td>
            <td style={styles.td}>{formatDuration(row.total_duration_seconds)}</td>
            <td style={styles.td}>
              <button style={styles.linkBtn} onClick={() => onViewDetails(row.bparty)}>
                View details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Tab: SMS List ----------
function SmsListTab({ result, onViewDetails }: { result: CdrAnalysisResult; onViewDetails: (bparty: string) => void }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>B-Party</th>
          <th style={styles.th}>Total Events</th>
          <th style={styles.th}>SMSOC</th>
          <th style={styles.th}>SMSMT</th>
          <th style={styles.th}>Full Details</th>
        </tr>
      </thead>
      <tbody>
        {result.sms_list.map((row: SmsListRow, i) => (
          <tr key={i}>
            <td style={styles.td}>{row.bparty}</td>
            <td style={styles.td}>{row.total_events}</td>
            <td style={styles.td}>{row.smsoc}</td>
            <td style={styles.td}>{row.smsmt}</td>
            <td style={styles.td}>
              <button style={styles.linkBtn} onClick={() => onViewDetails(row.bparty)}>
                View details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Tab: Short Call Form ----------
function ShortCallFormTab({ result, onViewDetails }: { result: CdrAnalysisResult; onViewDetails: (bparty: string) => void }) {
  const [minSec, setMinSec] = useState(0);
  const [maxSec, setMaxSec] = useState(30);

  const filtered = useMemo(() => {
    // recompute per-bparty stats restricted to calls within [minSec, maxSec]
    const map = new Map<string, { events: number; duration: number }>();
    result.all_records.forEach(r => {
      if ((r.usage_type === 'MOC' || r.usage_type === 'MTC') &&
          r.call_duration >= minSec && r.call_duration <= maxSec) {
        const e = map.get(r.bparty) || { events: 0, duration: 0 };
        e.events += 1;
        e.duration += r.call_duration;
        map.set(r.bparty, e);
      }
    });
    return Array.from(map.entries())
      .map(([bparty, v]) => ({ bparty, ...v }))
      .sort((a, b) => b.events - a.events);
  }, [result, minSec, maxSec]);

  return (
    <div>
      <div style={styles.formRow}>
        <label style={styles.formLabel}>
          Min duration (seconds)
          <input
            type="number"
            value={minSec}
            onChange={(e) => setMinSec(Number(e.target.value))}
            style={styles.formInput}
          />
        </label>
        <label style={styles.formLabel}>
          Max duration (seconds)
          <input
            type="number"
            value={maxSec}
            onChange={(e) => setMaxSec(Number(e.target.value))}
            style={styles.formInput}
          />
        </label>
        <div style={styles.formResultCount}>{filtered.length} B-Parties match</div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>B-Party</th>
            <th style={styles.th}>Events in range</th>
            <th style={styles.th}>Total Duration</th>
            <th style={styles.th}>Full Details</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr key={i}>
              <td style={styles.td}>{row.bparty}</td>
              <td style={styles.td}>{row.events}</td>
              <td style={styles.td}>{formatDuration(row.duration)}</td>
              <td style={styles.td}>
                <button style={styles.linkBtn} onClick={() => onViewDetails(row.bparty)}>
                  View details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- B-Party detail drilldown modal ----------
function BPartyDetailModal({
  bparty, allRecords, type, onClose,
}: {
  bparty: string;
  allRecords: CdrRecord[];
  type: 'call' | 'sms';
  onClose: () => void;
}) {
  const usageTypes = type === 'call' ? ['MOC', 'MTC'] : ['SMSOC', 'SMSMT'];
  const records = allRecords.filter(r => r.bparty === bparty && usageTypes.includes(r.usage_type));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: '80%', height: '70%' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Details for {bparty}</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Start Time</th>
                <th style={styles.th}>Type</th>
                {type === 'call' && <th style={styles.th}>Duration</th>}
                <th style={styles.th}>Network</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>IMEI</th>
                <th style={styles.th}>IMSI</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}>{r.start}</td>
                  <td style={styles.td}>{r.usage_type}</td>
                  {type === 'call' && <td style={styles.td}>{formatDuration(r.call_duration)}</td>}
                  <td style={styles.td}>{r.network_type}</td>
                  <td style={styles.td}>{r.address}</td>
                  <td style={styles.td}>{r.imei}</td>
                  <td style={styles.td}>{r.imsi_a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '92%', height: '90%',
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
    flexShrink: 0,
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
  tabs: {
    display: 'flex', gap: 8, flexWrap: 'wrap' as const,
    padding: '14px 22px 0', flexShrink: 0,
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
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 10,
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
    position: 'sticky' as const, top: 0,
    background: 'var(--bg-card)',
  },
  td: {
    padding: '7px 12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  linkBtn: {
    padding: '4px 10px',
    background: 'rgba(108,99,255,0.1)',
    border: '1px solid rgba(108,99,255,0.25)',
    borderRadius: 6,
    color: 'var(--accent-secondary)',
    fontSize: 12,
    cursor: 'pointer',
  },
  formRow: {
    display: 'flex', alignItems: 'flex-end', gap: 16,
    marginBottom: 18,
  },
  formLabel: {
    display: 'flex', flexDirection: 'column' as const, gap: 4,
    fontSize: 12, color: 'var(--text-secondary)',
  },
  formInput: {
    padding: '8px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    width: 140,
  },
  formResultCount: {
    fontSize: 12, color: 'var(--accent-secondary)',
    fontWeight: 600,
  },
};