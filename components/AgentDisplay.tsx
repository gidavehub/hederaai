// /components/AgentDisplay.tsx
'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCallback, useMemo, useEffect, useRef, useState, FormEvent } from 'react';
import type { Engine } from 'tsparticles-engine';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { AgentUARP, UIComponentData, UILayoutData } from '../lib/types';
import { IParticlesProps } from 'react-tsparticles';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

// --- Particle Engine Initialization (Singleton) ---
class ParticleContainer {
  static instance: ParticleContainer;
  engine: Engine | undefined;
  constructor() { if (ParticleContainer.instance) return ParticleContainer.instance; ParticleContainer.instance = this; }
  async init(engine: Engine) { if (this.engine) return; this.engine = engine; await loadSlim(engine); }
}
const particleContainer = new ParticleContainer();

// ===================================================================================
// START: CO-LOCATED UI PRIMITIVES ("The Sentient Canvas Vocabulary")
// ===================================================================================

const ThemedText = ({ text, title }: { text: string, title?: string }) => (
  <div className="themed-text">
    {title && <h4 className="themed-text-title">{title}</h4>}
    <p className="themed-text-p">{text}</p>
  </div>
);

// *** UPGRADED: TEXT INPUT PRIMITIVE ***
const TextInput = ({ placeholder = "Enter value...", buttonText = "Submit", title, inputType = "text", onSubmit }: { placeholder?: string, buttonText?: string, title?: string, inputType?: 'text' | 'password', onSubmit: (value: string) => void }) => {
    const [localValue, setLocalValue] = useState('');
  
    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (localValue.trim()) {
        onSubmit(localValue);
      }
    };
  
    const isDisabled = !localValue.trim();
  
    return (
      <div className="text-input-container">
        {title && <h4 className="text-input-title">{title}</h4>}
        <form onSubmit={handleSubmit} className="text-input-form">
          <input
            type={inputType} // MODIFICATION: Respects the inputType prop for passwords
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className="text-input-field"
            autoFocus
          />
          <button type="submit" className="text-input-button" disabled={isDisabled}>
            {buttonText}
          </button>
        </form>
      </div>
    );
};

// *** NEW: BUTTON GROUP PRIMITIVE ***
const ButtonGroup = ({ buttons, onSubmit }: { buttons: { text: string, payload: string }[], onSubmit: (value: string) => void }) => (
    <div className="button-group-container">
        {(buttons || []).map((button, index) => (
            <button
                key={index}
                onClick={() => onSubmit(button.payload)}
                className="button-group-btn"
            >
                {button.text}
            </button>
        ))}
    </div>
);


const Stepper = ({ currentStep, totalSteps, title }: { currentStep: number, totalSteps: number, title?: string }) => (
    <div className="stepper">
        {title && <p className="stepper-title">{title}</p>}
        <div className="stepper-dots">
            {Array.from({ length: totalSteps }).map((_, index) => (
                <div key={index} className={`stepper-dot ${index + 1 <= currentStep ? 'active' : ''}`} />
            ))}
        </div>
    </div>
);

const KeyValueDisplay = ({ items, title }: { title?: string, items: { key: string, value: string }[] }) => (
    <div className="key-value-display">
        {title && <h3 className="key-value-title">{title}</h3>}
        <dl className="key-value-dl">
            {(items || []).map((item, index) => (
                <motion.div key={item.key} className="key-value-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                    <dt className="key-value-dt">{item.key}</dt>
                    <dd className="key-value-dd">{item.value}</dd>
                </motion.div>
            ))}
        </dl>
    </div>
);

