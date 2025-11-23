import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const QuestionRunner = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Get data from navigation state
  const { assessmentId, questions, candidateName } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Redirect if no state
  useEffect(() => {
    if (!assessmentId || !questions) {
      navigate(`/t/${slug}`);
    }
  }, [assessmentId, questions, slug, navigate]);

  if (!questions || questions.length === 0) {
    return <div>Loading...</div>;
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Get current answer
  const currentAnswer = answers[currentQuestion.id] || [];

  const handleOptionChange = (optionIndex) => {
    if (currentQuestion.type === 'SINGLE') {
      // Single choice - replace selection
      setAnswers({
        ...answers,
        [currentQuestion.id]: [optionIndex]
      });
    } else {
      // Multiple choice - toggle selection
      const current = answers[currentQuestion.id] || [];
      if (current.includes(optionIndex)) {
        setAnswers({
          ...answers,
          [currentQuestion.id]: current.filter(o => o !== optionIndex)
        });
      } else {
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...current, optionIndex]
        });
      }
    }
  };

  const saveAnswer = async () => {
    const selectedOptions = answers[currentQuestion.id] || [];

    if (selectedOptions.length === 0) {
      return; // Don't save empty answers
    }

    try {
      await fetch(`${apiUrl}/api/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_options: selectedOptions
        })
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const handleNext = async () => {
    await saveAnswer();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
      return;
    }

    setSubmitting(true);

    // Save current answer
    await saveAnswer();

    try {
      // Submit assessment
      const response = await fetch(`${apiUrl}/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to submit assessment');

      const data = await response.json();

      // Navigate to results page
      navigate(`/t/${slug}/result`, {
        state: {
          score: data.score_percentage,
          candidateName
        }
      });
    } catch (err) {
      alert('Failed to submit test: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {candidateName}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-tech h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentAnswer.includes(index);
            const inputType = currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox';

            return (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-tech bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type={inputType}
                  name={`question-${currentQuestion.id}`}
                  checked={isSelected}
                  onChange={() => handleOptionChange(index)}
                  className="mr-3"
                />
                <span className="text-gray-800">{option}</span>
              </label>
            );
          })}
        </div>

        {currentQuestion.type === 'MULTIPLE' && (
          <p className="text-sm text-gray-500 mt-4">
            Select all that apply
          </p>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-2 bg-accent hover:bg-accent-dark text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-tech hover:bg-tech/90 text-white font-semibold rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionRunner;
