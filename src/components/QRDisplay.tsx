import { QRCodeSVG } from 'qrcode.react';
import React from 'react';

interface QRDisplayProps {
  value: string;
  title: string;
  description: string;
  onClose: () => void;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ value, title, description, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 flex flex-col items-center max-w-sm w-full">
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400 text-center mb-8">{description}</p>
        
        <div className="p-4 bg-white rounded-2xl mb-8">
          <QRCodeSVG value={value} size={256} className="w-full h-auto" />
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
