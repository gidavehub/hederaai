// /components/ui/Chart.tsx
'use client';

import { Card } from './Card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

// A more specific type for chart data for better type safety
type ChartDataPoint = {
  name: string;
  [key: string]: any;
};

interface ChartProps {
  type: 'BAR' | 'LINE' | string; // Allow for other types, but define common ones
  data: ChartDataPoint[];
  dataKey: string; // The key in the data objects to plot on the Y-axis
  title?: string;
}

export const Chart = ({ type, data, dataKey, title }: ChartProps) => {
  const renderChart = () => {
    switch (type) {
      case 'BAR':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
              labelStyle={{ color: '#dddddd' }}
            />
            <Legend wrapperStyle={{ color: '#dddddd' }} />
            <Bar dataKey={dataKey} fill="#8884d8" />
          </BarChart>
        );
      case 'LINE':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
              labelStyle={{ color: '#dddddd' }}
            />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke="#82ca9d" />
          </LineChart>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 italic">Chart type '{type}' is not supported.</p>
          </div>
        );
    }
  };

  return (
    <Card title={title || `Chart: ${type}`}>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
      </div>
    </Card>
  );
};