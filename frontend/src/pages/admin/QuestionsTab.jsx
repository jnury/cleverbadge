import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import QuestionForm from './QuestionForm';
import Modal from '../../components/ui/Modal';
import YamlUpload from '../../components/YamlUpload';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const QuestionsTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterVisibility, setFilterVisibility] = useState('ALL');
  const [filterAuthor, setFilterAuthor] = useState('ALL');
  const [authors, setAuthors] = useState([]);
  const [searchTag, setSearchTag] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [previewData, setPreviewData] = useState(null); // Live preview data
  const [previewSelections, setPreviewSelections] = useState([]); // Preview selected options

  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    fetchQuestions();
    fetchAuthors();
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
        <div className="flex gap-3">
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
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">All Types</option>
              <option value="SINGLE">Single Choice</option>
              <option value="MULTIPLE">Multiple Choice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="protected">Protected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">All Authors</option>
              {authors.map(author => (
                <option key={author.id} value={author.id}>{author.username}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Tags</label>
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="Filter by tag..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No questions found. Create your first question to get started!
            </p>
          </Card>
        ) : (
          filteredQuestions.map(question => (
            <Card key={question.id} className="hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Title as primary display */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {question.title}
                  </h3>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.type}
                    </span>
                    {getVisibilityBadge(question.visibility)}
                    {question.tags && Array.isArray(question.tags) && question.tags.length > 0 && (
                      <div className="flex gap-1">
                        {question.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Question text preview */}
                  <p className="text-gray-600 text-sm font-mono">
                    {question.text.split('\n')[0].substring(0, 150)}{question.text.length > 150 ? '...' : ''}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingQuestion(question);
                      setPreviewData(question); // Initialize preview with current question
                      setPreviewSelections([]); // Reset preview selections
                      setActiveTab('edit');
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteConfirm(question)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
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

      {/* Edit Modal with Tabs */}
      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => {
            setEditingQuestion(null);
            setPreviewSelections([]);
            setActiveTab('edit');
          }}
          title="Edit Question"
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
                  {(previewData?.options || editingQuestion.options || []).map((option, index) => {
                    const questionType = previewData?.type || editingQuestion.type;
                    const isSelected = previewSelections.includes(option);

                    const handleOptionClick = () => {
                      if (questionType === 'SINGLE') {
                        setPreviewSelections([option]);
                      } else {
                        // MULTIPLE: toggle selection
                        if (isSelected) {
                          setPreviewSelections(previewSelections.filter(o => o !== option));
                        } else {
                          setPreviewSelections([...previewSelections, option]);
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
                          <MarkdownRenderer content={option || ''} />
                        </div>
                      </label>
                    );
                  })}
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
              Cancel
            </Button>
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
              {editingQuestion ? 'Update Question' : 'Create Question'}
            </Button>
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
    </div>
  );
};

export default QuestionsTab;
