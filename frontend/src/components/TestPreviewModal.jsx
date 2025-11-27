import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import MarkdownRenderer from './MarkdownRenderer';

const TestPreviewModal = ({ isOpen, onClose, testId, testTitle }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen && testId) {
      fetchQuestions();
    }
  }, [isOpen, testId]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/api/tests/${testId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();

      // Shuffle options for each question (simulating candidate view)
      const shuffledQuestions = data.questions.map(q => ({
        ...q,
        shuffledOptions: shuffleArray(
          Object.entries(q.options).map(([id, opt]) => ({ id, ...opt }))
        )
      }));

      setQuestions(shuffledQuestions);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const currentQuestion = questions[currentIndex];

  const handleClose = () => {
    setCurrentIndex(0);
    setShowAnswers(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Preview: ${testTitle}`} size="lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAnswers}
            onChange={(e) => setShowAnswers(e.target.checked)}
            className="rounded border-gray-300 text-tech focus:ring-tech"
          />
          <span className="text-sm font-medium text-gray-700">Show Answers</span>
        </label>
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {loading && <div className="text-center py-8">Loading questions...</div>}

      {error && (
        <div className="text-center py-8 text-red-600">{error}</div>
      )}

      {!loading && !error && currentQuestion && (
        <div className="space-y-4">
          {/* Question */}
          <div>
            {currentQuestion.title && (
              <h3 className="font-semibold text-gray-800 mb-2">{currentQuestion.title}</h3>
            )}
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={currentQuestion.text} />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.shuffledOptions.map((option) => (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 ${
                  showAnswers && option.is_correct
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                    showAnswers && option.is_correct
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {currentQuestion.type === 'SINGLE' ? '○' : '□'}
                  </span>
                  <div className="flex-1">
                    <span>{option.text}</span>
                    {showAnswers && option.explanation && (
                      <p className="mt-1 text-sm text-gray-600 italic">
                        {option.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TestPreviewModal;
