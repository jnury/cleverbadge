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
      const shuffledQuestions = data.questions.map(q => {
        const parsedOptions = parseOptions(q.options);
        return {
          ...q,
          shuffledOptions: shuffleArray(
            Object.entries(parsedOptions).map(([id, opt]) => ({ id, ...opt }))
          )
        };
      });

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

  // Parse options that might be JSON strings (handles legacy double-stringified data)
  const parseOptions = (options) => {
    if (!options) return {};
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch (e) {
        console.error('Failed to parse options:', e);
        return {};
      }
    }
    return options;
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
            {currentQuestion.shuffledOptions.map((option) => {
              const isCorrect = option.is_correct;
              const borderClass = showAnswers
                ? isCorrect
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-200';
              const indicatorClass = showAnswers
                ? isCorrect
                  ? 'border-green-500 bg-green-500'
                  : 'border-red-300 bg-red-300'
                : 'border-gray-300';

              return (
                <div
                  key={option.id}
                  className={`p-3 rounded-lg border-2 ${borderClass}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-5 h-5 flex-shrink-0 mt-0.5 border-2 ${indicatorClass} ${
                      currentQuestion.type === 'SINGLE' ? 'rounded-full' : 'rounded'
                    }`} />
                    <div className="flex-1 prose prose-sm max-w-none">
                      <MarkdownRenderer content={option.text} />
                      {showAnswers && option.explanation && (
                        <p className="mt-1 text-sm text-gray-600 italic">
                          {option.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
