import React, { useState, useEffect } from 'react';
import { useUrlParams } from '../../hooks/useUrlParams';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import QuestionForm from './QuestionForm';
import Modal from '../../components/ui/Modal';
import YamlUpload from '../../components/YamlUpload';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const QuestionsTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL-synced filters
  const [urlParams, setParam] = useUrlParams({
    type: null,
    visibility: null,
    author: null,
    tag: null,
    sort: null
  });

  // Map URL params to filter values (null -> 'ALL' for dropdowns)
  const filterType = urlParams.type || 'ALL';
  const filterVisibility = urlParams.visibility || 'ALL';
  const filterAuthor = urlParams.author || 'ALL';
  const searchTag = urlParams.tag || '';
  const sortOrder = urlParams.sort || null;

  const [authors, setAuthors] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [previewData, setPreviewData] = useState(null); // Live preview data
  const [previewSelections, setPreviewSelections] = useState([]); // Preview selected options
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // null | 'delete' | 'changeAuthor' | 'addToTest' | 'changeVisibility'
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [tests, setTests] = useState([]);
  const [users, setUsers] = useState([]);
  const [forceRemoveFromTests, setForceRemoveFromTests] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');
  const [successRates, setSuccessRates] = useState({});

  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    fetchQuestions();
    fetchAuthors();
    fetchTests();
    fetchUsers();
    fetchSuccessRates();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/questions');
      setQuestions(data.questions || []);
    } catch (error) {
      showError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthors = async () => {
    try {
      const data = await apiRequest('/api/questions/authors');
      setAuthors(data.authors || []);
    } catch (error) {
      // Silent fail - authors filter just won't work
      console.error('Failed to load authors:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const data = await apiRequest('/api/tests');
      setTests(data.tests || []);
    } catch (error) {
      console.error('Failed to load tests:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiRequest('/api/questions/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const fetchSuccessRates = async () => {
    try {
      const data = await apiRequest('/api/questions/success-rates');
      setSuccessRates(data.success_rates || {});
    } catch (error) {
      console.error('Failed to load success rates:', error);
    }
  };

  const handleCreate = async (questionData) => {
    try {
      await apiRequest('/api/questions', {
        method: 'POST',
        body: JSON.stringify(questionData)
      });
      showSuccess('Question created successfully');
      setIsFormOpen(false);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to create question');
    }
  };

  const handleEdit = async (questionData) => {
    try {
      await apiRequest(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify(questionData)
      });
      showSuccess('Question updated successfully');
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to update question');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/questions/${id}`, {
        method: 'DELETE'
      });
      showSuccess('Question deleted successfully');
      setDeleteConfirm(null);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to delete question');
    }
  };

  const handleUploadSuccess = (data) => {
    showSuccess(`Successfully imported ${data.imported_count} questions`);
    setIsImportOpen(false);
    fetchQuestions();
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedQuestions.map(q => q.id)));
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSortToggle = () => {
    const next = sortOrder === null ? 'asc' : sortOrder === 'asc' ? 'desc' : null;
    setParam('sort', next);
  };

  const handleBulkDelete = async () => {
    try {
      const data = await apiRequest('/api/questions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          question_ids: Array.from(selectedIds),
          force_remove_from_tests: forceRemoveFromTests
        })
      });

      if (data.skipped > 0) {
        showSuccess(`Deleted ${data.deleted} questions, ${data.skipped} skipped (in tests)`);
      } else {
        showSuccess(`Deleted ${data.deleted} questions`);
      }

      setSelectedIds(new Set());
      setBulkAction(null);
      setForceRemoveFromTests(false);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to delete questions');
    }
  };

  const handleBulkChangeAuthor = async () => {
    if (!selectedAuthorId) {
      showError('Please select an author');
      return;
    }

    try {
      const data = await apiRequest('/api/questions/bulk-change-author', {
        method: 'POST',
        body: JSON.stringify({
          question_ids: Array.from(selectedIds),
          author_id: selectedAuthorId
        })
      });

      showSuccess(`Updated author for ${data.updated} questions`);
      setSelectedIds(new Set());
      setBulkAction(null);
      setSelectedAuthorId('');
      fetchQuestions();
      fetchAuthors();
    } catch (error) {
      showError(error.message || 'Failed to change author');
    }
  };

  const handleBulkAddToTest = async () => {
    if (!selectedTestId) {
      showError('Please select a test');
      return;
    }

    try {
      const data = await apiRequest(`/api/tests/${selectedTestId}/questions/bulk-add`, {
        method: 'POST',
        body: JSON.stringify({
          question_ids: Array.from(selectedIds)
        })
      });

      const testName = tests.find(t => t.id === selectedTestId)?.title || 'test';
      if (data.skipped > 0) {
        showSuccess(`Added ${data.added} questions to "${testName}", ${data.skipped} already in test`);
      } else {
        showSuccess(`Added ${data.added} questions to "${testName}"`);
      }

      setSelectedIds(new Set());
      setBulkAction(null);
      setSelectedTestId('');
    } catch (error) {
      showError(error.message || 'Failed to add questions to test');
    }
  };

  const handleBulkChangeVisibility = async () => {
    if (!selectedVisibility) {
      showError('Please select a visibility');
      return;
    }

    try {
      const data = await apiRequest('/api/questions/bulk-change-visibility', {
        method: 'POST',
        body: JSON.stringify({
          question_ids: Array.from(selectedIds),
          visibility: selectedVisibility
        })
      });

      showSuccess(`Updated visibility for ${data.updated} questions`);
      setSelectedIds(new Set());
      setBulkAction(null);
      setSelectedVisibility('');
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to change visibility');
    }
  };

  const getSuccessRateBadge = (questionId) => {
    const rateData = successRates[questionId];
    if (!rateData || rateData.success_rate === null) {
      return <span className="text-gray-400 text-sm">-</span>;
    }
    const rate = rateData.success_rate;
    let bgColor, textColor;
    if (rate >= 70) {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
    } else if (rate >= 40) {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
    } else {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${bgColor} ${textColor}`} title={`${rateData.correct_attempts}/${rateData.total_attempts} correct`}>
        {rate}%
      </span>
    );
  };

  const hasChanges = () => {
    if (!editingQuestion || !previewData) return false;

    // Compare relevant fields
    if (previewData.title !== editingQuestion.title) return true;
    if (previewData.text !== editingQuestion.text) return true;
    if (previewData.type !== editingQuestion.type) return true;
    if (previewData.visibility !== editingQuestion.visibility) return true;

    // Compare options - handle both array (form) and dict (API) formats
    const previewOpts = previewData.options || [];
    const origOpts = editingQuestion.options || {};

    // Convert original options from dict to array for comparison
    const origOptsArray = typeof origOpts === 'object' && !Array.isArray(origOpts)
      ? Object.entries(origOpts)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([_, opt]) => ({
            text: opt.text || '',
            is_correct: opt.is_correct || false,
            explanation: opt.explanation || ''
          }))
      : origOpts;

    if (previewOpts.length !== origOptsArray.length) return true;

    // Compare each option's text, is_correct, and explanation
    for (let i = 0; i < previewOpts.length; i++) {
      const prev = previewOpts[i];
      const orig = origOptsArray[i];
      if (prev.text !== orig.text) return true;
      if (prev.is_correct !== orig.is_correct) return true;
      if ((prev.explanation || '') !== (orig.explanation || '')) return true;
    }

    // Compare tags arrays
    const previewTags = previewData.tags || [];
    const origTags = editingQuestion.tags || [];
    if (previewTags.length !== origTags.length) return true;
    if (previewTags.some((tag, i) => tag !== origTags[i])) return true;

    return false;
  };

  const getVisibilityBadge = (visibility) => {
    const badges = {
      public: { bg: 'bg-green-100', text: 'text-green-800', label: 'Public' },
      private: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Private' },
      protected: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Protected' }
    };
    const badge = badges[visibility] || badges.private;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'ALL' && q.type !== filterType) return false;
    if (filterVisibility !== 'ALL' && q.visibility !== filterVisibility) return false;
    if (filterAuthor !== 'ALL' && q.author_id !== filterAuthor) return false;
    if (searchTag && !q.tags?.some(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))) return false;
    return true;
  });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortOrder) return 0;
    const comparison = (a.title || '').localeCompare(b.title || '');
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your question bank
            {selectedIds.size > 0 && (
              <span className="ml-2 font-medium text-tech">
                ({selectedIds.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {/* Bulk Actions Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
            >
              Bulk Actions
            </Button>
            {bulkDropdownOpen && selectedIds.size > 0 && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('delete'); setBulkDropdownOpen(false); }}
                >
                  Delete selected
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('changeAuthor'); setBulkDropdownOpen(false); }}
                >
                  Change author
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('changeVisibility'); setBulkDropdownOpen(false); }}
                >
                  Change visibility
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('addToTest'); setBulkDropdownOpen(false); }}
                >
                  Add to test
                </button>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => setIsImportOpen(true)}
          >
            Import Questions
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            Create Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end mb-4">
        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setParam('type', e.target.value === 'ALL' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="ALL">All Types</option>
            <option value="SINGLE">Single Choice</option>
            <option value="MULTIPLE">Multiple Choice</option>
          </select>
        </div>

        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            value={filterVisibility}
            onChange={(e) => setParam('visibility', e.target.value === 'ALL' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="ALL">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="protected">Protected</option>
          </select>
        </div>

        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <select
            value={filterAuthor}
            onChange={(e) => setParam('author', e.target.value === 'ALL' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="ALL">All Authors</option>
            {authors.map(author => (
              <option key={author.id} value={author.id}>{author.username}</option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Tags</label>
          <input
            type="text"
            value={searchTag}
            onChange={(e) => setParam('tag', e.target.value || null)}
            placeholder="Filter by tag..."
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          />
        </div>

        <div className="text-sm text-gray-600 ml-auto">
          Showing {sortedQuestions.length} of {questions.length} questions
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {sortedQuestions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No questions found. Create your first question to get started!
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedQuestions.length && sortedQuestions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={handleSortToggle}
                >
                  Title {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : ''}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedQuestions.map(question => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(question.id)}
                      onChange={() => handleSelectOne(question.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={question.title}>
                      {question.title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getVisibilityBadge(question.visibility)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {question.author_username || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 truncate max-w-[150px]" title={question.tags?.join(', ')}>
                      {question.tags?.join(', ') || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getSuccessRateBadge(question.id)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {/* Preview */}
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setPreviewData(question);
                          setPreviewSelections([]);
                          setActiveTab('preview');
                        }}
                        className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                        title="Preview"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setPreviewData(question);
                          setPreviewSelections([]);
                          setActiveTab('edit');
                        }}
                        className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(question)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Create Question"
          size="lg"
        >
          <QuestionForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}

      {/* Question Modal with Tabs */}
      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => {
            setEditingQuestion(null);
            setPreviewSelections([]);
            setActiveTab('edit');
          }}
          title="Question"
          size="lg"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ display: activeTab === 'edit' ? 'block' : 'none' }}>
            <QuestionForm
              key={editingQuestion?.id}
              question={editingQuestion}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditingQuestion(null);
                setPreviewData(null);
                setPreviewSelections([]);
                setActiveTab('edit');
              }}
              onFormChange={setPreviewData}
              hideButtons={true}
            />
          </div>

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                {/* Question title */}
                {(previewData?.title || editingQuestion.title) && (
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    {previewData?.title || editingQuestion.title}
                  </h2>
                )}

                {/* Question text - lighter font weight */}
                <div className="text-lg text-gray-600 mb-6">
                  <MarkdownRenderer content={previewData?.text || editingQuestion.text || ''} />
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Normalize options to array of {text, is_correct} objects
                    let optionsArray = [];
                    const opts = previewData?.options || editingQuestion.options || [];

                    if (Array.isArray(opts)) {
                      // From form: [{text, is_correct, explanation}, ...]
                      optionsArray = opts;
                    } else if (typeof opts === 'object') {
                      // From API: {"0": {text, is_correct}, ...}
                      optionsArray = Object.entries(opts)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([_, opt]) => ({
                          text: opt.text || '',
                          is_correct: opt.is_correct || false,
                          explanation: opt.explanation || ''
                        }));
                    }

                    return optionsArray.map((option, index) => {
                      const questionType = previewData?.type || editingQuestion.type;
                      const optionText = typeof option === 'object' ? option.text : option;
                      const isSelected = previewSelections.includes(optionText);

                      const handleOptionClick = () => {
                        if (questionType === 'SINGLE') {
                          setPreviewSelections([optionText]);
                        } else {
                          // MULTIPLE: toggle selection
                          if (isSelected) {
                            setPreviewSelections(previewSelections.filter(o => o !== optionText));
                          } else {
                            setPreviewSelections([...previewSelections, optionText]);
                          }
                        }
                      };

                      return (
                        <label
                          key={index}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-tech bg-tech/10 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={handleOptionClick}
                        >
                          <input
                            type={questionType === 'SINGLE' ? 'radio' : 'checkbox'}
                            name="preview-question"
                            checked={isSelected}
                            onChange={() => {}} // Handled by label onClick
                            className="mr-3 flex-shrink-0"
                          />
                          <div className={`flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                            <MarkdownRenderer content={optionText || ''} />
                          </div>
                        </label>
                      );
                    });
                  })()}
                </div>

                {(previewData?.type || editingQuestion.type) === 'MULTIPLE' && (
                  <p className="text-sm text-gray-500 mt-4">
                    Select all that apply
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Buttons visible in both tabs */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingQuestion(null);
                setPreviewData(null);
                setPreviewSelections([]);
                setActiveTab('edit');
              }}
            >
              Close
            </Button>
            {hasChanges() && (
              <Button
                type="button"
                onClick={() => {
                  // Trigger form submission by getting the form element
                  const form = document.querySelector('form');
                  if (form) {
                    form.requestSubmit();
                  }
                }}
              >
                Update Question
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete this question?
            </p>
            <p className="text-sm text-gray-600 italic">
              "{deleteConfirm.title || deleteConfirm.text}"
            </p>
            <p className="text-sm text-gray-500">
              Note: Questions that are part of a test cannot be deleted. Remove them from tests first.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete Question
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Questions Modal */}
      {isImportOpen && (
        <Modal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          title="Import Questions from YAML"
          size="lg"
        >
          <YamlUpload onUploadSuccess={handleUploadSuccess} />
        </Modal>
      )}

      {/* Bulk Delete Modal */}
      {bulkAction === 'delete' && (
        <Modal
          isOpen={true}
          onClose={() => { setBulkAction(null); setForceRemoveFromTests(false); }}
          title={`Delete ${selectedIds.size} Questions`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              This will permanently delete {selectedIds.size} question{selectedIds.size > 1 ? 's' : ''}.
            </p>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="forceRemove"
                checked={forceRemoveFromTests}
                onChange={(e) => setForceRemoveFromTests(e.target.checked)}
                className="mt-1 rounded border-gray-300"
              />
              <label htmlFor="forceRemove" className="text-sm text-gray-600">
                Remove from tests first (questions in tests will be skipped otherwise)
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => { setBulkAction(null); setForceRemoveFromTests(false); }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Change Author Modal */}
      {bulkAction === 'changeAuthor' && (
        <Modal
          isOpen={true}
          onClose={() => { setBulkAction(null); setSelectedAuthorId(''); }}
          title={`Change Author for ${selectedIds.size} Questions`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Author
              </label>
              <select
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select author...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => { setBulkAction(null); setSelectedAuthorId(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkChangeAuthor}
                disabled={!selectedAuthorId}
              >
                Change Author
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Add to Test Modal */}
      {bulkAction === 'addToTest' && (
        <Modal
          isOpen={true}
          onClose={() => { setBulkAction(null); setSelectedTestId(''); }}
          title={`Add ${selectedIds.size} Questions to Test`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Test
              </label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select test...</option>
                {tests.map(test => (
                  <option key={test.id} value={test.id}>{test.title}</option>
                ))}
              </select>
            </div>

            <p className="text-sm text-gray-500">
              Questions already in the test will be skipped.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => { setBulkAction(null); setSelectedTestId(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAddToTest}
                disabled={!selectedTestId}
              >
                Add to Test
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Change Visibility Modal */}
      {bulkAction === 'changeVisibility' && (
        <Modal
          isOpen={true}
          onClose={() => { setBulkAction(null); setSelectedVisibility(''); }}
          title={`Change Visibility for ${selectedIds.size} Questions`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Visibility
              </label>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select visibility...</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="protected">Protected</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => { setBulkAction(null); setSelectedVisibility(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkChangeVisibility}
                disabled={!selectedVisibility}
              >
                Change Visibility
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuestionsTab;
