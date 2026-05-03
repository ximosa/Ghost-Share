import { useState, useRef, useCallback, useEffect } from 'react';
import { TransferState, FileMetadata, SignalingData, TransferProgress } from '../types';

const CHUNK_SIZE = 16384; // 16KB

// Helper to reduce SDP size for QR codes
const minifySdp = (sdp: string) => {
  return sdp
    .split('\r\n')
    .filter(line => {
      // Remove lines that aren't essential for a basic P2P connection
      return !line.startsWith('a=extmap') && 
             !line.startsWith('a=fmtp') && 
             !line.startsWith('a=rtcp') && 
             !line.startsWith('a=ssrc') &&
             !line.startsWith('a=msid');
    })
    .join('\r\n');
};

export function useWebRTC() {
  const [state, setState] = useState<TransferState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress>({ bytesTransferred: 0, totalBytes: 0, speed: 0 });
  const [remoteFile, setRemoteFile] = useState<FileMetadata | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const receivedChunksRef = useRef<Uint8Array[]>([]);
  const remoteFileRef = useRef<FileMetadata | null>(null);
  const startTimeRef = useRef<number>(0);
  const [localSdp, setLocalSdp] = useState<string | null>(null);

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
    
    // Delay revocation to ensure the browser has started the download
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  // Support manual download trigger from UI
  useEffect(() => {
    const handleManualDownload = () => {
      if (receivedChunksRef.current.length > 0 && remoteFileRef.current) {
        triggerDownload(receivedChunksRef.current, remoteFileRef.current);
      }
    };
    window.addEventListener('trigger-manual-download', handleManualDownload);
    return () => window.removeEventListener('trigger-manual-download', handleManualDownload);
  }, [triggerDownload]);

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    receivedChunksRef.current = [];
    remoteFileRef.current = null;
  }, []);

  const createPeerConnection = useCallback(() => {
    cleanup();
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setState('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setError('Conexión perdida');
        setState('error');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup]);
  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setState('connected');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setState('idle');
    };


    channel.onmessage = (event) => {
      const data = event.data;

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
    };

    dataChannelRef.current = channel;
  };

  const createOffer = async () => {
    const pc = createPeerConnection();
    const dc = pc.createDataChannel('file-transfer', { ordered: true });
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete before showing the SDP in QR
    // This is because we don't have a signaling server to trickle ICE
    return new Promise<string>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(JSON.stringify({ type: 'offer', sdp: minifySdp(pc.localDescription?.sdp || '') }));
      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            resolve(JSON.stringify({ type: 'offer', sdp: minifySdp(pc.localDescription?.sdp || '') }));
          }
        };
      }
    });
  };

  const createAnswer = async (offerSdp: string) => {
    const pc = createPeerConnection();
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    const offer = JSON.parse(offerSdp);
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer.sdp }));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return new Promise<string>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(JSON.stringify({ type: 'answer', sdp: minifySdp(pc.localDescription?.sdp || '') }));
      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            resolve(JSON.stringify({ type: 'answer', sdp: minifySdp(pc.localDescription?.sdp || '') }));
          }
        };
      }
    });
  };

  const acceptAnswer = async (answerSdp: string) => {
    const answer = JSON.parse(answerSdp);
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer.sdp }));
      setState('connecting');
    }
  };

  const sendFile = async (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      setError('La conexión no está lista');
      return;
    }

    const metadata = {
      type: 'metadata',
      payload: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    dataChannelRef.current.send(JSON.stringify(metadata));
    setState('transferring');
    setProgress({ bytesTransferred: 0, totalBytes: file.size, speed: 0 });
    startTimeRef.current = Date.now();

    const buffer = await file.arrayBuffer();
    let offset = 0;

    const sendChunk = () => {
      while (offset < file.size) {
        if (dataChannelRef.current!.bufferedAmount > CHUNK_SIZE * 64) {
          // Wait if buffer is getting full
          setTimeout(sendChunk, 50);
          return;
        }

        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        dataChannelRef.current!.send(chunk);
        offset += CHUNK_SIZE;

        const bytesTransferred = Math.min(offset, file.size);
        const now = Date.now();
        const duration = (now - startTimeRef.current) / 1000;
        const speed = duration > 0 ? bytesTransferred / duration : 0;

        setProgress({
          bytesTransferred,
          totalBytes: file.size,
          speed
        });

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
    createOffer,
    createAnswer,
    acceptAnswer,
    sendFile,
    cleanup
  };
}
