import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadZone from '../components/UploadZone';
import HyperparamForm from '../components/HyperparamForm';
import apiClient from '../api/client';
import { Rocket } from 'lucide-react';

const NewJob = () => {
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [baseModel, setBaseModel] = useState('gemini-1.0-pro-002');
  const [hyperparams, setHyperparams] = useState({
    epochs: 3,
    learning_rate_multiplier: 1.0,
    adapter_size: 4,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLaunch = async () => {
    if (!datasetId) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/jobs/', {
        dataset_id: datasetId,
        base_model: baseModel,
        hyperparameters: hyperparams,
      });
      navigate(`/jobs/${response.data.id}`);
    } catch (err) {
      alert('Failed to launch job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Launch New Fine-Tune Job</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4">1. Upload Training Data</h2>
            <UploadZone onUploadSuccess={setDatasetId} />
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">2. Select Base Model</h2>
            <select
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm"
            >
              <option value="gemini-1.0-pro-002">gemini-1.0-pro-002 (Recommended)</option>
              <option value="gemini-1.5-pro" disabled>gemini-1.5-pro (Coming Soon)</option>
            </select>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4">3. Configure Hyperparameters</h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <HyperparamForm value={hyperparams} onChange={setHyperparams} />
            </div>
          </section>

          <button
            onClick={handleLaunch}
            disabled={!datasetId || isSubmitting}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              datasetId && !isSubmitting
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Rocket className="w-6 h-6" />
            {isSubmitting ? 'Launching...' : 'Launch Training Job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewJob;
