import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateStatus {
  available: boolean;
  version: string;
  body: string;
  downloading: boolean;
  progress: number;
  error: string;
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({
    available: false,
    version: '',
    body: '',
    downloading: false,
    progress: 0,
    error: '',
  });

  const checkForUpdates = async () => {
    try {
      const update = await check();
      if (update?.available) {
        setStatus(s => ({
          ...s,
          available: true,
          version: update.version,
          body: update.body || '',
        }));
      }
    } catch (err: any) {
      setStatus(s => ({ ...s, error: err.toString() }));
    }
  };

  const installUpdate = async () => {
    try {
      const update = await check();
      if (!update?.available) return;

      setStatus(s => ({ ...s, downloading: true, progress: 0 }));

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall(event => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            setStatus(s => ({ ...s, progress: pct }));
            break;
          case 'Finished':
            setStatus(s => ({ ...s, progress: 100 }));
            break;
        }
      });

      await relaunch();
    } catch (err: any) {
      setStatus(s => ({ ...s, downloading: false, error: err.toString() }));
    }
  };

  // Check on mount, then every 30 minutes
  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { status, checkForUpdates, installUpdate };
}