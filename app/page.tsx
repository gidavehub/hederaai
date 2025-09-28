// /app/page.tsx
'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UIModalPresenter } from '../components/UIModalPresenter';
import { AuroraInputBar } from '../components/AuroraInputBar';
import { UILayoutData, UIComponentData } from '../lib/types';

export type ListeningStatus = 'idle' | 'recording' | 'transcribing';
const USER_DATA_KEY = 'hedera-ai-user';

export default function HederaAIPage() {
  const [activeResponse, setActiveResponse] = useState<AgentUARP | null>(null);
  const [context, setContext] = useState<any | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listeningStatus, setListeningStatus] = useState<ListeningStatus>('idle');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    const storedUserData = localStorage.getItem(USER_DATA_KEY);
    if (storedUserData) {
      setIsUserLoggedIn(true);
      if (isInitialized.current) return;
      isInitialized.current = true;
      const userData = JSON.parse(storedUserData);
      const initialContext = { 
        goal: null, 
        status: 'complete', 
        collected_info: { name: userData.name, accountId: userData.accountId }, 
        call_stack: [], 
        history: ['Session restored.'], 
      };
      setContext(initialContext);
      const welcomeBackResponse: AgentUARP = { 
        id: `agent-welcome-${Date.now()}`, 
        speech: `Welcome back, ${userData.name}! How can I help you today?`, 
        ui: { type: 'TEXT', props: { text: "Ready for your command." } }, 
        context: initialContext 
      };
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
    if (activeResponse) setActiveResponse(null); 
    setIsLoading(true); 
    setInputValue(''); 
    try { 
      const response = await fetch('/api/agent', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ prompt, context }), 
      }); 
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`); 
      const uarpResponse = await response.json(); 
      const newResponse: AgentUARP = { 
        id: `agent-${Date.now()}`, 
        speech: uarpResponse.speech, 
        ui: uarpResponse.ui, 
        action: uarpResponse.action, 
        context: uarpResponse.context, 
      }; 
      setActiveResponse(newResponse); 
      setContext(uarpResponse.context); 
      if (uarpResponse.speech) speak(uarpResponse.speech); 
      if (uarpResponse.action?.type === 'SAVE_CREDENTIALS') { 
        const { name, accountId, privateKey } = uarpResponse.action.payload; 
        localStorage.setItem(USER_DATA_KEY, JSON.stringify({ name, accountId, privateKey })); 
        setIsUserLoggedIn(true); 
      } 
    } catch (error) { 
      console.error("Error communicating with agent:", error); 
      const errorResponse: AgentUARP = { 
        id: `error-${Date.now()}`, 
        speech: "I'm sorry, I encountered an error. Please try again.", 
        ui: { type: 'TEXT', props: { title: "Connection Error", text: (error as Error).message } }, 
        context: context, 
      }; 
      setActiveResponse(errorResponse); 
    } finally { 
      setIsLoading(false); 
    } 
  };

  const handleLogout = () => { 
    localStorage.removeItem(USER_DATA_KEY); 
    setIsUserLoggedIn(false); 
    window.location.reload(); 
  };

  const speak = (text: string) => { 
    if (typeof window !== 'undefined' && window.speechSynthesis) { 
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text); 
      window.speechSynthesis.speak(utterance); 
    } 
  };

  const recorderRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // ✅ new ref
  const spacebarHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startListening = async () => {
    if (listeningStatus !== 'idle' || recorderRef.current) return;
    try {
      const RecordRTC = (await import('recordrtc')).default;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Save reference to stream
      mediaStreamRef.current = stream;

      recorderRef.current = new RecordRTC.RecordRTCPromisesHandler(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
      });
      await recorderRef.current.startRecording();
      setListeningStatus('recording');
    } catch (err) {
      console.error("Error starting recorder:", err);
      setListeningStatus('idle');
      recorderRef.current = null;
      mediaStreamRef.current = null;
    }
  };

  const stopListening = async () => {
    if (listeningStatus !== 'recording' || !recorderRef.current) return;
    
    try {
      setListeningStatus('transcribing');

      const dataUrl = await recorderRef.current.stopRecording();
      const audioBlob = await fetch(dataUrl).then(res => res.blob());

      // ✅ Stop and clean up stream safely
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      recorderRef.current = null;

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Transcription failed');
      }

      const result = await response.json();

      if (result.text && result.text.trim()) {
        handleSubmit(result.text);
      } else {
        console.log("Transcription was successful but returned no text.");
      }

    } catch (error) {
      console.error("Error during transcription:", (error as Error).message);
    } finally {
      setListeningStatus('idle');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && listeningStatus === 'idle' && !isLoading && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (!spacebarHoldTimerRef.current) {
          spacebarHoldTimerRef.current = setTimeout(() => startListening(), 500);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (listeningStatus === 'recording') {
          stopListening();
        }
        if (spacebarHoldTimerRef.current) {
          clearTimeout(spacebarHoldTimerRef.current);
          spacebarHoldTimerRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (spacebarHoldTimerRef.current) clearTimeout(spacebarHoldTimerRef.current);
    };
  }, [listeningStatus, isLoading]);

  return (
    <main className="flex flex-col h-screen w-full bg-black text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-blue-900/40"></div>
      {isUserLoggedIn && (
        <div className="absolute top-4 right-4 z-20">
          <button onClick={handleLogout} className="px-3 py-1 bg-red-600/80 hover:bg-red-500 text-xs rounded-full">Logout</button>
        </div>
      )}
      <AnimatePresence>
        {activeResponse && (
          <UIModalPresenter 
            key={activeResponse.id} 
            response={activeResponse} 
            onSubmit={handleSubmit} 
            inputValue={inputValue} 
            onInputChange={(e) => setInputValue(e.target.value)} 
          />
        )}
      </AnimatePresence>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-transparent z-10">
        <AuroraInputBar
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) handleSubmit(inputValue); }}
          isLoading={isLoading}
          listeningStatus={listeningStatus}
        />
      </div>
    </main>
  );
}
