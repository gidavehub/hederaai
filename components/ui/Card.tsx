import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export const Card = ({ title, children }: { title?: string, children: ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 md:p-6"
  >
    {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
    <div className="space-y-4">{children}</div>
  </motion.div>
);