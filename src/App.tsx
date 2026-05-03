/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Scanner } from './components/Scanner';
import { QRDisplay } from './components/QRDisplay';
import { ProgressView } from './components/ProgressView';
import { Send, Download, Ghost, ShieldCheck, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
    peerId,
    initPeer,
    sendFile,
    cleanup,
    isOnline
  } = useWebRTC();

  const [activeQR, setActiveQR] = useState<{ value: string; title: string; description: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Auto-connect if ID is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      initPeer(id);
      setState('connecting');
    }
  }, [initPeer, setState]);

  // Update share link when peerId is available
  useEffect(() => {
    if (peerId && state === 'offering') {
      const link = `${window.location.origin}${window.location.pathname}?id=${peerId}`;
      setShareLink(link);
      setActiveQR({
        value: link,
        title: "Enlace para Recibir",
        description: "Envía este enlace al receptor o escanea el código"
      });
    }
  }, [peerId, state]);

  // Auto-send when connected
  useEffect(() => {
    if (state === 'connected' && pendingFile) {
      sendFile(pendingFile);
    }
  }, [state, pendingFile, sendFile]);

  const handleSendClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setPendingFile(file);
        initPeer(); // Generate a new ID for the sender
        setState('offering');
      }
    };
    input.click();
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && state === 'idle') {
      setPendingFile(file);
      initPeer();
      setState('offering');
    }
  }, [state, initPeer, setState]);

  const reset = () => {
    cleanup();
    setState('idle');
    setPendingFile(null);
    setActiveQR(null);
  };

  return (
    <div 
      className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white selection:text-black"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Ghost className="text-black w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Ghost-Share</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
          {isOnline ? 'En Línea' : 'Conectando...'}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg space-y-6"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 tracking-tight">Envía archivos en un segundo.</h2>
                <p className="text-gray-400 text-lg">Directo, seguro y sin registros. Selecciona un archivo y comparte el enlace.</p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSendClick}
                  className="group relative w-full p-12 bg-white text-black rounded-3xl overflow-hidden transition-transform active:scale-95 flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mb-2">
                    <Send className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold">Enviar Archivo</h3>
                    <p className="text-sm opacity-60">Selecciona o suelta un archivo aquí</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                    <Send className="w-32 h-32 rotate-12" />
                  </div>
                </button>
              </div>

              <div className="pt-12 flex flex-wrap items-center justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> WebRTC Directo
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <XCircle className="w-4 h-4" /> Sin Servidores
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <FileText className="w-4 h-4" /> Cifrado P2P
                </div>
              </div>
            </motion.div>
          )}

          {state === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-white animate-spin mb-4" />
              <p className="text-gray-400 font-mono">Conectando dispositivos...</p>
            </motion.div>
          )}

          {state === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4 ring-8 ring-green-500/5">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold">¡Conectado!</h2>
              <p className="text-gray-400">Iniciando transferencia segura...</p>
            </motion.div>
          )}

          {(state === 'transferring' || state === 'completed') && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex justify-center"
            >
              <ProgressView 
                progress={progress} 
                file={pendingFile || remoteFile} 
                direction={pendingFile ? 'sending' : 'receiving'} 
                onReset={reset}
                isCompleted={state === 'completed'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {activeQR && (
          <QRDisplay 
            value={activeQR.value} 
            title={activeQR.title} 
            description={activeQR.description} 
            onClose={() => {
              setActiveQR(null);
              reset();
            }}
          >
            {shareLink && (
              <div className="mt-4 w-full space-y-4">
                <div className="p-3 bg-white/10 rounded-xl break-all text-[10px] font-mono text-gray-300 border border-white/10">
                  {shareLink}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    alert("¡Enlace copiado!");
                  }}
                  className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Copiar Enlace para enviar
                </button>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center font-medium leading-relaxed">
                  ⚠️ NO CIERRES NI MINIMICES esta pestaña en el móvil hasta que el ordenador esté conectado.
                </div>
              </div>
            )}
          </QRDisplay>
        )}
        {showScanner && (
          <Scanner onScan={onScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-6 text-center text-[10px] uppercase tracking-widest text-gray-600 font-mono">
        Creado para Intercambio Seguro • v1.1.0
      </footer>

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full text-sm font-medium animate-in slide-in-from-bottom duration-300">
          {error}
        </div>
      )}
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
  </svg>
)
