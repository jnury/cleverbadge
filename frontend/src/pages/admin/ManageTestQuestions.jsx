import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { apiRequest } from '../../utils/api';

const ManageTestQuestions = ({ test, isOpen, onClose, onUpdate }) => {
  const [testQuestions, setTestQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [weight, setWeight] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && test) {
      loadData();
    }
  }, [isOpen, test]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load test questions
      const testQuestionsData = await apiRequest(`/api/tests/${test.id}/questions`);
      setTestQuestions(testQuestionsData.questions || []);

      // Load all questions
      const allQuestionsData = await apiRequest('/api/questions');
      setAllQuestions(allQuestionsData.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedQuestionId) return;

    setAdding(true);
    setError(null);
    try {
      await apiRequest(`/api/tests/${test.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          questions: [{ question_id: selectedQuestionId, weight: parseInt(weight) }]
        })
      });

      // Reload test questions
      await loadData();
      setSelectedQuestionId('');
      setWeight(1);
      onUpdate();
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to remove this question from the test?')) {
      return;
    }

    try {
      await apiRequest(`/api/tests/${test.id}/questions/${questionId}`, {
        method: 'DELETE'
      });

      // Reload test questions
      await loadData();
      onUpdate();
    } catch (err) {
      setError(err.message || 'Failed to remove question');
    }
  };

  // Filter out questions already in test
  const availableQuestions = allQuestions.filter(
    q => !testQuestions.some(tq => tq.id === q.id)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Questions" size="lg">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading questions...</p>
        </div>
      ) : (
        <>
          {/* Add Question Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add Question to Test</h4>
            {availableQuestions.length === 0 ? (
              <p className="text-gray-600 text-sm">
                All available questions have been added to this test.
              </p>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    value={selectedQuestionId}
                    onChange={(e) => setSelectedQuestionId(e.target.value)}
                    options={[
                      { value: '', label: 'Select a question...' },
                      ...availableQuestions.map(q => ({
                        value: q.id,
                        label: `${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}`
                      }))
                    ]}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Weight"
                  />
                </div>
                <Button
                  onClick={handleAddQuestion}
                  disabled={!selectedQuestionId || adding}
                  loading={adding}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Current Questions List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Current Questions ({testQuestions.length})
            </h4>
            {testQuestions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                No questions in this test yet. Add some above!
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded hover:border-gray-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{question.text}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          Type: <span className="font-medium">{question.type}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          Weight: <span className="font-medium">{question.weight}</span>
                        </span>
                        {question.tags && question.tags.length > 0 && (
                          <span className="text-xs text-gray-500">
                            Tags: {question.tags.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveQuestion(question.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ManageTestQuestions;
