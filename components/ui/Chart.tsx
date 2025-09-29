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

type ChartDataPoint = {
  name: string;
  [key: string]: any;
};

interface ChartProps {
  type: 'BAR' | 'LINE' | string;
  data: ChartDataPoint[];
  dataKey: string;
  title?: string;
}

export const Chart = ({ type, data, dataKey, title }: ChartProps) => {
  // Common JS style objects for Recharts props
  const gridProps = { strokeDasharray: "3 3", stroke: "rgba(0, 0, 0, 0.1)" };
  const axisProps = { stroke: "#64748b" /* slate-500 */, tick: { fontSize: 12 } };
  const tooltipProps = {
    contentStyle: {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    labelStyle: { color: '#1e293b' /* slate-800 */ },
  };
  const legendProps = { wrapperStyle: { color: '#334155' /* slate-700 */, fontSize: 14 } };

  const styles = `
    .chart-wrapper {
      width: 100%;
      height: 300px;
    }
    .unsupported-chart-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .unsupported-chart-text {
      color: #64748b; /* text-slate-500 */
      font-style: italic;
    }
  `;

  const renderChart = () => {
    switch (type) {
      case 'BAR':
        return (
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey={dataKey} fill="rgba(59, 130, 246, 0.7)" />
          </BarChart>
        );
      case 'LINE':
        return (
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Line type="monotone" dataKey={dataKey} stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        );
      default:
        return (
          <div className="unsupported-chart-container">
            <p className="unsupported-chart-text">Chart type '{type}' is not supported.</p>
          </div>
        );
    }
  };

  return (
    <>
      <style>{styles}</style>
      <Card title={title || `Chart: ${type}`}>
        <div className="chart-wrapper">
          <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
        </div>
      </Card>
    </>
  );
};