import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import FilePreview from './FilePreview';
import ContactExtractor from './ContactExtractor';
import CdrAnalyzer from './CdrAnalyzer';

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
}

const TYPE_ICONS: Record<string, string> = {
  csv: '📊',
  xlsx: '📗',
  xls: '📗',
  html: '🌐',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileManager({ userId }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [contactFile, setContactFile] = useState<FileRecord | null>(null);
  const [analyzeFile, setAnalyzeFile] = useState<FileRecord | null>(null);
  const loadFiles = async () => {
    try {
      const result = await invoke<FileRecord[]>('list_files', { userId });
      setFiles(result);
    } catch (err: any) {
      setError(err.toString());
    }
  };

  useEffect(() => {
    loadFiles();
  }, [userId]);

  const handleUpload = async () => {
    setError('');
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Supported files', extensions: ['xls', 'xlsx', 'csv', 'html', 'htm'] },
        ],
      });

      if (!selected || typeof selected !== 'string') return;

      setLoading(true);
      const fileData = await readFile(selected);
      const fileName = selected.split(/[\\/]/).pop() || 'file';

      await invoke('upload_file', {
        userId,
        fileName,
        fileData: Array.from(fileData),
      });

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

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h3 style={styles.cardTitle}>Uploaded Files</h3>
        <button onClick={handleUpload} style={styles.uploadBtn} disabled={loading}>
          {loading ? 'Uploading...' : '+ Upload File'}
        </button>
      </div>

      {error && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}

      {files.map(file => (
  <div key={file.id} style={styles.fileCard}>
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
      onClick={() => setPreviewFile(file)}
    >
      <div style={styles.fileIcon}>
        {TYPE_ICONS[file.file_type] || '📄'}
      </div>
      <div style={styles.fileInfo}>
        <div style={styles.fileName} title={file.original_name}>
          {file.original_name}
        </div>
        <div style={styles.fileMeta}>
          {formatSize(file.size_bytes)} · {file.file_type.toUpperCase()}
        </div>
      </div>
    </div>

    <button
      style={styles.extractBtn}
      onClick={(e) => { e.stopPropagation(); setContactFile(file); }}
      title="Extract Contacts"
    >
      👤 Extract
    </button>

    <button
    style={styles.analyzeBtn}
    onClick={(e) => { e.stopPropagation(); setAnalyzeFile(file); }}
    title="Analyze CDR"
    >
    📡 Analyze
    </button>

    <button
      style={styles.deleteBtn}
      onClick={(e) => handleDelete(file.id, e)}
      title="Delete file"
    >
      ✕
    </button>
  </div>
))}
      {previewFile && (
  <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
)}

{contactFile && (
  <ContactExtractor file={contactFile} onClose={() => setContactFile(null)} />
)}
{analyzeFile && (
  <CdrAnalyzer file={analyzeFile} onClose={() => setAnalyzeFile(null)} />
)}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 16, fontWeight: 600,
    color: 'var(--text-primary)',
  },
  uploadBtn: {
    padding: '8px 18px',
    background: 'var(--accent-primary)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  errorMsg: {
    color: 'var(--accent-red)',
    fontSize: 13,
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    cursor: 'pointer',
    position: 'relative',
    transition: 'border-color 0.15s, transform 0.1s',
  },
  fileIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileMeta: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 14,
    padding: 4,
    flexShrink: 0,
  },
  extractBtn: {
  padding: '5px 10px',
  background: 'rgba(108,99,255,0.1)',
  border: '1px solid rgba(108,99,255,0.25)',
  borderRadius: 6,
  color: 'var(--accent-secondary)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap' as const,
},
analyzeBtn: {
  padding: '5px 10px',
  background: 'rgba(16,185,129,0.1)',
  border: '1px solid rgba(16,185,129,0.25)',
  borderRadius: 6,
  color: 'var(--accent-green)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap' as const,
},
};