// /components/ui/Button.tsx

export const Button = ({ text, onClick }: { text: string, onClick: () => void }) => {
  const styles = `
    .standalone-button {
      width: 100%;
      padding: 0.75rem 1rem; /* px-4 py-3 */
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6); /* from-blue-500 to-purple-500 */
      color: white;
      border-radius: 0.5rem; /* rounded-lg */
      font-weight: 600;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* shadow-md */
    }
    .standalone-button:hover {
      filter: brightness(1.1);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); /* hover:shadow-lg */
    }
    .standalone-button:active {
      transform: scale(0.95);
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <button 
        onClick={onClick} 
        className="standalone-button"
      >
        {text}
      </button>
    </>
  );
};