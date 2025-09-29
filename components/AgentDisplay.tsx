// /components/AgentDisplay.tsx
'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChangeEvent, useCallback, useMemo } from 'react';
import type { Engine } from 'tsparticles-engine';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { AgentUARP, UIComponentData, UILayoutData } from '../lib/types';

// UI Primitives - These will now be styled by the embedded CSS
import { TextInput } from './ui/TextInput';
import { Button } from './ui/Button';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { Chart } from './ui/Chart';

// --- Re-imagined Primitives (CSS Version) ---

const ThemedText = ({ text, title }: { text: string, title?: string }) => (
  <div className="themed-text">
    {title && <h4 className="themed-text-title">{title}</h4>}
    <p className="themed-text-p">{text}</p>
  </div>
);

type ListItem = { key: string; primary: string; secondary: string };
const ThemedList = ({ title, items }: { title:string, items: ListItem[] }) => (
  <div className="themed-list">
    <h3 className="themed-list-title">{title}</h3>
    <ul className="themed-list-ul">
      {(items || []).map((item, index) => (
        <motion.li
          key={item.key}
          className="themed-list-li"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <p className="themed-list-p-primary">{item.primary}</p>
          <p className="themed-list-p-secondary">{item.secondary}</p>
        </motion.li>
      ))}
    </ul>
  </div>
);

// --- Particle Engine Initialization (Unchanged) ---
class ParticleContainer {
  static instance: ParticleContainer;
  engine: Engine | undefined;
  constructor() { if (ParticleContainer.instance) { return ParticleContainer.instance; } ParticleContainer.instance = this; }
  async init(engine: Engine) { if (this.engine) return; this.engine = engine; await loadSlim(engine); }
}
const particleContainer = new ParticleContainer();

// --- Shared State & Props (Unchanged) ---
interface SharedInputState { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; }
interface AgentDisplayProps { response: AgentUARP; onSubmit: (value: string) => void; sharedInputState: SharedInputState; }

// --- Recursive UI Renderer (CSS Version) ---
const RenderUINode = ({ uiData, onSubmit, sharedInputState }: { uiData: UIComponentData | UILayoutData; onSubmit: (value: string) => void; sharedInputState: SharedInputState; }) => {
  if (!uiData || !uiData.type) return null;
  const props = uiData.props || {};

  switch (uiData.type) {
    case 'LAYOUT_STACK':
      return (
        <div className="layout-stack">
          {(props.children || []).map((child: any, index: number) => ( <RenderUINode key={index} uiData={child} onSubmit={onSubmit} sharedInputState={sharedInputState} /> ))}
        </div>
      );
    case 'TEXT':
    case 'TEXT_RESPONSE':
      return <ThemedText {...props} />;
    case 'LIST':
      return <ThemedList {...props} />;
    case 'INPUT': return <TextInput {...props} onSubmit={onSubmit} sharedState={sharedInputState} />;
    case 'BUTTON': return <Button {...props} onClick={() => onSubmit(props.payload || props.text)} />;
    case 'LOADING': return <LoadingIndicator {...props} text="Thinking..." />;
    case 'CHART': return <Chart {...props} />;
    default:
      return (
        <div className="unknown-component">
          <p className="unknown-component-p-title">Unknown: "{uiData.type}"</p>
        </div>
      );
  }
};

/**
 * AgentDisplay: The single, magnificent component that renders all AI responses.
 * Now with 100% embedded, self-contained CSS.
 */
export const AgentDisplay = ({ response, onSubmit, sharedInputState }: AgentDisplayProps) => {
  const particlesInit = useCallback(async (engine: Engine) => { await particleContainer.init(engine); }, []);
  const shouldReduceMotion = useReducedMotion();

  const particleOptions = useMemo(() => ({ /* Particle options are JS, not CSS, so they remain unchanged */
    fpsLimit: 60,
    interactivity: { events: { onHover: { enable: !shouldReduceMotion, mode: 'bubble' } }, modes: { bubble: { distance: 100, duration: 2, opacity: 0.8, size: 6 } } },
    particles: { color: { value: ["#60a5fa", "#a78bfa", "#f472b6", "#4ade80"] }, move: { direction: 'none', enable: true, outModes: { default: 'out' }, random: true, speed: 0.3, straight: false }, number: { density: { enable: true, area: 800 }, value: 30 }, opacity: { value: { min: 0.1, max: 0.5 }, animation: { enable: true, speed: 0.5, sync: false, minimumValue: 0.1 } }, shape: { type: 'circle' }, size: { value: { min: 1, max: 4 } } },
    detectRetina: true,
  }), [shouldReduceMotion]);
  
  const styles = `
    .agent-display-backdrop {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background-color: rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      padding: 1rem;
    }
    .agent-display-particles {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      z-index: -10;
    }
    .agent-display-modal {
      position: relative;
      width: 100%;
      max-width: 32rem; /* max-w-lg */
      overflow: hidden;
      border-radius: 1.5rem; /* rounded-3xl */
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 80px -10px rgba(99, 102, 241, 0.2), 0 0px 30px -15px rgba(59, 130, 246, 0.2);
    }
    .agent-display-modal-content {
      padding: 1.5rem;
    }
    @media (min-width: 768px) {
      .agent-display-modal-content { padding: 2rem; }
    }
    .agent-display-inner-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem; /* space-y-6 */
    }
    .agent-display-speech {
      text-align: center;
      font-size: 1.125rem; /* text-lg */
      line-height: 1.75rem;
      color: #334155; /* slate-700 */
      text-wrap: balance;
    }
    .agent-display-ui-container {
      padding-top: 0.5rem;
    }

    /* Primitives */
    .themed-text { text-align: left; }
    .themed-text-title { font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; font-size: 1.125rem; }
    .themed-text-p { color: #475569; line-height: 1.625; }
    
    .themed-list-title {
      font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .themed-list-ul { border-color: #e2e8f0; border-style: solid; border-top-width: 1px; border-bottom-width: 0; }
    .themed-list-li { padding-top: 0.75rem; padding-bottom: 0.75rem; border-top-width: 0; border-bottom-width: 1px; border-color: inherit; }
    .themed-list-li:first-child { border-top-width: 0; }
    .themed-list-li:last-child { border-bottom-width: 0; }
    .themed-list-p-primary { color: #1e293b; font-weight: 500; }
    .themed-list-p-secondary { color: #64748b; font-size: 0.875rem; }

    .layout-stack { display: flex; flex-direction: column; gap: 1rem; }

    .unknown-component { padding: 1rem; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 0.5rem; text-align: center; }
    .unknown-component-p-title { font-weight: 700; color: #b91c1c; }
  `;

  return (
    <>
      <style>{styles}</style>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="agent-display-backdrop"
      >
        <Particles id="tsparticles" init={particlesInit} options={particleOptions} className="agent-display-particles" />

        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.85, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 180, duration: 0.6 }}
          className="agent-display-modal"
        >
          <div className="agent-display-modal-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={response.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="agent-display-inner-content"
              >
                {response.speech && <p className="agent-display-speech">{response.speech}</p>}
                {response.ui && <div className="agent-display-ui-container">
                  <RenderUINode uiData={response.ui} onSubmit={onSubmit} sharedInputState={sharedInputState} />
                </div>}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};