import React from 'react';
import { TransferProgress, FileMetadata } from '../types';
import { ArrowDown, ArrowUp, CheckCircle2, Loader2 } from 'lucide-react';

interface ProgressViewProps {
  progress: TransferProgress;
  file: FileMetadata | File | null;
  direction: 'sending' | 'receiving';
  onReset: () => void;
  isCompleted: boolean;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ progress, file, direction, onReset, isCompleted }) => {
  const percentage = Math.min(100, Math.floor((progress.bytesTransferred / progress.totalBytes) * 100)) || 0;
  const speedMB = (progress.speed / (1024 * 1024)).toFixed(2);
  const transferredMB = (progress.bytesTransferred / (1024 * 1024)).toFixed(2);
  const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(2);

  const fileName = file instanceof File ? file.name : file?.name || 'Archivo';

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/10 w-full max-w-md">
      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
        {isCompleted ? (
          <CheckCircle2 className="w-10 h-10 text-green-400 animate-in zoom-in" />
        ) : (
          <div className="relative">
             {direction === 'sending' ? (
                <ArrowUp className="w-10 h-10 text-blue-400" />
             ) : (
                <ArrowDown className="w-10 h-10 text-purple-400" />
             )}
             {!isCompleted && <Loader2 className="absolute -top-1 -right-1 w-4 h-4 text-white animate-spin" />}
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 truncate max-w-full">{fileName}</h3>
      <p className="text-sm text-gray-400 mb-8">
        {isCompleted ? 'Transferencia completada' : direction === 'sending' ? 'Enviando...' : 'Recibiendo...'}
      </p>

      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="w-full flex justify-between text-xs font-mono text-gray-400 mb-8">
        <span>{percentage}%</span>
        <span>{transferredMB} MB / {totalMB} MB</span>
        <span>{speedMB} MB/s</span>
      </div>

      <button
        onClick={onReset}
        className="w-full py-4 px-6 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
      >
        {isCompleted ? 'Transferir otro' : 'Cancelar'}
      </button>
    </div>
  );
};
