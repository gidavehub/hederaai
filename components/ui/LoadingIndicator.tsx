// /components/ui/LoadingIndicator.tsx
import { motion } from 'framer-motion';

interface LoadingIndicatorProps {
  text?: string;
}

export function LoadingIndicator({ text = "Processing..." }: LoadingIndicatorProps) {
  const containerVariants = {
    start: { transition: { staggerChildren: 0.1 } },
    end: { transition: { staggerChildren: 0.1 } },
  };

  const dotVariants = {
    start: { y: '0%' },
    end: { y: '100%' },
  };

  const dotTransition = {
    duration: 0.4,
    repeat: Infinity,
    repeatType: 'reverse' as const,
    ease: 'easeInOut',
  };
  
  const styles = `
    @keyframes pulse-light {
      50% { opacity: 0.7; }
    }
    .loading-indicator-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem; /* gap-4 */
      padding: 2rem; /* p-8 */
      text-align: center;
    }
    .dots-container {
      display: flex;
      gap: 0.5rem; /* gap-2 */
    }
    .dot {
      display: block;
      width: 0.75rem; /* w-3 */
      height: 0.75rem; /* h-3 */
      border-radius: 9999px; /* rounded-full */
    }
    .dot-1 { background-color: #60a5fa; /* bg-blue-400 */ }
    .dot-2 { background-color: #a78bfa; /* bg-purple-400 */ }
    .dot-3 { background-color: #f472b6; /* bg-pink-400 */ }
    
    .loading-text {
      font-size: 1.125rem; /* text-lg */
      color: #64748b; /* text-slate-500 */
      animation: pulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="loading-indicator-container">
        <motion.div
          className="dots-container"
          variants={containerVariants}
          initial="start"
          animate="end"
        >
          <motion.span 
            className="dot dot-1"
            variants={dotVariants} 
            transition={dotTransition} 
          />
          <motion.span 
            className="dot dot-2"
            variants={dotVariants} 
            transition={{...dotTransition, delay: 0.1}} 
          />
          <motion.span 
            className="dot dot-3"
            variants={dotVariants} 
            transition={{...dotTransition, delay: 0.2}} 
          />
        </motion.div>
        {text && <p className="loading-text">{text}</p>}
      </div>
    </>
  );
}