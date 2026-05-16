import React, { useState } from 'react';
import { Check, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../api/client';

interface DatasetMappingProps {
  datasetId: string;
  columns: string[];
  sampleRows: any[];
  onMappingApplied: () => void;
}

const DatasetMapping: React.FC<DatasetMappingProps> = ({ datasetId, columns, sampleRows, onMappingApplied }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({
    input_text: columns.find(c => c.toLowerCase().includes('prompt') || c.toLowerCase().includes('input')) || columns[0],
    output_text: columns.find(c => c.toLowerCase().includes('response') || c.toLowerCase().includes('output') || c.toLowerCase().includes('answer')) || columns[1] || columns[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/uploads/dataset/mapping', {
        dataset_id: datasetId,
        mapping: mapping,
      });
      onMappingApplied();
    } catch (err) {
      alert('Failed to apply mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Map your columns</h3>
        <p className="text-sm text-gray-500">Tell us which columns contain the training data.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Input Text (Prompts)
            </label>
            <select
              value={mapping.input_text}
              onChange={(e) => setMapping({ ...mapping, input_text: e.target.value })}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Output Text (Target Answers)
            </label>
            <select
              value={mapping.output_text}
              onChange={(e) => setMapping({ ...mapping, output_text: e.target.value })}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> Data Preview (First 3 rows)
          </h4>
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-gray-500">Row</th>
                  <th className="px-4 py-2 text-left font-bold text-primary-600 bg-primary-50">Input ({mapping.input_text})</th>
                  <th className="px-4 py-2 text-left font-bold text-green-600 bg-green-50">Output ({mapping.output_text})</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleRows.slice(0, 3).map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{row[mapping.input_text]}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{row[mapping.output_text]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : (
            <>
              Confirm Mapping & Start Validation <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DatasetMapping;
