import React from 'react';

interface Evaluation {
  id: string;
  model_version_id: string;
  dataset_id: string;
  metrics: {
    accuracy: number;
    f1: number;
    bleu: number;
    perplexity: number;
  };
  created_at: string;
}

interface CompareTableProps {
  evaluations: Evaluation[];
}

const CompareTable: React.FC<CompareTableProps> = ({ evaluations }) => {
  const metricsList = [
    { key: 'accuracy', label: 'Accuracy', higherIsBetter: true },
    { key: 'f1', label: 'F1 Score', higherIsBetter: true },
    { key: 'bleu', label: 'BLEU', higherIsBetter: true },
    { key: 'perplexity', label: 'Perplexity', higherIsBetter: false },
  ];

  const getBestValue = (metricKey: string, higherIsBetter: boolean) => {
    const values = evaluations.map((e: any) => e.metrics[metricKey]);
    return higherIsBetter ? Math.max(...values) : Math.min(...values);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Metric
            </th>
            {evaluations.map((ev) => (
              <th key={ev.id} className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID: {ev.id.slice(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {metricsList.map((m) => {
            const bestValue = getBestValue(m.key, m.higherIsBetter);
            return (
              <tr key={m.key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {m.label}
                </td>
                {evaluations.map((ev: any) => {
                  const val = ev.metrics[m.key];
                  const isBest = val === bestValue;
                  return (
                    <td key={ev.id} className={`px-6 py-4 whitespace-nowrap text-sm ${isBest ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                      {m.key === 'perplexity' ? val.toFixed(4) : `${(val * (m.key === 'bleu' ? 1 : 100)).toFixed(2)}${m.key === 'bleu' ? '' : '%'}`}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CompareTable;
