import { Card } from './Card';

export const TextDisplay = ({ text, title }: { text: string, title?: string }) => (
  <Card>
    {title && <h4 className="font-semibold text-gray-300 mb-2">{title}</h4>}
    <p className="text-gray-200">{text}</p>
  </Card>
);