import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileRecord {
  id: number;
  original_name: string;
  file_type: string;
}

interface FilePreviewProps {
  file: FileRecord;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableData, setTableData] = useState<string[][] | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, [file.id]);

  const loadContent = async () => {
    setLoading(true);
    setError('');
    try {
      const content = await invoke<string>('read_file_content', { fileId: file.id });

      if (file.file_type === 'csv') {
        const parsed = Papa.parse<string[]>(content, { skipEmptyLines: true });
        setTableData(parsed.data);
      } else if (file.file_type === 'xlsx' || file.file_type === 'xls') {
        const binary = atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        setTableData(rows as string[][]);
      } else if (file.file_type === 'html') {
        setHtmlContent(content);
      }
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
          <div style={styles.title}>{file.original_name}</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {loading && (
            <div style={styles.centerMsg}>Loading preview...</div>
          )}

          {error && (
            <div style={{ ...styles.centerMsg, color: 'var(--accent-red)' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && tableData && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {tableData[0]?.map((cell, i) => (
                      <th key={i} style={styles.th}>{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(1).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={styles.td}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && htmlContent && (
            <iframe
              srcDoc={htmlContent}
              style={styles.iframe}
              sandbox=""
              title="HTML preview"
            />
          )}
        </div>
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
    width: '85%', height: '80%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 600, fontSize: 15,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-secondary)', fontSize: 16,
    cursor: 'pointer', padding: 4,
  },
  body: {
    flex: 1, overflow: 'auto', padding: 20,
  },
  centerMsg: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: 'var(--text-secondary)', fontSize: 14,
  },
  tableWrap: {
    overflow: 'auto',
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 14px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    borderBottom: '1px solid var(--border)',
    position: 'sticky' as const, top: 0,
  },
  td: {
    padding: '9px 14px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  iframe: {
    width: '100%', height: '100%',
    border: 'none', borderRadius: 8,
    background: '#fff',
  },
};