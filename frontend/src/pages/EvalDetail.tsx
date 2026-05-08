import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import apiClient from '../api/client';
import MetricsChart from '../components/MetricsChart';
import CompareTable from '../components/CompareTable';
import { ChevronLeft, Info, TrendingUp, Target, Zap } from 'lucide-react';

const EvalDetail = () => {
  const { evalId } = useParams<{ evalId: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const compareIds = queryParams.get('ids');

  const [evaluation, setEvaluation] = useState<any>(null);
  const [compareEvals, setCompareEvals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (compareIds) {
          const response = await apiClient.get(`/evaluations/compare?ids=${compareIds}`);
          setCompareEvals(response.data);
        } else {
          const response = await apiClient.get(`/evaluations/${evalId}`);
          setEvaluation(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [evalId, compareIds]);

  if (loading) return <div className="p-8">Loading...</div>;

  if (compareIds) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <Link to="/evaluations" className="flex items-center gap-1 text-primary-600 mb-6 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Evaluations
        </Link>
        <h1 className="text-3xl font-bold mb-8">Model Comparison</h1>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 overflow-hidden">
          <CompareTable evaluations={compareEvals} />
        </div>
      </div>
    );
  }

  if (!evaluation) return <div className="p-8 text-red-500">Evaluation not found</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Link to="/evaluations" className="flex items-center gap-1 text-primary-600 mb-6 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Back to Evaluations
      </Link>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Evaluation Results</h1>
          <p className="text-gray-500 font-mono text-sm">ID: {evaluation.id}</p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-bold capitalize ${
          evaluation.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {evaluation.status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard label="Accuracy" value={evaluation.metrics?.accuracy} icon={<Target className="text-blue-500" />} />
        <MetricCard label="F1 Score" value={evaluation.metrics?.f1} icon={<TrendingUp className="text-purple-500" />} />
        <MetricCard label="BLEU Score" value={evaluation.metrics?.bleu} isPercentage={false} icon={<Zap className="text-pink-500" />} />
        <MetricCard label="Perplexity" value={evaluation.metrics?.perplexity} isPercentage={false} icon={<Info className="text-gray-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Performance Visualization</h2>
          {evaluation.metrics ? <MetricsChart metrics={evaluation.metrics} /> : <div className="h-64 flex items-center justify-center text-gray-400 italic">No data yet</div>}
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6">Execution Info</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Created At</p>
              <p className="font-medium">{new Date(evaluation.created_at).toLocaleString()}</p>
            </div>
            {evaluation.completed_at && (
              <div>
                <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Completed At</p>
                <p className="font-medium">{new Date(evaluation.completed_at).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Model Version</p>
              <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded border border-gray-100">{evaluation.model_version_id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, isPercentage = true }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value !== undefined ? (isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)) : 'N/A'}
      </p>
    </div>
    <div className="bg-gray-50 p-3 rounded-xl">
      {icon}
    </div>
  </div>
);

export default EvalDetail;