const DataTable = ({ headers, rows, title }: { title?: string, headers: string[], rows: (string|number)[][] }) => (
    <div className="data-table-container">
        {title && <h3 className="data-table-title">{title}</h3>}
        <div className="data-table-wrapper">
            <table className="data-table">
                <thead><tr>{(headers || []).map((header, i) => <th key={i}>{header}</th>)}</tr></thead>
                <tbody>
                    {(rows || []).map((row, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                            {row.map((cell, j) => <td key={j}>{cell}</td>)}
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ConfirmationPrompt = ({ title, text, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }: { title: string, text: string, confirmText?: string, cancelText?: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="confirmation-prompt">
        <h4 className="confirmation-title">{title}</h4>
        <p className="confirmation-text">{text}</p>
        <div className="confirmation-buttons">
            <button onClick={onCancel} className="confirmation-btn cancel">{cancelText}</button>
            <button onClick={onConfirm} className="confirmation-btn confirm">{confirmText}</button>
        </div>
    </div>
);

const Button = ({ text, onClick, payload }: { text: string, payload: string, onClick: (payload: string) => void }) => (
    <button onClick={() => onClick(payload)} className="standalone-button">{text}</button>
);


const LoadingIndicator = ({ text = "Thinking..." }: { text?: string }) => (
    <div className="loading-indicator-container">
        <motion.div className="dots-container" variants={{ start: { transition: { staggerChildren: 0.1 } }, end: { transition: { staggerChildren: 0.1 } } }} initial="start" animate="end">
            <motion.span className="dot dot-1" variants={{ start: { y: '0%' }, end: { y: '100%' } }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
            <motion.span className="dot dot-2" variants={{ start: { y: '0%' }, end: { y: '100%' } }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.1 }} />
            <motion.span className="dot dot-3" variants={{ start: { y: '0%' }, end: { y: '100%' } }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.2 }} />
        </motion.div>
        {text && <p className="loading-text">{text}</p>}
    </div>
);

const Chart = ({ type, data, dataKey, title }: { type: 'BAR' | 'LINE' | string; data: any[]; dataKey: string; title?: string; }) => {
    const commonProps = { grid: { strokeDasharray: "3 3", stroke: "rgba(0, 0, 0, 0.1)" }, axis: { stroke: "#64748b", tick: { fontSize: 12 } }, tooltip: { contentStyle: { backgroundColor: "rgba(255, 255, 255, 0.8)", backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '0.75rem' }, labelStyle: { color: '#1e293b' } }, legend: { wrapperStyle: { fontSize: 14 } } };
    const chart = useMemo(() => {
        switch (type) {
            case 'BAR': return <BarChart data={data}><CartesianGrid {...commonProps.grid} /><XAxis dataKey="name" {...commonProps.axis} /><YAxis {...commonProps.axis} /><Tooltip {...commonProps.tooltip} /><Legend {...commonProps.legend} /><Bar dataKey={dataKey} fill="rgba(99, 102, 241, 0.7)" /></BarChart>;
            case 'LINE': return <LineChart data={data}><CartesianGrid {...commonProps.grid} /><XAxis dataKey="name" {...commonProps.axis} /><YAxis {...commonProps.axis} /><Tooltip {...commonProps.tooltip} /><Legend {...commonProps.legend} /><Line type="monotone" dataKey={dataKey} stroke="#8b5cf6" strokeWidth={2} /></LineChart>;
            default: return <div className="unsupported-chart-container"><p className="unsupported-chart-text">Chart type '{type}' is not supported.</p></div>;
        }
    }, [type, data, dataKey]);

    return (
        <div className="chart-card">
            <h3 className="chart-title">{title || `Chart: ${type}`}</h3>
            <div className="chart-wrapper"><ResponsiveContainer>{chart}</ResponsiveContainer></div>
        </div>
    );
};
// ===================================================================================
// END: CO-LOCATED UI PRIMITIVES
// ===================================================================================

interface AgentDisplayProps {
  response: AgentUARP;
  onSubmit: (value: string) => void;
  isInputActive: boolean;
}

// --- The Recursive UI Renderer Engine ---
const RenderUINode = ({ uiData, onSubmit }: { uiData: UIComponentData | UILayoutData; onSubmit: (value: string) => void; }) => {
  if (!uiData || !uiData.type) return null;
  const props = uiData.props || {};

  switch (uiData.type) {
    case 'LAYOUT_STACK':
      return <div className="layout-stack">{(props.children || []).map((child: any, index: number) => <RenderUINode key={index} uiData={child} onSubmit={onSubmit} />)}</div>;
    
    // *** MODIFIED & NEW CASES ***
    case 'TEXT_INPUT': return <TextInput {...props} onSubmit={onSubmit} />;
    case 'BUTTON_GROUP': return <ButtonGroup {...props} onSubmit={onSubmit} />;
    
    // Standard Primitives
    case 'TEXT': return <ThemedText {...props} />;
    case 'LOADING': return <LoadingIndicator {...props} />;
    case 'BUTTON': return <Button {...props} onClick={onSubmit} />;
    case 'CHART': return <Chart {...props} />;
    case 'STEPPER': return <Stepper {...props} />;
    case 'KEY_VALUE_DISPLAY': return <KeyValueDisplay {...props} />;
    case 'DATA_TABLE': return <DataTable {...props} />;
    case 'CONFIRMATION_PROMPT':
        return <ConfirmationPrompt {...props} onConfirm={() => onSubmit(props.confirmPayload || 'confirm')} onCancel={() => onSubmit(props.cancelPayload || 'cancel')} />;

    default:
      return <div className="unknown-component"><p className="unknown-component-p-title">Unknown: "{uiData.type}"</p></div>;
  }
};

export const AgentDisplay = ({ response, onSubmit, isInputActive }: AgentDisplayProps) => {
  const particlesInit = useCallback(async (engine: Engine) => { await particleContainer.init(engine); }, []);
  const shouldReduceMotion = useReducedMotion();
  const particlesRef = useRef<any>(null);

  const particleOptions: IParticlesProps['options'] = useMemo(() => ({
    fpsLimit: 120, particles: { number: { value: 80, density: { enable: true, value_area: 800 } }, color: { value: ["#3b82f6", "#8b5cf6", "#ec4899", "#22d3ee"] }, shape: { type: "circle" }, opacity: { value: {min: 0.3, max: 0.8}, animation: { enable: true, speed: 0.8, sync: false } }, size: { value: { min: 1, max: 3 } }, move: { enable: true, speed: 1.5, direction: "none", random: true, straight: false, out_mode: "out" } }, interactivity: { events: { onHover: { enable: !shouldReduceMotion, mode: "bubble" } }, modes: { bubble: { distance: 100, duration: 2, opacity: 1, size: 4 }, repulse: { distance: 150, duration: 0.4, speed: 1 } } }, detectRetina: true,
  }), [shouldReduceMotion]);
  
  useEffect(() => {
    const particles = particlesRef.current; if (!particles) return;
    if (isInputActive) {
      particles.options.interactivity.events.onHover.enable = true;
      particles.options.interactivity.events.onHover.mode = 'repulse';
      particles.interactivity.mouse.position = { x: particles.canvas.element.width / 2, y: particles.canvas.element.height * 0.95 };
    } else {
      particles.options.interactivity.events.onHover.mode = 'bubble';
      particles.interactivity.mouse.position = undefined;
    }
  }, [isInputActive]);

  const styles = `
    /* Main Backdrop & Modal */
    .agent-display-backdrop { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-color: rgba(248, 250, 252, 0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; z-index: 10; padding: 1rem; }
    .agent-display-particles { position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: -10; }
    .agent-display-modal { position: relative; width: 100%; max-width: 42rem; overflow: hidden; border-radius: 1.5rem; background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 0 100px -20px rgba(99, 102, 241, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.1); }
    .agent-display-modal-content { padding: 1.5rem; }
    @media (min-width: 768px) { .agent-display-modal-content { padding: 2rem; } }
    .agent-display-inner-content { display: flex; flex-direction: column; gap: 1.5rem; }
    .agent-display-speech { text-align: center; font-size: 1.25rem; line-height: 1.75rem; color: #1e293b; text-wrap: balance; font-weight: 500; }
    .agent-display-ui-container { padding-top: 0.5rem; }
    .layout-stack { display: flex; flex-direction: column; gap: 1.5rem; }
    .unknown-component { padding: 1rem; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 0.5rem; text-align: center; }
    .unknown-component-p-title { font-weight: 700; color: #b91c1c; }

    /* --- PRIMITIVE STYLES --- */
    @keyframes pulse-light { 50% { opacity: 0.7; } }

    /* TextInput */
    .text-input-container { text-align: left; }
    .text-input-title { font-weight: 600; color: #1e293b; margin-bottom: 0.75rem; font-size: 1.125rem; }
    .text-input-form { display: flex; gap: 0.5rem; align-items: center; }
    .text-input-field { flex-grow: 1; background-color: rgba(241, 245, 249, 0.8); border: 1px solid #e2e8f0; color: #334155; border-radius: 0.5rem; padding: 0.75rem 1rem; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .text-input-field:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3); }
    .text-input-button { padding: 0.75rem 1.25rem; background-image: linear-gradient(to right, #4f46e5, #7c3aed); color: white; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; border: none; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); }
    .text-input-button:hover { filter: brightness(1.1); }
    .text-input-button:active { transform: scale(0.95); }
    .text-input-button:disabled { background-image: none; background-color: #d1d5db; cursor: not-allowed; box-shadow: none; }

    /* Button Group */
    .button-group-container { display: flex; flex-direction: column; gap: 0.75rem; }
    @media (min-width: 640px) { .button-group-container { flex-direction: row; } }
    .button-group-btn { flex: 1; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; background-color: rgba(255, 255, 255, 0.7); color: #334155; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
    .button-group-btn:hover { border-color: #6366f1; color: #6366f1; background-color: rgba(238, 242, 255, 0.8); }

    /* ThemedText */
    .themed-text { text-align: left; background: rgba(248, 250, 252, 0.6); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); }
    .themed-text-title { font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; font-size: 1.125rem; }
    .themed-text-p { color: #475569; line-height: 1.625; }
    .stepper { padding: 0.5rem 1rem; background: rgba(248, 250, 252, 0.6); border-radius: 999px; border: 1px solid rgba(226, 232, 240, 0.8); display: flex; align-items: center; justify-content: center; gap: 1rem; }
    .stepper-title { font-size: 0.875rem; color: #475569; font-weight: 500; }
    .stepper-dots { display: flex; gap: 0.5rem; }
    .stepper-dot { width: 0.625rem; height: 0.625rem; border-radius: 9999px; background-color: #cbd5e1; transition: all 0.3s; }
    .stepper-dot.active { background-color: #6366f1; transform: scale(1.1); }
    .key-value-display { background: rgba(248, 250, 252, 0.6); padding: 1rem 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); }
    .key-value-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; background-image: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .key-value-dl { display: flex; flex-direction: column; gap: 0.75rem; }
    .key-value-item { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
    .key-value-item:last-child { border-bottom: none; }
    .key-value-dt { color: #64748b; font-size: 0.875rem; font-weight: 500; white-space: nowrap; }
    .key-value-dd { color: #1e293b; font-weight: 500; word-break: break-all; }
    .data-table-container { background: rgba(248, 250, 252, 0.6); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); }
    .data-table-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; background-image: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .data-table-wrapper { max-height: 300px; overflow-y: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table th { font-weight: 600; color: #334155; font-size: 0.875rem; background-color: rgba(241, 245, 249, 0.7); }
    .data-table td { color: #475569; font-size: 0.875rem; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .confirmation-prompt { background: rgba(248, 250, 252, 0.6); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); text-align: center; }
    .confirmation-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
    .confirmation-text { color: #475569; margin: 0.5rem 0 1.5rem; }
    .confirmation-buttons { display: flex; gap: 0.75rem; justify-content: center; }
    .confirmation-btn { padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
    .confirmation-btn.cancel { background-color: #e2e8f0; color: #475569; }
    .confirmation-btn.cancel:hover { background-color: #cbd5e1; }
    .confirmation-btn.confirm { background-image: linear-gradient(to right, #ef4444, #f43f5e); color: white; }
    .confirmation-btn.confirm:hover { filter: brightness(1.1); }
    .standalone-button { width: 100%; padding: 0.75rem 1rem; background-image: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; border: none; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); }
    .standalone-button:hover { filter: brightness(1.1); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); }
    .standalone-button:active { transform: scale(0.95); }
    .loading-indicator-container { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; }
    .dots-container { display: flex; gap: 0.5rem; }
    .dot { display: block; width: 0.75rem; height: 0.75rem; border-radius: 9999px; }
    .dot-1 { background-color: #60a5fa; } .dot-2 { background-color: #a78bfa; } .dot-3 { background-color: #f472b6; }
    .loading-text { font-size: 1.125rem; color: #64748b; animation: pulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .chart-card { background: rgba(248, 250, 252, 0.6); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); }
    .chart-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; background-image: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .chart-wrapper { width: 100%; height: 300px; }
    .unsupported-chart-container { display: flex; align-items: center; justify-content: center; height: 100%; }
    .unsupported-chart-text { color: #64748b; font-style: italic; }
  `;

  return (
    <>
      <style>{styles}</style>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="agent-display-backdrop"
      >
        <Particles id="tsparticles" init={particlesInit} options={particleOptions} className="agent-display-particles" particlesLoaded={(container:any) => particlesRef.current = container} />
        <motion.div
          layout="position"
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
                {response.ui && (
                  <div className="agent-display-ui-container">
                    <RenderUINode uiData={response.ui} onSubmit={onSubmit} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};