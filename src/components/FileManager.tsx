import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import FilePreview from './FilePreview';

interface FileRecord {
  id: number;
  user_id: number;
  original_name: string;
  stored_name: string;
  file_type: string;
  size_bytes: number;
  uploaded_at: string;
}

interface FileManagerProps {
  userId: number;
  onAnalyze: (file: FileRecord) => void;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  csv:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  color: '#10b981', icon: '📊' },
  xlsx: { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   color: '#06b6d4', icon: '📗' },
  xls:  { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',   color: '#06b6d4', icon: '📗' },
  html: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  color: '#f59e0b', icon: '🌐' },
  htm:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  color: '#f59e0b', icon: '🌐' },
};
const DEFAULT_TYPE = { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', color: '#a78bfa', icon: '📄' };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_FILTERS = [{ name: 'CDR Files', extensions: ['xls', 'xlsx', 'csv', 'html', 'htm'] }];

export default function FileManager({ userId, onAnalyze }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadFiles = async () => {
    try {
      const result = await invoke<FileRecord[]>('list_files', { userId });
      setFiles(result);
    } catch (err: any) {
      setError(err.toString());
    }
  };

  useEffect(() => { loadFiles(); }, [userId]);

  const handleUpload = async () => {
    setError('');
    try {
      const selected = await open({ multiple: false, filters: FILE_FILTERS });
      if (!selected || typeof selected !== 'string') return;
      setLoading(true);
      const fileData = await readFile(selected);
      const fileName = selected.split(/[\\/]/).pop() || 'file';
      await invoke('upload_file', { userId, fileName, fileData: Array.from(fileData) });
      await loadFiles();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('delete_file', { fileId: id });
      await loadFiles();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleUpdate = async (file: FileRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setError('');
    try {
      const selected = await open({ multiple: false, filters: FILE_FILTERS });
      if (!selected || typeof selected !== 'string') return;
      setUpdatingId(file.id);
      const fileData = await readFile(selected);
      // Replace: delete old record, upload new file keeping the original display name
      await invoke('delete_file', { fileId: file.id });
      await invoke('upload_file', { userId, fileName: file.original_name, fileData: Array.from(fileData) });
      await loadFiles();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.headerRow}>
        <div>
          <h3 style={s.cardTitle}>CDR Files</h3>
          <p style={s.cardSub}>{files.length} file{files.length !== 1 ? 's' : ''} ready for analysis</p>
        </div>
        <button onClick={handleUpload} style={s.uploadBtn} disabled={loading}>
          {loading ? 'Uploading...' : '↑ Upload CDR File'}
        </button>
      </div>

      {error && <div style={s.errorMsg}>⚠️ {error}</div>}

      {files.length === 0 && !loading && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>📂</div>
          <div style={s.emptyTitle}>No files yet</div>
          <div style={s.emptySub}>Upload a CDR file (CSV, XLSX, XLS, HTML) to get started</div>
          <button onClick={handleUpload} style={s.emptyUploadBtn}>↑ Upload your first file</button>
        </div>
      )}

      {files.length > 0 && (
        <div style={s.fileList}>
          {files.map(file => {
            const tc = TYPE_COLORS[file.file_type] || DEFAULT_TYPE;
            const isUpdating = updatingId === file.id;
            return (
              <div key={file.id} style={s.fileCard}>
                {/* Type icon */}
                <div style={{ ...s.typeIcon, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}>
                  {tc.icon}
                </div>

                {/* File info */}
                <div style={s.fileInfo} onClick={() => setPreviewFile(file)}>
                  <div style={s.fileName} title={file.original_name}>{file.original_name}</div>
                  <div style={s.fileMeta}>
                    <span style={{ ...s.fileTypeBadge, color: tc.color, background: tc.bg }}>
                      {file.file_type.toUpperCase()}
                    </span>
                    <span>{formatSize(file.size_bytes)}</span>
                    <span>·</span>
                    <span>Click to preview</span>
                  </div>
                </div>

                {/* Update button */}
                <button
                  style={{ ...s.updateBtn, opacity: isUpdating ? 0.6 : 1 }}
                  onClick={(e) => handleUpdate(file, e)}
                  disabled={isUpdating}
                  title="Replace this file with a new version"
                >
                  {isUpdating ? '⏳' : '✏️ Update'}
                </button>

                {/* Analyze button */}
                <button
                  style={s.analyzeBtn}
                  onClick={(e) => { e.stopPropagation(); onAnalyze(file); }}
                  title="Analyze CDR (costs 1 credit)"
                >
                  📡 Analyze
                  <span style={s.creditTag}>−1 💎</span>
                </button>

                {/* Delete */}
                <button
                  style={s.deleteBtn}
                  onClick={(e) => handleDelete(file.id, e)}
                  title="Delete file"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-bright)',
    borderRadius: 16, padding: 28,
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '-0.01em',
  },
  cardSub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  uploadBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    border: 'none', borderRadius: 9, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(139,92,246,0.3)', letterSpacing: '0.01em',
  },
  errorMsg: {
    color: 'var(--accent-red)', fontSize: 13, padding: '10px 14px',
    background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 8, marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center' as const, padding: '56px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8, filter: 'grayscale(0.3)' },
  emptyTitle: {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
  },
  emptySub: { fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 },
  emptyUploadBtn: {
    marginTop: 8, padding: '10px 24px',
    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 9, color: 'var(--accent-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  fileList: { display: 'flex', flexDirection: 'column', gap: 8 },
  fileCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  typeIcon: {
    width: 40, height: 40, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, flexShrink: 0,
  },
  fileInfo: { flex: 1, minWidth: 0, cursor: 'pointer' },
  fileName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  fileMeta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginTop: 3 },
  fileTypeBadge: { padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' },
  updateBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px',
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 7, color: '#f59e0b', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em', transition: 'all 0.15s',
  },
  analyzeBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em', transition: 'all 0.2s',
  },
  creditTag: { fontSize: 10, opacity: 0.75, fontWeight: 600 },
  deleteBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', fontSize: 13, padding: '4px 6px',
    flexShrink: 0, borderRadius: 5, transition: 'color 0.15s',
  },
};
