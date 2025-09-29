// /components/ui/List.tsx
import { motion } from 'framer-motion';
import { Card } from './Card';

type ListItem = { key: string; primary: string; secondary: string };

export const List = ({ title, items }: { title: string, items: ListItem[] }) => {
  const styles = `
    .list-ul {
      list-style: none;
      padding: 0;
      border-color: rgba(226, 232, 240, 0.8); /* divide-slate-200/80 */
      border-style: solid;
      border-top-width: 1px;
      border-bottom-width: 0px;
    }
    .list-li {
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
      border-top-width: 0;
      border-bottom-width: 1px;
      border-color: inherit;
      border-style: solid;
    }
    .list-li:first-child {
      border-top-width: 0;
    }
    .list-li:last-child {
      border-bottom-width: 0;
    }
    .list-p-primary {
      font-weight: 500;
      color: #1e293b; /* text-slate-800 */
      margin: 0;
    }
    .list-p-secondary {
      font-size: 0.875rem; /* text-sm */
      color: #64748b; /* text-slate-500 */
      margin: 0;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Card title={title}>
        <ul className="list-ul">
          {(items || []).map((item, index) => (
            <motion.li 
              key={item.key} 
              className="list-li"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <p className="list-p-primary">{item.primary}</p>
              <p className="list-p-secondary">{item.secondary}</p>
            </motion.li>
          ))}
        </ul>
      </Card>
    </>
  );
};