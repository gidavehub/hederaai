// /components/ui/TextDisplay.tsx
import { Card } from './Card';

export const TextDisplay = ({ text, title }: { text: string, title?: string }) => {
  const styles = `
    .text-display-title {
      font-weight: 600;
      color: #1e293b; /* slate-800 */
      margin-bottom: 0.5rem;
    }
    .text-display-p {
      color: #475569; /* slate-600 */
      line-height: 1.625; /* leading-relaxed */
      margin: 0;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Card>
        {title && <h4 className="text-display-title">{title}</h4>}
        <p className="text-display-p">{text}</p>
      </Card>
    </>
  );
};