import React from 'react';

interface Hyperparams {
  epochs: number;
  learning_rate_multiplier: number;
  adapter_size: number;
}

interface HyperparamFormProps {
  value: Hyperparams;
  onChange: (value: Hyperparams) => void;
}

const HyperparamForm: React.FC<HyperparamFormProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Epochs: {value.epochs}
        </label>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value.epochs}
          onChange={(e) => onChange({ ...value, epochs: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
          <span>1</span>
          <span>5</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Learning Rate Multiplier: {value.learning_rate_multiplier.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="10.0"
          step="0.1"
          value={value.learning_rate_multiplier}
          onChange={(e) => onChange({ ...value, learning_rate_multiplier: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
          <span>0.1</span>
          <span>10.0</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adapter Size
        </label>
        <select
          value={value.adapter_size}
          onChange={(e) => onChange({ ...value, adapter_size: parseInt(e.target.value) })}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={1}>1</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
          <option value={16}>16</option>
        </select>
        <p className="mt-1 text-xs text-gray-400">Higher values increase model capacity but use more memory.</p>
      </div>
    </div>
  );
};

export default HyperparamForm;
