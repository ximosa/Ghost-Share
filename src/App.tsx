/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Scanner } from './components/Scanner';
import { QRDisplay } from './components/QRDisplay';
import { ProgressView } from './components/ProgressView';
import { Send, Download, Ghost, ShieldCheck, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const {
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
  } = useWebRTC();

  const [activeQR, setActiveQR] = useState<{ value: string; title: string; description: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleSendClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setPendingFile(file);
        handleCreateOffer();
      }
    };
    input.click();
  };

  const handleCreateOffer = async () => {
    try {
      const offer = await createOffer();
      setActiveQR({
        value: offer,
        title: "Escanea para Recibir",
        description: "Muestra este QR al destinatario para iniciar la conexión P2P"
      });
      setState('offering');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiveClick = () => {
    setShowScanner(true);
    setState('answering');
  };

  const onScan = async (data: string) => {
    setShowScanner(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'offer') {
        const answer = await createAnswer(data);
        setActiveQR({
          value: answer,
          title: "Escanea para Confirmar",
          description: "El emisor debe escanear este código para cerrar el apretón de manos"
        });
      } else if (parsed.type === 'answer') {
        setActiveQR(null);
        await acceptAnswer(data);
      }
    } catch (err) {
      console.error("Scan error", err);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && state === 'idle') {
      setPendingFile(file);
      handleCreateOffer();
    }
  }, [state]);

  const reset = () => {
    cleanup();
    setState('idle');
    setPendingFile(null);
    setActiveQR(null);
    setShowScanner(false);
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
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          P2P Stealth Mode
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
                <h2 className="text-4xl font-bold mb-4 tracking-tight">Comparte archivos sin dejar rastro.</h2>
                <p className="text-gray-400 text-lg">Transferencia directa P2P mediante códigos QR. Sin servidores, sin límites de tamaño, cifrado de extremo a extremo.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleSendClick}
                  className="group relative p-8 bg-white text-black rounded-3xl overflow-hidden transition-transform active:scale-95"
                >
                  <Send className="w-8 h-8 mb-4" />
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Enviar</h3>
                    <p className="text-sm opacity-60">Selecciona o suelta un archivo</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                    <Send className="w-24 h-24 rotate-12" />
                  </div>
                </button>

                <button
                  onClick={handleReceiveClick}
                  className="group relative p-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl overflow-hidden transition-all active:scale-95"
                >
                  <Download className="w-8 h-8 mb-4 text-white" />
                  <div className="text-left">
                    <h3 className="text-xl font-bold">Recibir</h3>
                    <p className="text-sm text-gray-400">Escanea el código del emisor</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-5 transition-opacity">
                    <Download className="w-24 h-24 -rotate-12" />
                  </div>
                </button>
              </div>

              <div className="pt-12 flex flex-wrap items-center justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Secure WebRTC
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <XCircle className="w-4 h-4" /> No Server Logs
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                  <FileText className="w-4 h-4" /> Instant Transfer
                </div>
              </div>
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
              {pendingFile ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-gray-400">Listo para enviar <b>{pendingFile.name}</b></p>
                  <button
                    onClick={() => sendFile(pendingFile)}
                    className="px-12 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                  >
                    Iniciar Envío
                  </button>
                </div>
              ) : (
                <p className="text-gray-400">Esperando archivo del emisor...</p>
              )}
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

          {state === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-12 h-12 animate-spin text-gray-500" />
              <p className="text-gray-400 font-mono">Estableciendo enlace P2P...</p>
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
            onClose={() => setActiveQR(null)}
          />
        )}
        {showScanner && (
          <Scanner onScan={onScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-6 text-center text-[10px] uppercase tracking-widest text-gray-600 font-mono">
        Made for Secure Exchange • v1.0.0
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
