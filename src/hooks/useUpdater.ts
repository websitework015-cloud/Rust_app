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
      console.log('Checking for updates...');
      const update = await check();
      console.log('Update result:', update);

      if (update?.available) {
        console.log('Update available:', update.version);
        setStatus(s => ({
          ...s,
          available: true,
          version: update.version,
          body: update.body || '',
        }));
      } else {
        console.log('No update available');
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      setStatus(s => ({ ...s, error: err.toString() }));
    }
  };

  const installUpdate = async () => {
    try {
      console.log('Starting install...');
      const update = await check();

      if (!update?.available) {
        console.log('No update found');
        return;
      }

      setStatus(s => ({ ...s, downloading: true, progress: 0 }));

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall(event => {
        console.log('Download event:', event);
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            console.log('Download started, size:', total);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            console.log('Progress:', pct + '%');
            setStatus(s => ({ ...s, progress: pct }));
            break;
          case 'Finished':
            console.log('Download finished!');
            setStatus(s => ({ ...s, progress: 100 }));
            break;
        }
      });

      console.log('Relaunching app...');
      await relaunch();

    } catch (err: any) {
      console.error('Install failed:', err);
      setStatus(s => ({
        ...s,
        downloading: false,
        error: err.toString(),
      }));
    }
  };

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { status, checkForUpdates, installUpdate };
}