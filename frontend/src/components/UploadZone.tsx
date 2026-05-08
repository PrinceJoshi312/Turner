import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

interface UploadZoneProps {
  onUploadSuccess: (datasetId: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'validating' | 'success' | 'failed'>('idle');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setStatus('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    try {
      const response = await apiClient.post('/uploads/dataset', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const datasetId = response.data.dataset_id;
      setStatus('validating');

      // Polling for validation status
      const interval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get(`/uploads/dataset/${datasetId}/status`);
          if (statusRes.data.status === 'validated') {
            clearInterval(interval);
            setStatus('success');
            onUploadSuccess(datasetId);
          } else if (statusRes.data.status === 'failed') {
            clearInterval(interval);
            setStatus('failed');
            setError('Validation failed. Check your data format.');
          }
        } catch (err) {
          clearInterval(interval);
          setStatus('failed');
          setError('Status check failed.');
        }
      }, 3000);

    } catch (err: any) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={status === 'uploading' || status === 'validating'}
        accept=".csv,.jsonl"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        {status === 'idle' && (
          <>
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-gray-600">Click to upload CSV or JSONL</span>
          </>
        )}
        {(status === 'uploading' || status === 'validating') && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-2" />
            <span className="text-gray-600">{status === 'uploading' ? 'Uploading...' : 'Validating data...'}</span>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
            <span className="text-green-600 font-medium">{fileName} Ready!</span>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mb-2" />
            <span className="text-red-600 font-medium">{error}</span>
            <span className="text-gray-400 text-sm mt-1">Try again</span>
          </>
        )}
      </label>
    </div>
  );
};

export default UploadZone;
