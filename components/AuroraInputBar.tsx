// /components/AuroraInputBar.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChangeEvent, FormEvent } from 'react';
import { ListeningStatus } from '../app/page';

// --- Prop Types (Unchanged) ---
interface AuroraInputBarProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  listeningStatus: ListeningStatus;
}

// --- Helper Components with embedded styles ---

const LoadingIndicator = () => (
  <div className="loading-indicator">
    <svg className="loading-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Processing Request...
  </div>
);

const ListeningIndicator = ({ status }: { status: ListeningStatus }) => {
  const getText = () => {
    switch (status) {
      case 'recording': return 'Listening...';
      case 'transcribing': return 'Thinking...';
      default: return '';
    }
  };
  return (
    <div className="listening-indicator">
      <span className="listening-text-pulse">{getText()}</span>
    </div>
  );
};

// --- The Main Component ---
export const AuroraInputBar = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  listeningStatus,
}: AuroraInputBarProps) => {
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
          placeholder="Ask Hedera AI anything..."
          className="main-input"
          autoFocus
          disabled={isLoading}
        />
      </motion.form>
    );
  };
  
  const styles = `
    @keyframes pulse {
      50% { opacity: .5; }
    }
    .aurora-bar-container {
      position: relative;
      width: 100%;
      max-width: 42rem; /* max-w-2xl */
      margin-left: auto;
      margin-right: auto;
    }
    .aurora-bar {
      position: relative;
      width: 100%;
      height: 4rem; /* h-16 */
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.8);
      background-color: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: all 0.5s ease-in-out;
      box-shadow: ${isListening 
        ? '0 0 60px 15px rgba(59, 130, 246, 0.3)' 
        : '0 25px 50px -12px rgba(199, 210, 254, 0.5)'}; /* shadow-2xl shadow-blue-200/50 */
    }
    .aurora-bar:focus-within {
      box-shadow: 0 0 40px 10px rgba(99, 102, 241, 0.2);
    }
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
      font-size: 0.875rem;
      color: #475569; /* slate-600 */
    }
    .loading-spinner {
      animation: spin 1s linear infinite;
      height: 1.25rem;
      width: 1.25rem;
      color: #3b82f6; /* blue-500 */
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
      font-size: 1.125rem;
      letter-spacing: 0.05em;
      color: transparent;
      background-clip: text;
      -webkit-background-clip: text;
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6);
    }
    .listening-text-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    /* Main Input */
    .main-input {
      width: 100%;
      height: 4rem;
      background-color: transparent;
      color: #334155; /* slate-700 */
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      font-size: 1.125rem;
      border: none;
    }
    .main-input::placeholder {
      color: #94a3b8; /* slate-400 */
    }
    .main-input:focus {
      outline: none;
    }
    .main-input:disabled {
      cursor: not-allowed;
    }
  `;
  
  return (
    <>
      <style>{styles}</style>
      <div className="aurora-bar-container">
        <div className="aurora-bar">
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