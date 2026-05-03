export type TransferState = 'idle' | 'offering' | 'answering' | 'connecting' | 'connected' | 'transferring' | 'completed' | 'error';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export type SignalingData = {
  type: 'offer' | 'answer';
  sdp: string;
};

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // bytes per second
}
