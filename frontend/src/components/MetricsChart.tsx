import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Metrics {
  accuracy: number;
  f1: number;
  bleu: number;
  perplexity: number;
}

interface MetricsChartProps {
  metrics: Metrics;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ metrics }) => {
  const data = [
    { name: 'Accuracy', value: metrics.accuracy * 100, color: '#0ea5e9' },
    { name: 'F1 Score', value: metrics.f1 * 100, color: '#8b5cf6' },
    { name: 'BLEU', value: metrics.bleu, color: '#ec4899' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Score']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
