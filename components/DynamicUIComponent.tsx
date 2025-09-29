'use client';

import { ChangeEvent } from 'react';
import { UIComponentData, UILayoutData } from '../lib/types';

// Import all the primitive building blocks
import { Card } from './ui/Card';
import { List } from './ui/List';
import { TextInput } from './ui/TextInput';
import { TextDisplay } from './ui/TextDisplay';
import { Button } from './ui/Button';
import { Chart } from './ui/Chart';
import { LoadingIndicator } from './ui/LoadingIndicator'; // <-- 1. IMPORT THE NEW COMPONENT

// This interface defines the state that will be shared between
// the main page's AuroraInputBar and any INPUT component in the UI.
interface SharedInputState {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

// The props for the main renderer component.
interface DynamicUIProps {
  uiData: UIComponentData | UILayoutData;
  onSubmit: (value: string) => void;
  sharedInputState?: SharedInputState; // It's optional, as not all UI needs it.
}

/**
 * A recursive component that renders a UI tree based on the UARP schema.
 * It reads the `type` of the uiData and delegates rendering to the appropriate
 * primitive component (Card, List, etc.).
 *
 * For layout components, it calls itself for each child.
 */
export const DynamicUIComponent = ({ uiData, onSubmit, sharedInputState }: DynamicUIProps) => {
  // Gracefully handle cases where uiData might be null or undefined.
  if (!uiData) {
    return null;
  }

  const { type, props } = uiData;

  switch (type) {
    // --- Layout Components ---
    // These components contain children and must pass the sharedInputState down recursively.
    case 'LAYOUT_STACK':
      return (
        <div className="flex flex-col space-y-4">
          {(props.children || []).map((child: any, index: number) => (
            <DynamicUIComponent 
              key={index} 
              uiData={child} 
              onSubmit={onSubmit} 
              sharedInputState={sharedInputState} 
            />
          ))}
        </div>
      );
    
    case 'CARD':
      // A Card can also contain other dynamic components as children.
      return (
        <Card title={props.title}>
          {(props.children || []).map((child: any, index: number) => (
            <DynamicUIComponent 
              key={index} 
              uiData={child} 
              onSubmit={onSubmit} 
              sharedInputState={sharedInputState} 
            />
          ))}
        </Card>
      );

    // --- Primitive UI Components ---
    // These are the actual visual elements.
    
    case 'LIST':
      // Lists display data and don't need the shared input state.
      return <List title={props.title} items={props.items} />;

    case 'INPUT':
      // The INPUT component is special. It receives the sharedInputState
      // to link its value to the main AuroraInputBar.
      return <TextInput {...props} onSubmit={onSubmit} sharedState={sharedInputState} />;
      
    case 'TEXT':
    case 'TEXT_RESPONSE':
      // These are simple text displays.
      return <TextDisplay {...props} />;
    
    case 'BUTTON':
      // Buttons trigger an action by calling the onSubmit callback with a payload.
      return <Button {...props} onClick={() => onSubmit(props.payload || props.text)} />;
      
    case 'CHART':
       // This renders a placeholder, demonstrating extensibility.
      return <Chart {...props} />;

    // --- vvvvvv THE FIX IS HERE vvvvvv ---
    case 'LOADING':
      // The LOADING component displays an animation and optional text.
      return <LoadingIndicator {...props} />;
    // --- ^^^^^^ THE FIX IS HERE ^^^^^^ ---

    default:
      // This is a crucial fallback for development. If the AI generates a new
      // component type that the frontend doesn't know about yet, this will be displayed.
      return (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-center">
          <p className="font-bold text-red-300">Unknown Component Type</p>
          <p className="text-sm text-red-400">The AI requested a component of type: "{type}"</p>
        </div>
      );
  }
};