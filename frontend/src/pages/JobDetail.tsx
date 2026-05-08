import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import LogTerminal from '../components/LogTerminal';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import { ChevronRight, Cpu, Database, Settings } from 'lucide-react';

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  
  const wsUrl = jobId && accessToken 
    ? `${import.meta.env.VITE_WS_BASE_URL}/jobs/${jobId}/logs?token=${accessToken}`
    : null;
  
  const { logs, isDone } = useWebSocket(wsUrl);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await apiClient.get(`/jobs/${jobId}`);
        setJob(response.data);
      } catch (err) {
        console.error('Failed to fetch job');
      }
    };
    fetchJob();
  }, [jobId]);

  if (!job) return <div className="p-8">Loading job details...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/jobs" className="hover:text-primary-600">Jobs</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{jobId?.slice(0, 8)}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Job Info</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Base Model</p>
                  <p className="font-medium">{job.base_model}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Dataset ID</p>
                  <p className="font-medium truncate w-40">{job.dataset_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Hyperparams</p>
                  <p className="text-sm">Epochs: {job.hyperparameters.epochs}</p>
                  <p className="text-sm">LR Mult: {job.hyperparameters.learning_rate_multiplier}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-2">Status</h2>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                job.status === 'completed' ? 'bg-green-500' :
                job.status === 'failed' ? 'bg-red-500' :
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="capitalize font-semibold text-lg">{job.status}</span>
            </div>
            {job.error_message && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                {job.error_message}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
              <span className="text-gray-400 text-xs font-mono">Real-time Logs</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
            </div>
            <LogTerminal logs={logs} isDone={isDone} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
