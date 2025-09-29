// /components/ui/TextInput.tsx
import { ChangeEvent, FormEvent } from 'react';

interface SharedState {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

interface TextInputProps {
  placeholder?: string;
  buttonText?: string;
  title?: string;
  onSubmit: (value: string) => void;
  sharedState?: SharedState;
}

export const TextInput = ({ placeholder = "Enter value...", buttonText = "Submit", title, onSubmit, sharedState }: TextInputProps) => {
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (sharedState?.value.trim()) {
      onSubmit(sharedState.value);
    }
  };

  const isDisabled = !sharedState?.value.trim();

  const styles = `
    .text-input-container {
      text-align: left;
    }
    .text-input-title {
      font-weight: 600;
      color: #1e293b; /* slate-800 */
      margin-bottom: 0.5rem;
      font-size: 1.125rem; /* text-lg */
    }
    .text-input-form {
      display: flex;
      gap: 0.5rem; /* space-x-2 */
      align-items: center;
    }
    .text-input-field {
      flex-grow: 1;
      background-color: rgba(241, 245, 249, 0.7); /* bg-slate-100/70 */
      border: 1px solid #e2e8f0; /* border-slate-200 */
      color: #334155; /* text-slate-700 */
      border-radius: 0.5rem; /* rounded-lg */
      padding: 0.75rem 1rem; /* px-4 py-3 */
      transition: all 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }
    .text-input-field:focus {
      outline: 2px solid transparent;
      outline-offset: 2px;
      border-color: #60a5fa; /* focus:border-blue-400 */
      box-shadow: 0 0 0 2px #60a5fa; /* focus:ring-2 focus:ring-blue-400 */
    }
    .text-input-button {
      padding: 0.75rem 1.25rem; /* px-5 py-3 */
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6); /* from-blue-500 to-purple-500 */
      color: white;
      border-radius: 0.5rem; /* rounded-lg */
      font-weight: 600;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* shadow-md */
    }
    .text-input-button:hover {
      filter: brightness(1.1);
    }
    .text-input-button:active {
      transform: scale(0.95);
    }
    .text-input-button:disabled {
      background-image: linear-gradient(to right, #d1d5db, #9ca3af); /* from-slate-300 to-slate-400 */
      cursor: not-allowed;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* disabled:shadow-sm */
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="text-input-container">
        {title && <h4 className="text-input-title">{title}</h4>}
        <form onSubmit={handleSubmit} className="text-input-form">
          <input
            type="text"
            value={sharedState?.value || ''}
            onChange={sharedState?.onChange}
            placeholder={placeholder}
            className="text-input-field"
            autoFocus
          />
          <button 
            type="submit" 
            className="text-input-button"
            disabled={isDisabled}
          >
            {buttonText}
          </button>
        </form>
      </div>
    </>
  );
};