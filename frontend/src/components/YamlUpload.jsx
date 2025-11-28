import React, { useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

const EXAMPLE_YAML = `# Example YAML format - root array of questions
# Each option has is_correct: true/false to mark correct answers
- title: "Basic Addition"
  text: "What is 2+2?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "3"
      is_correct: false
    - text: "4"
      is_correct: true
      explanation: "2+2=4"
    - text: "5"
      is_correct: false
  tags: ["math", "easy"]

- title: "Prime Numbers Selection"
  text: "Select all prime numbers"
  type: "MULTIPLE"
  visibility: "private"
  options:
    - text: "2"
      is_correct: true
    - text: "3"
      is_correct: true
    - text: "4"
      is_correct: false
    - text: "5"
      is_correct: true
  tags: ["math"]`;

const YamlUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [yamlText, setYamlText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'file'
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validate file extension
      if (!droppedFile.name.endsWith('.yaml') && !droppedFile.name.endsWith('.yml')) {
        setError('Please select a YAML file (.yaml or .yml)');
        setFile(null);
        return;
      }
      setFile(droppedFile);
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
        // Handle detailed validation errors (array for validation, string for YAML parse)
        if (data.details) {
          const detailsStr = Array.isArray(data.details)
            ? data.details.join(', ')
            : data.details;
          throw new Error(data.error + ': ' + detailsStr);
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
        // Handle detailed validation errors (array for validation, string for YAML parse)
        if (data.details) {
          const detailsStr = Array.isArray(data.details)
            ? data.details.join(', ')
            : data.details;
          throw new Error(data.error + ': ' + detailsStr);
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
        <button
          onClick={() => {
            setInputMode('reference');
            setError(null);
            setResult(null);
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            inputMode === 'reference'
              ? 'border-tech text-tech'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          YAML Format Reference
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
                  placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={EXAMPLE_YAML}
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
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-tech bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                id="yaml-file-input"
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />

              {!file ? (
                <div className="space-y-4">
                  <div className="text-gray-600">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <Button
                      variant="primary"
                      onClick={() => document.getElementById('yaml-file-input').click()}
                      disabled={uploading}
                    >
                      Select File
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Or drag and drop file here
                  </p>
                  <p className="text-xs text-gray-400">
                    YAML files only (.yaml, .yml)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-green-600">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {file && (
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
            )}
          </>
        )}

        {/* Reference tab */}
        {inputMode === 'reference' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                The file must contain a root-level array of questions. Each question has:
              </p>
              <p className="text-sm text-gray-800 font-medium mt-3 mb-1">Required fields:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><code className="bg-gray-100 px-1 rounded font-mono">title</code> - Short descriptive title (1-200 chars, unique per author)</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">text</code> - The question text (supports Markdown)</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">type</code> - Either "SINGLE" or "MULTIPLE"</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">options</code> - Array of option objects (2-10 options)</li>
              </ul>
              <p className="text-sm text-gray-800 font-medium mt-3 mb-1">Option object fields:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><code className="bg-gray-100 px-1 rounded font-mono">text</code> - The option text (required)</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">is_correct</code> - Boolean true/false (required)</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">explanation</code> - Why this answer is right/wrong (optional)</li>
              </ul>
              <p className="text-sm text-gray-800 font-medium mt-3 mb-1">Optional question fields:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><code className="bg-gray-100 px-1 rounded font-mono">visibility</code> - "public", "private" (default), or "protected"</li>
                <li><code className="bg-gray-100 px-1 rounded font-mono">tags</code> - Array of category tags</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> For SINGLE type, exactly one option must have <code className="bg-gray-100 px-1 rounded font-mono">is_correct: true</code>.
                For MULTIPLE type, at least one option must have <code className="bg-gray-100 px-1 rounded font-mono">is_correct: true</code>.
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-800 font-medium mb-2">
                Visibility levels:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li><strong>public</strong> - Can be used in any test</li>
                <li><strong>private</strong> - Only usable in private/protected tests (default)</li>
                <li><strong>protected</strong> - Only usable in protected tests</li>
              </ul>
            </div>

            <div>
              <p className="text-sm text-gray-800 font-medium mb-2">
                Example:
              </p>
              <pre className="text-xs text-gray-700 overflow-x-auto bg-gray-50 p-3 rounded border border-gray-200">
{`# Root-level array of questions
# Each option has is_correct: true/false to mark correct answers
- title: "Basic Addition"
  text: "What is 2+2?"
  type: "SINGLE"
  visibility: "public"
  options:
    - text: "3"
      is_correct: false
    - text: "4"
      is_correct: true
      explanation: "2+2=4"
    - text: "5"
      is_correct: false
  tags: ["math", "easy"]

- title: "Prime Numbers Selection"
  text: "Select all prime numbers"
  type: "MULTIPLE"
  visibility: "private"
  options:
    - text: "2"
      is_correct: true
    - text: "3"
      is_correct: true
    - text: "4"
      is_correct: false
    - text: "5"
      is_correct: true
  tags: ["math"]`}
              </pre>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Download our <a href="/questions-example.yaml" download className="text-tech underline hover:text-primary font-medium">example YAML file</a> with 4 sample questions covering all visibility levels and demonstrating explanations.
              </p>
            </div>
          </div>
        )}

        {/* Result messages (shown in text and file tabs only) */}
        {inputMode !== 'reference' && result && result.success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 font-medium">
              Successfully imported {result.count} question{result.count !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {inputMode !== 'reference' && error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default YamlUpload;
