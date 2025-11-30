import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { saveAssessment, clearAssessment } from '../utils/assessmentStorage';

const QuestionRunner = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Get data from navigation state
  const {
    assessmentId,
    questions,
    candidateName,
    testSlug,
    currentQuestionIndex = 0,
    answers: savedAnswers = {},
    isResuming = false,
    showExplanations = 'never',
    explanationScope = 'all_answers'
  } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(currentQuestionIndex);
  const [answers, setAnswers] = useState(savedAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState({}); // Store feedback per question

  const isAfterEachQuestion = showExplanations === 'after_each_question';

  // Redirect if no state
  useEffect(() => {
    if (!assessmentId || !questions) {
      navigate(`/t/${slug}`);
    }
  }, [assessmentId, questions, slug, navigate]);

  // Save progress to LocalStorage whenever answers or currentIndex changes
  useEffect(() => {
    if (assessmentId && testSlug && questions) {
      saveAssessment(testSlug, {
        assessmentId,
        candidateName,
        currentQuestionIndex: currentIndex,
        answers,
        questions
      });
    }
  }, [assessmentId, testSlug, candidateName, currentIndex, answers, questions]);

  if (!questions || questions.length === 0) {
    return <div>Loading...</div>;
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Get current answer
  const currentAnswer = answers[currentQuestion.id] || [];

  // Check if current question has feedback (meaning it was submitted)
  const currentFeedback = questionFeedback[currentQuestion.id];
  const isCurrentQuestionSubmitted = !!currentFeedback;
  const hasAnswer = currentAnswer.length > 0;

  // Handle submitting answer to see immediate feedback
  const handleSubmitForFeedback = async () => {
    const selectedOptions = answers[currentQuestion.id] || [];
    if (selectedOptions.length === 0) return;

    try {
      const response = await fetch(`${apiUrl}/api/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_options: selectedOptions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Check for expired/abandoned assessment
        if (errorData.code === 'ASSESSMENT_EXPIRED' || errorData.code === 'ASSESSMENT_ABANDONED') {
          clearAssessment(testSlug);
          alert('Your assessment has expired (2-hour time limit). You will be redirected to start a new test.');
          navigate(`/t/${slug}`);
          return;
        }
        throw new Error(errorData.error || 'Failed to submit answer');
      }

      const data = await response.json();

      // Store feedback if provided
      if (data.feedback) {
        setQuestionFeedback(prev => ({
          ...prev,
          [currentQuestion.id]: data.feedback
        }));
      }
    } catch (err) {
      console.error('Failed to submit for feedback:', err);
      alert('Failed to submit answer: ' + err.message);
    }
  };

  const handleOptionChange = (optionId) => {
    if (currentQuestion.type === 'SINGLE') {
      // Single choice - replace selection
      setAnswers({
        ...answers,
        [currentQuestion.id]: [optionId]
      });
    } else {
      // Multiple choice - toggle selection
      const current = answers[currentQuestion.id] || [];
      if (current.includes(optionId)) {
        setAnswers({
          ...answers,
          [currentQuestion.id]: current.filter(o => o !== optionId)
        });
      } else {
        setAnswers({
          ...answers,
          [currentQuestion.id]: [...current, optionId]
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
      const response = await fetch(`${apiUrl}/api/assessments/${assessmentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_options: selectedOptions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Check for expired/abandoned assessment
        if (errorData.code === 'ASSESSMENT_EXPIRED' || errorData.code === 'ASSESSMENT_ABANDONED') {
          clearAssessment(testSlug);
          alert('Your assessment has expired (2-hour time limit). You will be redirected to start a new test.');
          navigate(`/t/${slug}`);
          return;
        }
      }
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

      if (!response.ok) {
        const errorData = await response.json();
        // Check for expired/abandoned assessment
        if (errorData.code === 'ASSESSMENT_EXPIRED' || errorData.code === 'ASSESSMENT_ABANDONED') {
          clearAssessment(testSlug);
          alert('Your assessment has expired (2-hour time limit). You will be redirected to start a new test.');
          navigate(`/t/${slug}`);
          return;
        }
        throw new Error(errorData.error || 'Failed to submit assessment');
      }

      const data = await response.json();

      // Clear LocalStorage on successful submit
      if (testSlug) {
        clearAssessment(testSlug);
      }

      // Navigate to results page
      navigate(`/t/${slug}/result`, {
        state: {
          score: data.score_percentage,
          candidateName,
          passThreshold: data.pass_threshold
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
        {/* Question title */}
        {currentQuestion.title && (
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            {currentQuestion.title}
          </h2>
        )}

        {/* Question text - lighter font weight */}
        <div className="text-lg text-gray-600 mb-6">
          <MarkdownRenderer content={currentQuestion.text} />
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            // Options are now objects with { id, text } from the new format
            const optionId = option.id || option;
            const optionText = option.text || option;
            const isSelected = currentAnswer.includes(optionId);
            const inputType = currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox';

            // Get feedback for this option if available
            let optionFeedback = null;
            let isCorrect = false;
            let explanation = null;

            if (currentFeedback) {
              // Check in 'all' array first (if scope is all_answers)
              if (currentFeedback.all) {
                optionFeedback = currentFeedback.all.find(f => f.id === String(optionId));
              }
              // Fallback to 'selected' array
              if (!optionFeedback) {
                optionFeedback = currentFeedback.selected?.find(f => f.id === String(optionId));
              }
              if (optionFeedback) {
                isCorrect = optionFeedback.is_correct;
                explanation = optionFeedback.explanation;
              }
            }

            const hasFeedbackForOption = !!optionFeedback;

            // Determine styling based on feedback state
            let borderClass = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
            let textClass = 'text-gray-700';

            if (isSelected && !isCurrentQuestionSubmitted) {
              borderClass = 'border-tech bg-tech/10 shadow-sm';
              textClass = 'text-gray-900 font-medium';
            } else if (isCurrentQuestionSubmitted && hasFeedbackForOption) {
              // Show feedback styling
              if (isCorrect) {
                borderClass = 'border-green-500 bg-green-50';
                textClass = isSelected ? 'text-green-800 font-medium' : 'text-green-700';
              } else if (isSelected) {
                borderClass = 'border-red-400 bg-red-50';
                textClass = 'text-red-800 font-medium';
              } else {
                borderClass = 'border-gray-200 bg-gray-50';
                textClass = 'text-gray-500';
              }
            } else if (isCurrentQuestionSubmitted) {
              // Question submitted but no feedback for this option (scope is selected_only)
              borderClass = 'border-gray-200 bg-gray-50';
              textClass = 'text-gray-500';
            }

            // Determine indicator styling based on state
            let indicatorClass = 'border-gray-300';
            if (isSelected && !isCurrentQuestionSubmitted) {
              indicatorClass = 'border-tech bg-tech';
            } else if (isCurrentQuestionSubmitted && hasFeedbackForOption) {
              if (isCorrect) {
                indicatorClass = isSelected ? 'border-green-500 bg-green-500' : 'border-green-500 bg-green-500';
              } else if (isSelected) {
                indicatorClass = 'border-red-400 bg-red-400';
              } else {
                indicatorClass = 'border-gray-300';
              }
            } else if (isCurrentQuestionSubmitted) {
              indicatorClass = 'border-gray-300';
            }

            return (
              <div
                key={optionId}
                onClick={() => !isCurrentQuestionSubmitted && handleOptionChange(optionId)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isCurrentQuestionSubmitted ? '' : 'cursor-pointer'
                } ${borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 flex-shrink-0 border-2 ${indicatorClass} ${
                    currentQuestion.type === 'SINGLE' ? 'rounded-full' : 'rounded'
                  }`} />
                  <div className={`flex-1 ${textClass}`}>
                    <MarkdownRenderer content={optionText} />
                    {isCurrentQuestionSubmitted && explanation && (
                      <p className="mt-2 text-sm text-gray-600 italic border-t pt-2">
                        {explanation}
                      </p>
                    )}
                  </div>
                  {isCurrentQuestionSubmitted && hasFeedbackForOption && (
                    <span className={`ml-2 flex-shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                      {isCorrect ? '✓' : (isSelected ? '✗' : '')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {currentQuestion.type === 'MULTIPLE' && !isCurrentQuestionSubmitted && (
          <p className="text-sm text-gray-500 mt-4">
            Select all that apply
          </p>
        )}

        {/* Submit Answer button for after_each_question mode */}
        {isAfterEachQuestion && !isCurrentQuestionSubmitted && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSubmitForFeedback}
              disabled={!hasAnswer}
              className="px-8 py-2 bg-accent hover:bg-accent-dark text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          </div>
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
