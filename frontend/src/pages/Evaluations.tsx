import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Play, BarChart2, Plus, X } from 'lucide-react';

const Evaluations = () => {
  const [evals, setEvals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modelVersions, setModelVersions] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedEvals, setSelectedEvals] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvals();
    fetchInitialData();
  }, []);

  const fetchEvals = async () => {
    try {
      const response = await apiClient.get('/evaluations/');
      setEvals(response.data);
    } catch (err) {
      console.error('Failed to fetch evaluations');
    }
  };

  const fetchInitialData = async () => {
    try {
      // Note: Backend might need a specific endpoint to list all model versions
      // For now we list jobs and assume we find versions there or add a /models endpoint
      // Assuming GET /jobs/ returns jobs which might have model versions
      const jobsRes = await apiClient.get('/jobs/');
      // Placeholder: in a real app, we'd have a specific /model_versions endpoint
      const datasetsRes = await apiClient.get('/uploads/dataset/list'); // hypothetical or just use existing ones
      setDatasets([]); // placeholder
    } catch (err) {
      console.error('Failed to fetch initial data');
    }
  };

  const handleRunEval = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/evaluations/', {
        model_version_id: selectedModel,
        dataset_id: selectedDataset,
      });
      setIsModalOpen(false);
      fetchEvals();
    } catch (err) {
      alert('Failed to trigger evaluation');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedEvals(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Evaluations</h1>
        <div className="flex gap-4">
          {selectedEvals.length > 1 && (
            <button 
              onClick={() => navigate(`/evaluations/compare?ids=${selectedEvals.join(',')}`)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md"
            >
              <BarChart2 className="w-4 h-4" />
              Compare ({selectedEvals.length})
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Evaluation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                Select
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Eval ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F1 Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {evals.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={selectedEvals.includes(ev.id)}
                    onChange={() => toggleSelect(ev.id)}
                    disabled={ev.status !== 'completed'}
                    className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                  {ev.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                    ev.status === 'completed' ? 'bg-green-100 text-green-800' :
                    ev.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800 animate-pulse'
                  }`}>
                    {ev.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {ev.metrics ? `${(ev.metrics.accuracy * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {ev.metrics ? `${(ev.metrics.f1 * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ev.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/evaluations/${ev.id}`} className="text-primary-600 hover:text-primary-900">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Evaluation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRunEval} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model Version ID</label>
                <input 
                  type="text" 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Paste Model Version UUID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dataset ID</label>
                <input 
                  type="text" 
                  value={selectedDataset} 
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Paste Dataset UUID"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-lg font-bold hover:bg-primary-700">
                Start Evaluation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluations;
