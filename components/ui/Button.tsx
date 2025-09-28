export const Button = ({ text, onClick }: { text: string, onClick: () => void }) => (
  <button onClick={onClick} className="w-full px-4 py-2 bg-cyan-600 rounded-md font-semibold hover:bg-cyan-500 transition-colors text-center">
    {text}
  </button>
);