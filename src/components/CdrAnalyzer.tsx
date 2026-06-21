import { useState, useEffect, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { CdrAnalysisResult, CallListRow, SmsListRow, CdrRecord } from '../types/cdr';
import { exportPDF, exportExcel, exportCSV } from '../utils/exportReport';

interface FileRecord {
  id: number;
  original_name: string;
  file_type: string;
}

interface CdrAnalyzerProps {
  file: FileRecord;
  userId?: number;
  onClose: () => void;
  onCreditUsed?: () => void;
  onFileAnalyzed?: () => void;
  preloadedResult?: CdrAnalysisResult;
  fullPage?: boolean;
}

type Tab = 'imei_imsi' | 'stay' | 'calls' | 'sms' | 'shortcall' | 'analysis';

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

export default function CdrAnalyzer({ file, userId, onClose, onCreditUsed, onFileAnalyzed, preloadedResult, fullPage }: CdrAnalyzerProps) {
  const [loading, setLoading] = useState(!preloadedResult);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CdrAnalysisResult | null>(preloadedResult ?? null);
  const [tab, setTab] = useState<Tab>('imei_imsi');
  const [bpartyDetail, setBpartyDetail] = useState<{
    bparty: string;
    type: 'call' | 'sms';
    durationRange?: [number, number];
  } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState('');
  // Prevents React StrictMode from firing the analysis twice (which would deduct 2 credits)
  const hasRun = useRef(false);

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    if (!result) return;
    setShowExportMenu(false);
    setExporting(format);
    setExportMsg('');
    try {
      let saved = false;
      if (format === 'pdf')  saved = await exportPDF(result, file.original_name);
      if (format === 'xlsx') saved = await exportExcel(result, file.original_name);
      if (format === 'csv')  saved = await exportCSV(result, file.original_name);
      if (saved) setExportMsg('✅ Report exported successfully!');
    } catch (err: any) {
      setExportMsg(`⚠️ Export failed: ${err}`);
    } finally {
      setExporting(null);
      setTimeout(() => setExportMsg(''), 4000);
    }
  };

  useEffect(() => {
    if (!preloadedResult && !hasRun.current) {
      hasRun.current = true;
      run();
    }
  }, [file.id]);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoke<CdrAnalysisResult>('analyze_cdr', {
        fileId: file.id,
        userId: userId ?? 0,
      });
      setResult(res);
      onCreditUsed?.();
      onFileAnalyzed?.();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const inner = (
    <>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            {fullPage && <span style={{ color: '#64748b', fontWeight: 400, marginRight: 8 }}>CDR Analysis</span>}
            {file.original_name}
          </div>
          {result && (
            <div style={styles.subtitle}>
              A-Party: <strong>{result.aparty}</strong> · {result.total_records.toLocaleString()} total records
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {result && (
            <div style={{ position: 'relative' }}>
              <button
                style={{ ...styles.exportBtn, opacity: exporting ? 0.7 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}
                onClick={() => !exporting && setShowExportMenu(v => !v)}
                title="Export report"
              >
                {exporting ? `⏳ Exporting ${exporting.toUpperCase()}...` : '↓ Export Report'}
              </button>
              {showExportMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowExportMenu(false)} />
                  <div style={styles.exportMenu}>
                    <div style={styles.exportMenuTitle}>Choose Format</div>
                    {[
                      { format: 'pdf',  icon: '📄', label: 'PDF Report',    sub: 'Full formatted report' },
                      { format: 'xlsx', icon: '📊', label: 'Excel (.xlsx)', sub: 'All data in 6 sheets' },
                      { format: 'csv',  icon: '📑', label: 'CSV Records',   sub: 'Raw data for analysis' },
                    ].map(opt => (
                      <button key={opt.format} style={styles.exportOption}
                        onClick={() => handleExport(opt.format as 'pdf' | 'xlsx' | 'csv')}>
                        <span style={styles.exportOptIcon}>{opt.icon}</span>
                        <div>
                          <div style={styles.exportOptLabel}>{opt.label}</div>
                          <div style={styles.exportOptSub}>{opt.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button style={styles.closeBtn} onClick={onClose}>
            {fullPage ? '← Back' : '✕'}
          </button>
        </div>
      </div>

      {/* Export status message */}
      {exportMsg && (
        <div style={{
          padding: '10px 24px', fontSize: 13, fontWeight: 600,
          color: exportMsg.startsWith('✅') ? '#10b981' : '#f87171',
          background: exportMsg.startsWith('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(248,113,113,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {exportMsg}
        </div>
      )}

      {loading && <div style={styles.centerMsg}>Analyzing CDR data, this may take a moment...</div>}
      {error && <div style={{ ...styles.centerMsg, color: 'var(--accent-red)' }}>⚠️ {error}</div>}

      {!loading && !error && result && (
        <>
          <div style={styles.tabs}>
            {[
              { id: 'imei_imsi', label: 'IMEI & IMSI' },
              { id: 'stay',      label: 'Stay Places' },
              { id: 'calls',     label: 'Call List' },
              { id: 'sms',       label: 'SMS List' },
              { id: 'shortcall', label: 'Short Call Form' },
              { id: 'analysis',  label: '🔍 Analysis View' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as Tab)}
                style={tab === t.id ? styles.tabActive : styles.tab}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={styles.body}>
            {tab === 'imei_imsi' && <ImeiImsiTab result={result} />}
            {tab === 'stay' && <StayPlacesTab result={result} />}
            {tab === 'calls' && <CallListTab result={result} onViewDetails={(b) => setBpartyDetail({ bparty: b, type: 'call' })} />}
            {tab === 'sms'   && <SmsListTab  result={result} onViewDetails={(b) => setBpartyDetail({ bparty: b, type: 'sms' })} />}
            {tab === 'shortcall' && (
              <ShortCallFormTab result={result}
                onViewDetails={(b, dr) => setBpartyDetail({ bparty: b, type: 'call', durationRange: dr })} />
            )}
            {tab === 'analysis' && <AnalysisViewTab result={result} />}
          </div>
        </>
      )}

      {bpartyDetail && (
        <BPartyDetailModal
          bparty={bpartyDetail.bparty}
          allRecords={result!.all_records}
          type={bpartyDetail.type}
          durationRange={bpartyDetail.durationRange}
          onClose={() => setBpartyDetail(null)}
        />
      )}
    </>
  );

  if (fullPage) {
    return <div style={styles.fullPage}>{inner}</div>;
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
}

// ---------- IMEI / IMSI helpers ----------
function luhnValid(imei: string): boolean {
  const d = imei.replace(/\D/g, '');
  if (d.length !== 15) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = parseInt(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

const REPORTING_BODY: Record<string, string> = {
  '01': 'BABT (UK)', '10': 'BABT (UK)', '30': 'PTCRB (USA)', '33': 'ANFR (France)',
  '35': 'BABT (UK)', '44': 'Japan (MIC)', '45': 'South Korea (MSIT)',
  '49': 'Germany (BNetzA)', '52': 'SIRIM (Malaysia/SE Asia)', '86': 'CATT (China)',
  '91': 'India (TRAI)', '98': 'APCO', '99': 'China (SRRC)',
};

const MCC_COUNTRY: Record<string, string> = {
  '470': '🇧🇩 Bangladesh', '404': '🇮🇳 India', '405': '🇮🇳 India',
  '310': '🇺🇸 USA', '234': '🇬🇧 UK', '262': '🇩🇪 Germany',
  '208': '🇫🇷 France', '460': '🇨🇳 China', '440': '🇯🇵 Japan',
  '450': '🇰🇷 South Korea', '502': '🇲🇾 Malaysia', '515': '🇵🇭 Philippines',
  '520': '🇹🇭 Thailand', '525': '🇸🇬 Singapore', '528': '🇧🇳 Brunei',
};

const MCC_MNC_OPERATOR: Record<string, string> = {
  '47001': 'Grameenphone (GP)', '47002': 'Robi Axiata',
  '47003': 'Banglalink', '47004': 'TeleTalk',
  '47005': 'Airtel Bangladesh', '47006': 'Citycell (inactive)',
  '47007': 'Augere / Qubee',
  '40420': 'Vodafone India', '40411': 'Airtel India',
};

function decodeImsi(imsi: string) {
  const d = imsi.replace(/\D/g, '');
  const mcc = d.slice(0, 3);
  const mnc2 = d.slice(3, 5);
  const mnc3 = d.slice(3, 6);
  const country = MCC_COUNTRY[mcc] ?? `MCC ${mcc}`;
  const operator = MCC_MNC_OPERATOR[mcc + mnc2]
    ?? MCC_MNC_OPERATOR[mcc + mnc3]
    ?? `MNC ${mnc2}`;
  const msin = d.slice(5);
  return { mcc, mnc: mnc2, country, operator, msin };
}

// ---------- IMEI Info Modal ----------
function ImeiInfoModal({ imei, onClose }: { imei: string; onClose: () => void }) {
  const digits = imei.replace(/\D/g, '');
  const valid = luhnValid(imei);
  const tac = digits.slice(0, 8);
  const serial = digits.slice(8, 14);
  const checkDigit = digits.slice(14, 15);
  const rb = REPORTING_BODY[digits.slice(0, 2)] ?? `Code ${digits.slice(0, 2)}`;
  const formatted = digits.replace(/(\d{3})(\d{2})(\d{2})(\d{3})(\d{3})(\d{2})/, '$1 $2 $3 $4 $5 $6').trim();

  return (
    <div style={im.overlay} onClick={onClose}>
      <div style={im.card} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={im.header}>
          <div style={im.headerLeft}>
            <div style={im.icon}>📱</div>
            <div>
              <div style={im.title}>Device Information</div>
              <div style={im.sub}>IMEI Analysis</div>
            </div>
          </div>
          <button style={im.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* IMEI number */}
        <div style={im.imeiBox}>
          <div style={im.imeiLabel}>IMEI Number</div>
          <div style={im.imeiValue}>{formatted || imei}</div>
          <div style={{ ...im.statusBadge, background: valid ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)', color: valid ? '#10b981' : '#f87171', borderColor: valid ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.3)' }}>
            {valid ? '✅ Valid IMEI (Luhn check passed)' : '⚠️ Invalid IMEI (Luhn check failed)'}
          </div>
        </div>

        {/* Details grid */}
        <div style={im.grid}>
          {[
            { label: 'TAC', value: tac, desc: 'Type Allocation Code — identifies manufacturer & model' },
            { label: 'Reporting Body', value: rb, desc: 'Standards body that certified this device' },
            { label: 'Serial Number', value: serial, desc: 'Unique device serial within its model' },
            { label: 'Check Digit', value: checkDigit, desc: 'Luhn validation digit' },
          ].map(item => (
            <div key={item.label} style={im.infoCard}>
              <div style={im.infoLabel}>{item.label}</div>
              <div style={im.infoValue}>{item.value || '—'}</div>
              <div style={im.infoDesc}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Online lookup button */}
        <button
          style={im.lookupBtn}
          onClick={() => openUrl(`https://www.imei.info/?imei=${digits}`)}
        >
          🔍 Look Up Full Device Details Online →
        </button>
        <div style={im.lookupNote}>Opens imei.info in your browser with complete device specs</div>
      </div>
    </div>
  );
}

// ---------- IMSI Info Modal ----------
function ImsiInfoModal({ imsi, onClose }: { imsi: string; onClose: () => void }) {
  const { mcc, mnc, country, operator, msin } = decodeImsi(imsi);

  return (
    <div style={im.overlay} onClick={onClose}>
      <div style={im.card} onClick={e => e.stopPropagation()}>
        <div style={im.header}>
          <div style={im.headerLeft}>
            <div style={{ ...im.icon, background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2))' }}>📡</div>
            <div>
              <div style={im.title}>SIM Card Information</div>
              <div style={im.sub}>IMSI Decoded</div>
            </div>
          </div>
          <button style={im.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={im.imeiBox}>
          <div style={im.imeiLabel}>IMSI Number</div>
          <div style={{ ...im.imeiValue, fontSize: 20 }}>{imsi}</div>
        </div>

        <div style={im.grid}>
          {[
            { label: 'Country', value: country, desc: `Mobile Country Code (MCC): ${mcc}` },
            { label: 'Network Operator', value: operator, desc: `Mobile Network Code (MNC): ${mnc}` },
            { label: 'MCC', value: mcc, desc: 'Mobile Country Code (3 digits)' },
            { label: 'Subscriber ID (MSIN)', value: msin, desc: 'Unique subscriber number on this network' },
          ].map(item => (
            <div key={item.label} style={im.infoCard}>
              <div style={im.infoLabel}>{item.label}</div>
              <div style={im.infoValue}>{item.value || '—'}</div>
              <div style={im.infoDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const im: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: '#0d0d1e',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 20,
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
    width: 520,
    maxWidth: '92vw',
    overflow: 'hidden' as const,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    background: 'rgba(139,92,246,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  icon: {
    width: 44, height: 44, borderRadius: 12, fontSize: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(167,139,250,0.2))',
    border: '1px solid rgba(139,92,246,0.3)',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', fontSize: 14, cursor: 'pointer', padding: '5px 9px',
    borderRadius: 7,
  },
  imeiBox: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  imeiLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
  imeiValue: { fontSize: 22, fontWeight: 700, color: '#c4b5fd', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: 10 },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    border: '1px solid',
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '16px 24px',
  },
  infoCard: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  infoLabel: { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, fontFamily: 'monospace' },
  infoDesc: { fontSize: 11, color: '#475569', lineHeight: 1.4 },
  lookupBtn: {
    display: 'block', width: 'calc(100% - 48px)', margin: '0 24px 8px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.12))',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 10, color: '#c4b5fd', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', textAlign: 'center' as const, letterSpacing: '0.02em',
  },
  lookupNote: { fontSize: 11, color: '#475569', textAlign: 'center' as const, padding: '0 24px 20px' },
};

// ---------- Tab: IMEI & IMSI ----------
function ImeiImsiTab({ result }: { result: CdrAnalysisResult }) {
  const [imeiModal, setImeiModal] = useState<string | null>(null);
  const [imsiModal, setImsiModal] = useState<string | null>(null);

  return (
    <>
      <div style={styles.twoColGrid}>
        {/* IMEI table */}
        <div>
          <div style={styles.sectionLabel}>IMEI Usage ({result.imei_table.length})</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>IMEI</th>
                <th style={styles.th}>Events</th>
                <th style={styles.th}>Phone Info</th>
              </tr>
            </thead>
            <tbody>
              {result.imei_table.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{row.imei}</td>
                  <td style={styles.td}>{row.events}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.linkBtn}
                      onClick={() => setImeiModal(row.imei)}
                    >
                      📱 View Phone Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* IMSI table */}
        <div>
          <div style={styles.sectionLabel}>IMSI Usage ({result.imsi_table.length})</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>IMSI</th>
                <th style={styles.th}>Events</th>
                <th style={styles.th}>SIM Info</th>
              </tr>
            </thead>
            <tbody>
              {result.imsi_table.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{row.imsi}</td>
                  <td style={styles.td}>{row.events}</td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.linkBtn, color: '#06b6d4', borderColor: 'rgba(6,182,212,0.3)' }}
                      onClick={() => setImsiModal(row.imsi)}
                    >
                      📡 View SIM Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {imeiModal && <ImeiInfoModal imei={imeiModal} onClose={() => setImeiModal(null)} />}
      {imsiModal && <ImsiInfoModal imsi={imsiModal} onClose={() => setImsiModal(null)} />}
    </>
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
function CallListTab({ result, onViewDetails }: {
  result: CdrAnalysisResult;
  onViewDetails: (bparty: string, durationRange?: [number, number]) => void;
}) {
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
function ShortCallFormTab({ result, onViewDetails }: {
  result: CdrAnalysisResult;
  onViewDetails: (bparty: string, durationRange: [number, number]) => void;
}) {
  const [minSec, setMinSec] = useState(0);
  const [maxSec, setMaxSec] = useState(30);

  const filtered = useMemo(() => {
    // recompute per-bparty stats restricted to calls within [minSec, maxSec]
    const map = new Map<string, { events: number; duration: number; longest: number }>();
    result.all_records.forEach(r => {
      if ((r.usage_type === 'MOC' || r.usage_type === 'MTC') &&
          r.call_duration >= minSec && r.call_duration <= maxSec) {
        const e = map.get(r.bparty) || { events: 0, duration: 0, longest: 0 };
        e.events += 1;
        e.duration += r.call_duration;
        e.longest = Math.max(e.longest, r.call_duration);
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
            <th style={styles.th}>Longest Call</th>
            <th style={styles.th}>Total Duration (all events)</th>
            <th style={styles.th}>Full Details</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr key={i}>
              <td style={styles.td}>{row.bparty}</td>
              <td style={styles.td}>{row.events}</td>
              <td style={styles.td}>{formatDuration(row.longest)}</td>
              <td style={styles.td}>{formatDuration(row.duration)}</td>
              <td style={styles.td}>
                <button
                  style={styles.linkBtn}
                  onClick={() => onViewDetails(row.bparty, [minSec, maxSec])}
                >
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

// ---------- Tab: Analysis View ----------
function AnalysisViewTab({ result }: { result: CdrAnalysisResult }) {
  type Preset = 'custom' | 'day' | 'evening' | 'night';

  const [preset, setPreset] = useState<Preset>('custom');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [imeiFilter, setImeiFilter] = useState('');
  const [imsiFilter, setImsiFilter] = useState('');

  const uniqueImeis = useMemo(
    () => [...new Set(result.all_records.map(r => r.imei).filter(Boolean))].sort(),
    [result]
  );
  const uniqueImsis = useMemo(
    () => [...new Set(result.all_records.map(r => r.imsi_a).filter(Boolean))].sort(),
    [result]
  );

  // start field format: "YYYY:MM:DD:HH:MM:SS"
  const parseStart = (start: string) => {
    const p = start.split(':');
    if (p.length < 6) return null;
    return {
      date: `${p[0]}-${p[1]}-${p[2]}`,
      totalMinutes: parseInt(p[3]) * 60 + parseInt(p[4]),
    };
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'day')     { setTimeFrom('06:00'); setTimeTo('18:00'); }
    else if (p === 'evening') { setTimeFrom('18:00'); setTimeTo('22:00'); }
    else if (p === 'night')   { setTimeFrom('22:00'); setTimeTo('06:00'); }
    else                 { setTimeFrom('00:00'); setTimeTo('23:59'); }
  };

  const filtered = useMemo(() => {
    const fMin = parseInt(timeFrom.split(':')[0]) * 60 + parseInt(timeFrom.split(':')[1]);
    const tMin = parseInt(timeTo.split(':')[0])   * 60 + parseInt(timeTo.split(':')[1]);

    return result.all_records.filter(r => {
      const parsed = parseStart(r.start);
      if (!parsed) return false;
      if (dateFrom && parsed.date < dateFrom) return false;
      if (dateTo   && parsed.date > dateTo)   return false;
      const t = parsed.totalMinutes;
      // night preset wraps midnight: valid if t >= 22:00 OR t <= 06:00
      if (fMin <= tMin) { if (t < fMin || t > tMin) return false; }
      else              { if (t < fMin && t > tMin) return false; }
      if (imeiFilter && r.imei   !== imeiFilter) return false;
      if (imsiFilter && r.imsi_a !== imsiFilter) return false;
      return true;
    });
  }, [result.all_records, dateFrom, dateTo, timeFrom, timeTo, imeiFilter, imsiFilter]);

  const stats = useMemo(() => ({
    calls:         filtered.filter(r => r.usage_type === 'MOC' || r.usage_type === 'MTC').length,
    sms:           filtered.filter(r => r.usage_type === 'SMSOC' || r.usage_type === 'SMSMT').length,
    uniqueBparties: new Set(filtered.map(r => r.bparty)).size,
  }), [filtered]);

  const PRESETS = [
    { id: 'day'     as Preset, label: 'Daytime', range: '6am–6pm',   color: '#f59e0b' },
    { id: 'evening' as Preset, label: 'Evening', range: '6pm–10pm',  color: '#8b5cf6' },
    { id: 'night'   as Preset, label: 'Night',   range: '10pm–6am',  color: '#3b82f6' },
  ];

  const resetAll = () => {
    setDateFrom(''); setDateTo('');
    setTimeFrom('00:00'); setTimeTo('23:59');
    setImeiFilter(''); setImsiFilter('');
    setPreset('custom');
  };

  return (
    <div>
      {/* Preset time-range buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => applyPreset(p.id)} style={{
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${preset === p.id ? p.color : 'var(--border)'}`,
            background: preset === p.id ? `${p.color}22` : 'transparent',
            color: preset === p.id ? p.color : 'var(--text-secondary)',
            fontSize: 13, fontWeight: preset === p.id ? 600 : 400,
          }}>
            {p.label} <span style={{ fontSize: 11, opacity: 0.7 }}>{p.range}</span>
          </button>
        ))}
        <button onClick={() => applyPreset('custom')} style={{
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${preset === 'custom' ? 'rgba(108,99,255,0.5)' : 'var(--border)'}`,
          background: preset === 'custom' ? 'rgba(108,99,255,0.1)' : 'transparent',
          color: preset === 'custom' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
          fontSize: 13,
        }}>
          Custom
        </button>
      </div>

      {/* Filter row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto) 1fr', gap: '10px 16px', alignItems: 'end', marginBottom: 16 }}>
        <label style={styles.formLabel}>
          Date From
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          Date To
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          Time From
          <input type="time" value={timeFrom} onChange={e => { setTimeFrom(e.target.value); setPreset('custom'); }} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          Time To
          <input type="time" value={timeTo} onChange={e => { setTimeTo(e.target.value); setPreset('custom'); }} style={styles.formInput} />
        </label>
        <label style={styles.formLabel}>
          IMEI
          <select value={imeiFilter} onChange={e => setImeiFilter(e.target.value)} style={styles.formInput}>
            <option value="">All IMEIs</option>
            {uniqueImeis.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label style={styles.formLabel}>
          IMSI
          <select value={imsiFilter} onChange={e => setImsiFilter(e.target.value)} style={styles.formInput}>
            <option value="">All IMSIs</option>
            {uniqueImsis.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button onClick={resetAll} style={{ ...styles.linkBtn, padding: '8px 14px', alignSelf: 'end' }}>
          Reset
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Records',    value: filtered.length },
          { label: 'Calls',            value: stats.calls },
          { label: 'SMS',              value: stats.sms },
          { label: 'Unique B-Parties', value: stats.uniqueBparties },
        ].map(s => (
          <div key={s.label} style={{
            padding: '8px 16px', borderRadius: 8, textAlign: 'center' as const,
            background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-secondary)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Records table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Start Time</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>B-Party</th>
            <th style={styles.th}>Duration</th>
            <th style={styles.th}>Network</th>
            <th style={styles.th}>IMEI</th>
            <th style={styles.th}>IMSI</th>
            <th style={styles.th}>Address</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ ...styles.td, textAlign: 'center' as const, padding: '28px', color: 'var(--text-muted)' }}>
                No records match the selected filters
              </td>
            </tr>
          ) : (
            filtered.map((r, i) => (
              <tr key={i}>
                <td style={styles.td}>{r.start}</td>
                <td style={styles.td}>{r.usage_type}</td>
                <td style={styles.td}>{r.bparty}</td>
                <td style={styles.td}>{r.call_duration > 0 ? formatDuration(r.call_duration) : '—'}</td>
                <td style={styles.td}>{r.network_type}</td>
                <td style={styles.td}>{r.imei}</td>
                <td style={styles.td}>{r.imsi_a}</td>
                <td style={styles.td}>{r.address}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- B-Party detail drilldown modal ----------
function BPartyDetailModal({
  bparty, allRecords, type, durationRange, onClose,
}: {
  bparty: string;
  allRecords: CdrRecord[];
  type: 'call' | 'sms';
  durationRange?: [number, number];
  onClose: () => void;
}) {
  const usageTypes = type === 'call' ? ['MOC', 'MTC'] : ['SMSOC', 'SMSMT'];
  const records = allRecords.filter(r => {
    if (r.bparty !== bparty || !usageTypes.includes(r.usage_type)) return false;
    if (durationRange) {
      const [min, max] = durationRange;
      return r.call_duration >= min && r.call_duration <= max;
    }
    return true;
  });
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: '80%', height: '70%' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            Details for {bparty}
            {durationRange && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                (calls {durationRange[0]}s–{durationRange[1]}s only)
              </span>
            )}
          </div>
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
  fullPage: {
    display: 'flex', flexDirection: 'column',
    height: '100%',
    background: '#0d0d1e',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '92%', height: '90%',
    background: '#0d0d1e',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 18,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
    background: 'rgba(139,92,246,0.04)',
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 700, fontSize: 16,
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
    transition: 'all 0.15s',
  },
  exportBtn: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
    border: '1px solid rgba(139,92,246,0.4)',
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '7px 14px',
    borderRadius: 8,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.02em',
  },
  exportMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#0f0f23',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
    overflow: 'hidden' as const,
    zIndex: 100,
    minWidth: 260,
  },
  exportMenuTitle: {
    padding: '12px 16px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  exportOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '11px 16px',
    background: 'transparent',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s',
  },
  exportOptIcon: {
    fontSize: 22,
    flexShrink: 0,
  },
  exportOptLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 2,
  },
  exportOptSub: {
    fontSize: 11,
    color: '#64748b',
  },
  centerMsg: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#94a3b8', fontSize: 14,
  },
  tabs: {
    display: 'flex', gap: 6, flexWrap: 'wrap' as const,
    padding: '14px 24px 0', flexShrink: 0,
  },
  tab: {
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#475569',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    padding: '7px 16px',
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 8,
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(139,92,246,0.2)',
  },
  body: {
    flex: 1, overflow: 'auto', padding: '18px 24px 24px',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    textAlign: 'left' as const,
    padding: '9px 12px',
    color: '#94a3b8',
    fontWeight: 600,
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'sticky' as const, top: 0,
    background: '#0d0d1e',
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  td: {
    padding: '8px 12px',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: 13,
  },
  linkBtn: {
    padding: '5px 11px',
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 7,
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  formRow: {
    display: 'flex', alignItems: 'flex-end', gap: 16,
    marginBottom: 18,
  },
  formLabel: {
    display: 'flex', flexDirection: 'column' as const, gap: 5,
    fontSize: 11, color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  formInput: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    width: 140,
    outline: 'none',
  },
  formResultCount: {
    fontSize: 12, color: '#a78bfa',
    fontWeight: 700,
  },
};