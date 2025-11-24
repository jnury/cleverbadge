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
  const [searchTag, setSearchTag] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    fetchQuestions();
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

  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'ALL' && q.type !== filterType) return false;
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
        <div className="flex gap-4">
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.type}
                    </span>
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

                  <p className="text-gray-900 font-medium mb-2 font-mono text-sm">{question.text}</p>

                  <div className="text-sm text-gray-600">
                    <strong>Options:</strong> {Array.isArray(question.options) ? question.options.join(', ') : JSON.stringify(question.options)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    <strong>Correct:</strong> {Array.isArray(question.correct_answers) ? question.correct_answers.join(', ') : JSON.stringify(question.correct_answers)}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewQuestion(question)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingQuestion(question)}
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

      {/* Preview Modal */}
      {previewQuestion && (
        <Modal
          isOpen={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          title="Question Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                previewQuestion.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {previewQuestion.type}
              </span>
              {previewQuestion.tags && previewQuestion.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-xl font-bold text-gray-800 mb-4">
                <MarkdownRenderer content={previewQuestion.text} />
              </div>

              <div className="space-y-2">
                {previewQuestion.options.map((option, index) => {
                  const isCorrect = previewQuestion.correct_answers.includes(option);
                  return (
                    <div
                      key={index}
                      className={`p-3 border-2 rounded-lg ${
                        isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <MarkdownRenderer content={option} />
                      {isCorrect && (
                        <span className="text-xs text-green-600 font-semibold ml-2">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setPreviewQuestion(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

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

      {/* Edit Modal */}
      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          title="Edit Question"
          size="lg"
        >
          <QuestionForm
            question={editingQuestion}
            onSubmit={handleEdit}
            onCancel={() => setEditingQuestion(null)}
          />
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
              "{deleteConfirm.text}"
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone.
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
