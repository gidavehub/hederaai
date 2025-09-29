// /components/ui/Card.tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export const Card = ({ title, children }: { title?: string, children: ReactNode }) => {
  const styles = `
    .card-container {
      background-color: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.75rem; /* rounded-xl */
      padding: 1rem; /* p-4 */
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
    }
    @media (min-width: 768px) {
      .card-container {
        padding: 1.5rem; /* md:p-6 */
      }
    }
    .card-title {
      font-size: 1.125rem; /* text-lg */
      line-height: 1.75rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background-image: linear-gradient(to right, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="card-container"
      >
        {title && <h3 className="card-title">{title}</h3>}
        {children}
      </motion.div>
    </>
  );
};