// /app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AgentDisplay } from '../components/AgentDisplay';
import { NexusBar } from '../components/NexusBar';
import { AgentUARP } from '../lib/types';

export type ListeningStatus = 'idle' | 'recording' | 'transcribing';
const USER_DATA_KEY = 'hedera-ai-user';

// A simple, beautiful background component with embedded styles
const MagicalBackground = () => (
  <div className="magical-background-container">
    <div className="magical-background-shape-1"></div>
    <div className="magical-background-shape-2"></div>
  </div>
);

export default function HederaAIPage() {
  const [activeResponse, setActiveResponse] = useState<AgentUARP | null>(null);
  const [context, setContext] = useState<any | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listeningStatus, setListeningStatus] = useState<ListeningStatus>('idle');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isInputActive, setIsInputActive] = useState(false);
  const isInitialized = useRef(false);

  // --- Core Application Logic ---
  useEffect(() => {
    const storedUserData = localStorage.getItem(USER_DATA_KEY);
    if (storedUserData) {
      setIsUserLoggedIn(true);
      if (isInitialized.current) return;
      isInitialized.current = true;
      const userData = JSON.parse(storedUserData);
      const initialContext = { goal: null, status: 'complete', collected_info: { name: userData.name, accountId: userData.accountId }, call_stack: [], history: ['Session restored.'] };
      setContext(initialContext);
      const welcomeBackResponse: AgentUARP = { id: `agent-welcome-${Date.now()}`, speech: `Welcome back, ${userData.name}! How can I assist you today?`, ui: { type: 'TEXT', props: { text: "Ready for your command." } }, context: initialContext };
      setActiveResponse(welcomeBackResponse);
      speak(welcomeBackResponse.speech!);
    } else {
      setIsUserLoggedIn(false);
      if (isInitialized.current) return;
      isInitialized.current = true;
      handleSubmit('');
    }
  }, []);

  const handleSubmit = async (prompt: string) => {
    setIsInputActive(false); 
    // Show loading state immediately for better UX
    setActiveResponse({ id: `loading-${Date.now()}`, speech: "Processing...", ui: { type: 'LOADING' }, context: context });
    setIsLoading(true);
    setInputValue('');

    try {
      const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context }) });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const uarpResponse = await response.json();
      const newResponse: AgentUARP = { id: `agent-${Date.now()}`, speech: uarpResponse.speech, ui: uarpResponse.ui, action: uarpResponse.action, context: uarpResponse.context };
      
      setActiveResponse(newResponse);
      setContext(uarpResponse.context);
      
      if (newResponse.ui?.type === 'INPUT') {
        setIsInputActive(true);
      }

      if (uarpResponse.speech) speak(uarpResponse.speech);
      if (uarpResponse.action?.type === 'SAVE_CREDENTIALS') {
        const { name, accountId, privateKey } = uarpResponse.action.payload;
        localStorage.setItem(USER_DATA_KEY, JSON.stringify({ name, accountId, privateKey }));
        setIsUserLoggedIn(true);
      }
    } catch (error) {
      console.error("Error communicating with agent:", error);
      const errorResponse: AgentUARP = { id: `error-${Date.now()}`, speech: "I'm sorry, I encountered an error. Please try again.", ui: { type: 'TEXT', props: { title: "Connection Error", text: (error as Error).message } }, context: context };
      setActiveResponse(errorResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem(USER_DATA_KEY); setIsUserLoggedIn(false); window.location.reload(); };
  const speak = (text: string) => { if (typeof window !== 'undefined' && window.speechSynthesis) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1.1; window.speechSynthesis.speak(utterance); } };
  
  // Voice Input Logic (Unchanged but correct with new UI flow)
  const recorderRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const spacebarHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startListening = async () => { if (listeningStatus !== 'idle' || recorderRef.current) return; try { setIsInputActive(true); const RecordRTC = (await import('recordrtc')).default; const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaStreamRef.current = stream; recorderRef.current = new RecordRTC.RecordRTCPromisesHandler(stream, { type: 'audio', mimeType: 'audio/webm' }); await recorderRef.current.startRecording(); setListeningStatus('recording'); } catch (err) { console.error("Error starting recorder:", err); setListeningStatus('idle'); setIsInputActive(false); recorderRef.current = null; mediaStreamRef.current = null; } };
  const stopListening = async () => { if (listeningStatus !== 'recording' || !recorderRef.current) return; try { setListeningStatus('transcribing'); const dataUrl = await recorderRef.current.stopRecording(); const audioBlob = await fetch(dataUrl).then(res => res.blob()); if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; } recorderRef.current = null; const formData = new FormData(); formData.append('file', audioBlob, 'recording.webm'); const response = await fetch('/api/transcribe', { method: 'POST', body: formData }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.details || errorData.error || 'Transcription failed'); } const result = await response.json(); if (result.text && result.text.trim()) { handleSubmit(result.text); } else { console.log("Transcription successful but returned no text."); } } catch (error) { console.error("Error during transcription:", (error as Error).message); } finally { setListeningStatus('idle'); setIsInputActive(false); } };
  useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space' && listeningStatus === 'idle' && !isLoading && !e.repeat) { const target = e.target as HTMLElement; if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return; e.preventDefault(); if (!spacebarHoldTimerRef.current) { spacebarHoldTimerRef.current = setTimeout(() => startListening(), 200); } } }; const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); if (listeningStatus === 'recording') { stopListening(); } if (spacebarHoldTimerRef.current) { clearTimeout(spacebarHoldTimerRef.current); spacebarHoldTimerRef.current = null; } } }; window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); if (spacebarHoldTimerRef.current) clearTimeout(spacebarHoldTimerRef.current); }; }, [listeningStatus, isLoading]);
  
  const isAgentRequestingInput = activeResponse?.ui?.type === 'INPUT';

  const styles = `
    @keyframes pulse-slow {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .main-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      color: #1e293b; /* slate-800 */
      overflow: hidden;
      position: relative;
      /* Add padding to prevent content from going under the always-visible NexusBar */
      padding-bottom: 8rem; 
    }
    .magical-background-container {
      position: absolute; top: 0; right: 0; bottom: 0; left: 0;
      z-index: -20; overflow: hidden; background-color: #f8fafc; /* slate-50 */
    }
    .magical-background-shape-1 {
      position: absolute; top: -20vh; left: -20vw; width: 70vw; height: 70vh;
      background-image: linear-gradient(to bottom right, #cffafe, #dbeafe);
      border-radius: 9999px; filter: blur(64px); /* blur-4xl */ opacity: 0.6;
      animation: pulse-slow 20s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .magical-background-shape-2 {
      position: absolute; bottom: -20vh; right: -20vw; width: 70vw; height: 70vh;
      background-image: linear-gradient(to bottom right, #f3e8ff, #fbcfe8);
      border-radius: 9999px; filter: blur(64px); /* blur-4xl */ opacity: 0.5;
      animation: pulse-slow 20s cubic-bezier(0.4, 0, 0.6, 1) infinite; animation-delay: -7s;
    }
    .logout-container {
      position: absolute; top: 1rem; right: 1rem; z-index: 20;
    }
    .logout-button {
      padding: 0.5rem 1rem; background-color: rgba(255, 255, 255, 0.5);
      color: #475569; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      font-size: 0.75rem; border-radius: 9999px; transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: none; cursor: pointer;
    }
    .logout-button:hover { background-color: rgba(255, 255, 255, 0.8); }
    .input-bar-container {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 1.5rem 1rem; background-color: transparent; z-index: 20;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <main className="main-container">
        <MagicalBackground />
        {isUserLoggedIn && (
          <div className="logout-container">
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        )}
        
        <AnimatePresence>
          {activeResponse && (
            <AgentDisplay
              key={activeResponse.id}
              response={activeResponse}
              onSubmit={handleSubmit}
              isInputActive={isInputActive || isAgentRequestingInput}
            />
          )}
        </AnimatePresence>

        {/* --- THE CRITICAL FIX --- */}
        {/* The NexusBar is now ALWAYS rendered unless the app itself is loading the response. */}
        {/* This ensures it's visible when the AgentDisplay prompts for input. */}
        <div className="input-bar-container">
            <NexusBar
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) handleSubmit(inputValue); }}
              isLoading={isLoading}
              listeningStatus={listeningStatus}
              onFocus={() => setIsInputActive(true)}
              onBlur={() => setIsInputActive(false)}
            />
        </div>
      </main>
    </>
  );
}