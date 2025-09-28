// /components/ui/TextInput.tsx
import { ChangeEvent, FormEvent } from 'react';

interface SharedState {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

interface TextInputProps {
  placeholder?: string;
  buttonText?: string;
  onSubmit: (value: string) => void;
  sharedState?: SharedState; // This is the new, optional prop
}

export const TextInput = ({ placeholder = "Enter value...", buttonText = "Submit", onSubmit, sharedState }: TextInputProps) => {
  
  // This form can now be submitted by pressing Enter on the input OR by clicking the button
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (sharedState?.value.trim()) {
      onSubmit(sharedState.value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 items-center">
      <input
        type="text"
        value={sharedState?.value || ''}
        onChange={sharedState?.onChange}
        placeholder={placeholder}
        className="flex-grow bg-gray-700/80 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-shadow"
        autoFocus // Automatically focus on the input when it appears
      />
      <button 
        type="submit" 
        className="px-5 py-3 bg-blue-600 rounded-md font-semibold hover:bg-blue-500 transition-colors disabled:bg-gray-500"
        disabled={!sharedState?.value.trim()}
      >
        {buttonText}
      </button>
    </form>
  );
};