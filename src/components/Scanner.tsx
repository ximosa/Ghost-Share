import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error(err));
        }
      },
      (error) => {
        // Just warning, it scans continuously
        // console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div id="reader" className="w-full overflow-hidden rounded-xl border-4 border-white/10" />
        <button
          onClick={onClose}
          className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-2 mx-auto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
