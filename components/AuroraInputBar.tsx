// /components/AuroraInputBar.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChangeEvent, FormEvent } from 'react';
import { ListeningStatus } from '../app/page'; // Import the type

// --- Prop Types ---
interface AuroraInputBarProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  listeningStatus: ListeningStatus;
}

// --- Helper: Loading Spinner SVG (unchanged) ---
const LoadingSpinner = () => ( <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> );

// --- The Main Component ---
export const AuroraInputBar = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  listeningStatus,
}: AuroraInputBarProps) => {

  const isListening = listeningStatus !== 'idle';

  // --- UPDATED: Map simplified status to display text ---
  const getStatusText = () => {
    switch (listeningStatus) {
      case 'recording': return 'Recording...';
      case 'transcribing': return 'Transcribing...';
      default: return '';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center justify-center gap-3 w-full h-14 text-sm text-gray-200">
          <LoadingSpinner />
          Processing Agent Request...
        </motion.div>
      );
    }

    if (isListening) {
      return (
        <motion.div key="listening" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full rounded-full flex items-center justify-center text-white font-medium text-lg tracking-wider">
          <span className="animate-pulse">{getStatusText()}</span>
        </motion.div>
      );
    }
    
    // Default state: The input form
    return (
      <motion.form key="input-form" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Type or hold spacebar to talk..."
          className="w-full h-14 bg-transparent text-white placeholder-gray-300 focus:outline-none px-6"
          autoFocus
          disabled={isLoading}
        />
      </motion.form>
    );
  };
  
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div 
        className={`
          relative w-full h-14 rounded-full overflow-hidden
          border border-white/10
          bg-gradient-to-r from-cyan-500/80 to-blue-500/80
          focus-within:bg-gray-800/70 focus-within:from-transparent focus-within:to-transparent
          backdrop-blur-lg
          transition-all duration-500 ease-in-out
          ${isListening 
             ? 'shadow-[0_0_60px_15px_rgba(0,255,255,0.4)]' // The large, seamless glow
             : 'shadow-2xl shadow-black/50'
          }
        `}
      >
        <div className="relative w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};