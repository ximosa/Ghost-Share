import { useState, useRef, useCallback, useEffect } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { TransferState, FileMetadata, TransferProgress } from '../types';

const CHUNK_SIZE = 16384; // 16KB

export function useWebRTC() {
  const [state, setState] = useState<TransferState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress>({ bytesTransferred: 0, totalBytes: 0, speed: 0 });
  const [remoteFile, setRemoteFile] = useState<FileMetadata | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const remoteFileRef = useRef<FileMetadata | null>(null);
  const receivedChunksRef = useRef<Uint8Array[]>([]);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    receivedChunksRef.current = [];
    remoteFileRef.current = null;
    setPeerId(null);
  }, []);

  const triggerDownload = useCallback((chunks: Uint8Array[], metadata: FileMetadata) => {
    if (chunks.length === 0) return;
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = metadata.name;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  useEffect(() => {
    const handleManualDownload = () => {
      if (receivedChunksRef.current.length > 0 && remoteFileRef.current) {
        triggerDownload(receivedChunksRef.current, remoteFileRef.current);
      }
    };
    window.addEventListener('trigger-manual-download', handleManualDownload);
    return () => window.removeEventListener('trigger-manual-download', handleManualDownload);
  }, [triggerDownload]);

  const setupConnection = (conn: DataConnection) => {
    connRef.current = conn;

    conn.on('open', () => {
      setState('connected');
    });

    conn.on('data', (data: any) => {
      if (typeof data === 'string') {
        try {
          const message = JSON.parse(data);
          if (message.type === 'metadata') {
            const metadata = message.payload;
            setRemoteFile(metadata);
            remoteFileRef.current = metadata;
            receivedChunksRef.current = [];
            setProgress({ bytesTransferred: 0, totalBytes: metadata.size, speed: 0 });
            startTimeRef.current = Date.now();
            setState('transferring');
          }
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      } else if (data instanceof ArrayBuffer) {
        receivedChunksRef.current.push(new Uint8Array(data));
        
        const bytesTransferred = receivedChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const now = Date.now();
        const duration = (now - startTimeRef.current) / 1000;
        const speed = duration > 0 ? bytesTransferred / duration : 0;

        setProgress(prev => ({
          ...prev,
          bytesTransferred,
          speed
        }));

        if (remoteFileRef.current && bytesTransferred >= remoteFileRef.current.size) {
          triggerDownload(receivedChunksRef.current, remoteFileRef.current);
          setState('completed');
        }
      }
    });

    conn.on('close', () => {
      setState('idle');
    });

    conn.on('error', (err) => {
      setError('Error en la conexión');
      console.error(err);
    });
  };

  const initPeer = useCallback((id?: string) => {
    cleanup();
    const peer = new Peer();
    
    peer.on('open', (newId) => {
      setPeerId(newId);
      if (id) {
        // If we have an ID to connect to, do it automatically
        const conn = peer.connect(id, { label: 'file-transfer', reliable: true });
        setupConnection(conn);
        setState('connecting');
      }
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      setError('Error de red: ' + err.type);
      console.error(err);
    });

    peerRef.current = peer;
  }, [cleanup]);

  const sendFile = async (file: File) => {
    if (!connRef.current) return;

    const metadata = {
      type: 'metadata',
      payload: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    connRef.current.send(JSON.stringify(metadata));
    setState('transferring');
    setProgress({ bytesTransferred: 0, totalBytes: file.size, speed: 0 });
    startTimeRef.current = Date.now();

    const buffer = await file.arrayBuffer();
    let offset = 0;

    const sendChunk = () => {
      while (offset < file.size) {
        // @ts-ignore
        if (connRef.current!.dataChannel.bufferedAmount > CHUNK_SIZE * 64) {
          setTimeout(sendChunk, 50);
          return;
        }

        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        connRef.current!.send(chunk);
        offset += CHUNK_SIZE;

        const bytesTransferred = Math.min(offset, file.size);
        const now = Date.now();
        const duration = (now - startTimeRef.current) / 1000;
        const speed = duration > 0 ? bytesTransferred / duration : 0;

        setProgress({ bytesTransferred, totalBytes: file.size, speed });

        if (offset >= file.size) {
          setState('completed');
        }
      }
    };

    sendChunk();
  };

  return {
    state,
    setState,
    error,
    progress,
    remoteFile,
    peerId,
    initPeer,
    sendFile,
    cleanup
  };
}
