// /components/NexusBar.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChangeEvent, FormEvent } from 'react';
import { ListeningStatus } from '../app/page';

// --- Prop Types ---
interface NexusBarProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  listeningStatus: ListeningStatus;
  onFocus: () => void;
  onBlur: () => void;
}

// --- Helper Components with embedded styles ---

const LoadingIndicator = () => (
  <div className="loading-indicator">
    <svg className="loading-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Processing...
  </div>
);

const ListeningIndicator = ({ status }: { status: ListeningStatus }) => {
  const getText = () => {
    switch (status) {
      case 'recording': return 'Listening...';
      case 'transcribing': return 'Transcribing...';
      default: return '';
    }
  };
  return (
    <div className="listening-indicator">
      <span className="listening-text-pulse">{getText()}</span>
    </div>
  );
};

// --- The Main Component: The Nexus Bar ---
export const NexusBar = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  listeningStatus,
  onFocus,
  onBlur,
}: NexusBarProps) => {
  const isListening = listeningStatus !== 'idle';

  const renderContent = () => {
    if (isLoading) {
      return <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoadingIndicator /></motion.div>;
    }
    if (isListening) {
      return <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ListeningIndicator status={listeningStatus} /></motion.div>;
    }
    return (
      <motion.form key="input-form" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Command the network..."
          className="nexus-input"
          autoFocus
          disabled={isLoading}
        />
      </motion.form>
    );
  };
  
  const styles = `
    @keyframes pulse-glow {
      50% { opacity: .6; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .nexus-bar-container {
      position: relative;
      width: 100%;
      max-width: 48rem; /* max-w-3xl */
      margin-left: auto;
      margin-right: auto;
    }
    .nexus-bar {
      position: relative;
      width: 100%;
      height: 4.5rem; /* h-18 */
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.9);
      background-color: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: box-shadow 0.4s ease-in-out;
      box-shadow: 0 20px 40px -15px rgba(129, 140, 248, 0.3); /* shadow-2xl shadow-indigo-200/50 */
    }
    .nexus-bar:focus-within {
      box-shadow: 0 0 50px 10px rgba(99, 102, 241, 0.35);
    }
    ${isListening ? `
    .nexus-bar {
      box-shadow: 0 0 60px 15px rgba(59, 130, 246, 0.4);
    }
    ` : ''}

    .content-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* Loading Indicator */
    .loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      height: 100%;
      font-size: 1rem;
      color: #475569; /* slate-600 */
    }
    .loading-spinner {
      animation: spin 1s linear infinite;
      height: 1.25rem;
      width: 1.25rem;
      color: #4f46e5; /* indigo-600 */
    }
    /* Listening Indicator */
    .listening-indicator {
      width: 100%;
      height: 100%;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-size: 1.25rem;
      letter-spacing: 0.05em;
      color: transparent;
      background-clip: text;
      -webkit-background-clip: text;
      background-image: linear-gradient(to right, #4f46e5, #7c3aed);
    }
    .listening-text-pulse {
      animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    /* Main Input */
    .nexus-input {
      width: 100%;
      height: 100%;
      background-color: transparent;
      color: #1e293b; /* slate-800 */
      padding-left: 2rem;
      padding-right: 2rem;
      font-size: 1.25rem; /* text-xl */
      font-weight: 400;
      border: none;
    }
    .nexus-input::placeholder {
      color: #94a3b8; /* slate-400 */
    }
    .nexus-input:focus {
      outline: none;
    }
    .nexus-input:disabled {
      cursor: not-allowed;
    }
  `;
  
  return (
    <>
      <style>{styles}</style>
      <div className="nexus-bar-container">
        <div className="nexus-bar">
          <div className="content-wrapper">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};