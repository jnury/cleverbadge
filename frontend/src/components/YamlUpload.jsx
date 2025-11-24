import React, { useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

const EXAMPLE_YAML = `- text: "What is 2+2?"
  type: "SINGLE"
  options: ["3", "4", "5", "6"]
  correct_answers: ["4"]
  tags: ["math", "easy"]

- text: "Select all prime numbers"
  type: "MULTIPLE"
  options: ["2", "3", "4", "5"]
  correct_answers: ["2", "3", "5"]
  tags: ["math"]`;

const YamlUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [yamlText, setYamlText] = useState(EXAMPLE_YAML);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.endsWith('.yaml') && !selectedFile.name.endsWith('.yml')) {
        setError('Please select a YAML file (.yaml or .yml)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleTextImport = async () => {
    if (!yamlText.trim()) {
      setError('Please enter YAML content');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      // Convert text to a Blob and create a File object
      const blob = new Blob([yamlText], { type: 'application/x-yaml' });
      const file = new File([blob], 'questions.yaml', { type: 'application/x-yaml' });

      const formData = new FormData();
      formData.append('file', file);

      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/questions/import`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle detailed validation errors
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.error + ': ' + data.details.join(', '));
        }
        throw new Error(data.error || 'Upload failed');
      }

      setResult({
        success: true,
        count: data.imported_count
      });

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

    } catch (err) {
      setError(err.message);
      setResult({ success: false });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/questions/import`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle detailed validation errors
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.error + ': ' + data.details.join(', '));
        }
        throw new Error(data.error || 'Upload failed');
      }

      setResult({
        success: true,
        count: data.imported_count
      });
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById('yaml-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

    } catch (err) {
      setError(err.message);
      setResult({ success: false });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Import Questions from YAML
      </h3>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => {
            setInputMode('text');
            setError(null);
            setResult(null);
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            inputMode === 'text'
              ? 'border-tech text-tech'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Paste YAML
        </button>
        <button
          onClick={() => {
            setInputMode('file');
            setError(null);
            setResult(null);
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            inputMode === 'file'
              ? 'border-tech text-tech'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload File
        </button>
      </div>

      <div className="space-y-4">
        {/* Text input mode */}
        {inputMode === 'text' && (
          <>
            <div>
              <label
                htmlFor="yaml-text-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                YAML Content
              </label>
              <textarea
                id="yaml-text-input"
                value={yamlText}
                onChange={(e) => setYamlText(e.target.value)}
                disabled={uploading}
                rows={12}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                  focus:ring-tech focus:border-tech font-mono text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Paste your YAML content here..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Edit or paste YAML directly from an LLM output
              </p>
            </div>

            <div>
              <Button
                onClick={handleTextImport}
                disabled={!yamlText.trim() || uploading}
                loading={uploading}
                variant="primary"
              >
                {uploading ? 'Importing...' : 'Import Questions'}
              </Button>
            </div>
          </>
        )}

        {/* File upload mode */}
        {inputMode === 'file' && (
          <>
            <div>
              <label
                htmlFor="yaml-file-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select YAML file
              </label>
              <input
                id="yaml-file-input"
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-tech file:text-white
                  hover:file:bg-tech/90
                  cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <div>
              <Button
                onClick={handleFileUpload}
                disabled={!file || uploading}
                loading={uploading}
                variant="primary"
              >
                {uploading ? 'Uploading...' : 'Upload Questions'}
              </Button>
            </div>
          </>
        )}

        {/* Result messages */}
        {result && result.success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 font-medium">
              Successfully imported {result.count} question{result.count !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Help text */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            YAML Format Reference:
          </p>
          <pre className="text-xs text-blue-800 overflow-x-auto bg-white p-2 rounded border border-blue-100">
{`- text: "What is 2+2?"
  type: "SINGLE"
  options: ["3", "4", "5", "6"]
  correct_answers: ["4"]
  tags: ["math", "easy"]

- text: "Select all prime numbers"
  type: "MULTIPLE"
  options: ["2", "3", "4", "5"]
  correct_answers: ["2", "3", "5"]
  tags: ["math"]`}
          </pre>
          <p className="text-sm text-blue-900 mt-2">
            See <code className="bg-blue-100 px-1 rounded font-mono">examples/questions.yaml</code> for more examples
          </p>
        </div>
      </div>
    </Card>
  );
};

export default YamlUpload;
