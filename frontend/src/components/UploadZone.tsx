import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import apiClient from '../api/client';
import DatasetMapping from './DatasetMapping';

interface UploadZoneProps {
  onUploadSuccess: (datasetId: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'mapping' | 'validating' | 'success' | 'failed'>('idle');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: string[], rows: any[] } | null>(null);

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
      
      const newDatasetId = response.data.dataset_id;
      setDatasetId(newDatasetId);
      
      // Get preview
      const previewRes = await apiClient.get(`/uploads/dataset/${newDatasetId}/preview`);
      setPreviewData({
        columns: previewRes.data.columns,
        rows: previewRes.data.sample_rows
      });
      
      setStatus('mapping');

    } catch (err: any) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const startPolling = () => {
    if (!datasetId) return;
    setStatus('validating');
    
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
          setError(statusRes.data.error_message || 'Validation failed. Check your data format.');
        }
      } catch (err) {
        clearInterval(interval);
        setStatus('failed');
        setError('Status check failed.');
      }
    }, 3000);
  };

  if (status === 'mapping' && datasetId && previewData) {
    return (
      <DatasetMapping
        datasetId={datasetId}
        columns={previewData.columns}
        sampleRows={previewData.rows}
        onMappingApplied={startPolling}
      />
    );
  }

  return (
    <div className={`border-2 border-dashed rounded-xl p-8 text-center bg-white transition-all ${
      status === 'failed' ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary-400'
    }`}>
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
            <div className="bg-primary-50 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <span className="text-gray-900 font-bold block mb-1">Click to upload training data</span>
            <span className="text-gray-500 text-sm">Supports CSV or JSONL (Max 100MB)</span>
          </>
        )}
        {(status === 'uploading' || status === 'validating') && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
            <span className="text-gray-900 font-bold block">
              {status === 'uploading' ? 'Uploading file...' : 'Validating data structure...'}
            </span>
            <p className="text-sm text-gray-500 mt-1">This usually takes a few seconds.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="bg-green-50 p-4 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <span className="text-green-700 font-bold block mb-1">{fileName} Ready!</span>
            <span className="text-green-600 text-sm">You can now launch your fine-tune job below.</span>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <span className="text-red-700 font-bold block mb-1 text-lg">Upload Failed</span>
            <div className="bg-white border border-red-200 p-3 rounded-lg max-w-md mx-auto mb-4 flex items-start gap-2 text-left">
               <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
               <p className="text-sm text-red-600 leading-tight">{error}</p>
            </div>
            <span className="text-primary-600 font-bold cursor-pointer hover:underline underline-offset-4">Try another file</span>
          </>
        )}
      </label>
    </div>
  );
};

export default UploadZone;
