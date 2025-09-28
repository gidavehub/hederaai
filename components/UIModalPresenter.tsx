// /components/UIModalPresenter.tsx
'use client';

import { motion } from 'framer-motion';
import { AgentUARP } from '../lib/types'; // Let's update our types file
import { DynamicUIComponent } from './DynamicUIComponent';
import { ChangeEvent } from 'react';

interface UIModalPresenterProps {
  response: AgentUARP;
  onSubmit: (value: string) => void;
  inputValue: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

// Heuristic to determine the size of the modal based on UI type
const getModalSize = (ui?: any): string => {
  if (!ui) return 'w-full max-w-md'; // Default size for text-only responses

  switch (ui.type) {
    case 'LIST':
    case 'CARD':
      // If a list has many items, make it larger
      if (ui.props.items && ui.props.items.length > 5) {
        return 'w-full max-w-2xl';
      }
      return 'w-full max-w-lg';

    case 'LAYOUT_STACK':
    case 'CHART':
      return 'w-full max-w-2xl'; // Larger components get more space

    case 'INPUT':
    case 'TEXT':
    case 'TEXT_RESPONSE':
    case 'BUTTON':
      return 'w-full max-w-md'; // Smaller components get a tighter frame

    default:
      return 'w-full max-w-md';
  }
};

export const UIModalPresenter = ({
  response,
  onSubmit,
  inputValue,
  onInputChange
}: UIModalPresenterProps) => {
  const modalSizeClass = getModalSize(response.ui);

  return (
    // The backdrop overlay
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 p-4"
    >
      {/* The modal container with animation and variable size */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200, duration: 0.4 }}
        className={`relative bg-gray-900/70 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 ${modalSizeClass}`}
      >
        <div className="p-6 md:p-8 space-y-4">
          {/* 1. The Agent's spoken response (the "prompt" on top) */}
          {response.speech && (
            <p className="text-center text-lg text-gray-200 leading-relaxed">
              {response.speech}
            </p>
          )}

          {/* 2. The Dynamic UI Component */}
          {response.ui && (
            <div className="pt-4">
              <DynamicUIComponent
                uiData={response.ui}
                onSubmit={onSubmit}
                // Pass down the shared input state for unified control
                sharedInputState={{
                  value: inputValue,
                  onChange: onInputChange
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};