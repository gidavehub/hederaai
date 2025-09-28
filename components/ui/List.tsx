import { Card } from './Card';

type ListItem = { key: string; primary: string; secondary: string };

export const List = ({ title, items }: { title: string, items: ListItem[] }) => (
  <Card title={title}>
    <ul className="divide-y divide-white/10">
      {(items || []).map((item) => (
        <li key={item.key} className="py-3">
          <p className="text-white font-medium">{item.primary}</p>
          <p className="text-gray-400 text-sm">{item.secondary}</p>
        </li>
      ))}
    </ul>
  </Card>
);