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

  // Truncate text helper
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Visibility badge helper
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

  // Visibility level constants
  const VISIBILITY_LEVEL = { public: 0, private: 1, protected: 2 };

  const canQuestionBeInTest = (questionVisibility, testVisibility) => {
    const questionLevel = VISIBILITY_LEVEL[questionVisibility] || 1;
    const testLevel = VISIBILITY_LEVEL[testVisibility] || 1;
    return testLevel >= questionLevel;
  };

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

  const handleAddQuestion = async (questionId) => {
    const qId = questionId || selectedQuestionId;
    if (!qId) return;

    setAdding(true);
    setError(null);
    try {
      await apiRequest(`/api/tests/${test.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          questions: [{ question_id: qId, weight: parseInt(weight) }]
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
    q => !testQuestions.some(tq => tq.question?.id === q.id || tq.id === q.id)
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
          {/* Test Visibility Display */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Test Visibility:</span>
            {getVisibilityBadge(test?.visibility)}
          </div>

          {/* Available Questions Section */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Available Questions ({availableQuestions.length})
            </h4>
            {availableQuestions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                All available questions have been added to this test.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableQuestions.map(question => {
                  const isCompatible = canQuestionBeInTest(question.visibility, test?.visibility);
                  return (
                    <div
                      key={question.id}
                      className={`p-3 border rounded ${isCompatible ? 'hover:bg-gray-50' : 'opacity-50 bg-gray-100'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{question.title}</div>
                          <div className="text-sm text-gray-600">{truncateText(question.text)}</div>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {question.type}
                            </span>
                            {getVisibilityBadge(question.visibility)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <div className="w-20">
                            <Input
                              type="number"
                              min="1"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              placeholder="Weight"
                              disabled={!isCompatible}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddQuestion(question.id)}
                            disabled={!isCompatible || adding}
                            title={!isCompatible ? `Cannot add ${question.visibility} question to ${test?.visibility} test` : ''}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      {!isCompatible && (
                        <p className="text-xs text-red-600 mt-1">
                          Cannot add to this test: {question.visibility} questions require {question.visibility} or higher test visibility
                        </p>
                      )}
                    </div>
                  );
                })}
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
                {testQuestions.map((tq) => (
                  <div
                    key={tq.id}
                    className="p-3 border rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{tq.question?.title || tq.title}</div>
                        <div className="text-sm text-gray-600">{truncateText(tq.question?.text || tq.text)}</div>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            (tq.question?.type || tq.type) === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {tq.question?.type || tq.type}
                          </span>
                          {getVisibilityBadge(tq.question?.visibility || tq.visibility)}
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            Weight: {tq.weight}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="danger" onClick={() => handleRemoveQuestion(tq.id)}>
                        Remove
                      </Button>
                    </div>
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
