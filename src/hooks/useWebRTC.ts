import { useState, useRef, useCallback, useEffect } from 'react';
import { TransferState, FileMetadata, SignalingData, TransferProgress } from '../types';

const CHUNK_SIZE = 16384; // 16KB

export function useWebRTC() {
  const [state, setState] = useState<TransferState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress>({ bytesTransferred: 0, totalBytes: 0, speed: 0 });
  const [remoteFile, setRemoteFile] = useState<FileMetadata | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const receivedChunksRef = useRef<Uint8Array[]>([]);
  const startTimeRef = useRef<number>(0);

  const [localSdp, setLocalSdp] = useState<string | null>(null);

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
            setRemoteFile(message.payload);
            receivedChunksRef.current = [];
            setProgress({ bytesTransferred: 0, totalBytes: message.payload.size, speed: 0 });
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

        if (remoteFile && bytesTransferred >= remoteFile.size) {
          const blob = new Blob(receivedChunksRef.current, { type: remoteFile.type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = remoteFile.name;
          a.click();
          URL.revokeObjectURL(url);
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
        resolve(JSON.stringify({ type: 'offer', sdp: pc.localDescription?.sdp }));
      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            resolve(JSON.stringify({ type: 'offer', sdp: pc.localDescription?.sdp }));
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
        resolve(JSON.stringify({ type: 'answer', sdp: pc.localDescription?.sdp }));
      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            resolve(JSON.stringify({ type: 'answer', sdp: pc.localDescription?.sdp }));
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
