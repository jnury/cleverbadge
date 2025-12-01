import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

const TestResults = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const {
    score,
    candidateName,
    passThreshold,
    questions,
    answers,
    feedback,
    showExplanations
  } = location.state || {};

  const [reviewMode, setReviewMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Redirect if no state
  if (score === undefined) {
    navigate(`/t/${slug}`);
    return null;
  }

  const scoreNum = parseFloat(score);
  const threshold = passThreshold ?? 0;
  const canReview = showExplanations === 'after_submit' && questions && feedback;

  // Determine result status based on pass_threshold
  let status = '';
  let statusColor = '';
  let statusBg = '';
  let statusBorder = '';

  if (threshold === 0) {
    // Neutral mode - no pass/fail, just show score
    status = 'Score';
    statusColor = 'text-gray-700';
    statusBg = 'bg-gray-50';
    statusBorder = 'border-gray-200';
  } else {
    // Pass/fail mode based on threshold
    if (scoreNum >= threshold) {
      status = 'Passed';
      statusColor = 'text-green-600';
      statusBg = 'bg-green-50';
      statusBorder = 'border-green-200';
    } else {
      status = 'Not Passed';
      statusColor = 'text-red-600';
      statusBg = 'bg-red-50';
      statusBorder = 'border-red-200';
    }
  }

  // Get feedback for a specific question
  const getFeedbackForQuestion = (questionId) => {
    if (!feedback) return null;
    return feedback.find(f => f.question_id === questionId);
  };

  // Review mode rendering
  if (reviewMode && canReview) {
    const currentQuestion = questions[currentIndex];
    const questionFeedback = getFeedbackForQuestion(currentQuestion.id);
    const userAnswer = answers[currentQuestion.id] || [];

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setReviewMode(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Results
          </button>
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-tech h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {(() => {
            // Determine if the question was answered correctly
            const correctOptionIds = questionFeedback?.all
              ? questionFeedback.all.filter(o => o.is_correct).map(o => o.id)
              : questionFeedback?.selected?.filter(o => o.is_correct).map(o => o.id) || [];
            const userSelectedIds = userAnswer.map(String);

            // Question is correct if user selected exactly all correct options
            const isQuestionCorrect =
              correctOptionIds.length > 0 &&
              correctOptionIds.every(id => userSelectedIds.includes(id)) &&
              userSelectedIds.every(id => correctOptionIds.includes(id));

            return (
              <div className="flex items-start gap-3 mb-3">
                <span className={`flex-shrink-0 mt-1 ${isQuestionCorrect ? 'text-green-600' : 'text-red-500'}`}>
                  {isQuestionCorrect ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </span>
                <h2 className="text-xl font-bold text-gray-800">
                  {currentQuestion.title || `Question ${currentIndex + 1}`}
                </h2>
              </div>
            );
          })()}

          <div className="text-lg text-gray-600 mb-6">
            <MarkdownRenderer content={currentQuestion.text} />
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const optionId = option.id;
              const optionText = option.text;
              const isSelected = userAnswer.includes(optionId);

              // Get feedback for this option
              let optionFeedback = null;
              let isCorrect = false;
              let explanation = null;

              if (questionFeedback) {
                // Check in 'all' array first
                if (questionFeedback.all) {
                  optionFeedback = questionFeedback.all.find(f => f.id === String(optionId));
                }
                // Fallback to 'selected' array
                if (!optionFeedback) {
                  optionFeedback = questionFeedback.selected?.find(f => f.id === String(optionId));
                }
                if (optionFeedback) {
                  isCorrect = optionFeedback.is_correct;
                  explanation = optionFeedback.explanation;
                }
              }

              const hasFeedback = !!optionFeedback;

              // Determine styling
              let borderClass = 'border-gray-200 bg-gray-50';
              let textClass = 'text-gray-500';
              let indicatorClass = 'border-gray-300';

              if (hasFeedback) {
                if (isSelected && isCorrect) {
                  // User selected correct answer
                  borderClass = 'border-green-500 bg-green-50';
                  textClass = 'text-green-800 font-medium';
                  indicatorClass = 'border-green-500 bg-green-500';
                } else if (isSelected && !isCorrect) {
                  // User selected wrong answer
                  borderClass = 'border-red-400 bg-red-50';
                  textClass = 'text-red-800 font-medium';
                  indicatorClass = 'border-red-400 bg-red-400';
                } else if (!isSelected && isCorrect) {
                  // Correct answer user missed
                  borderClass = 'border-green-500 bg-green-50';
                  textClass = 'text-green-700';
                  indicatorClass = 'border-green-500'; // Not filled, just border
                }
              }

              return (
                <div
                  key={optionId}
                  className={`p-4 border-2 rounded-lg ${borderClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 flex-shrink-0 border-2 ${indicatorClass} ${
                      currentQuestion.type === 'SINGLE' ? 'rounded-full' : 'rounded'
                    }`} />
                    <div className={`flex-1 ${textClass}`}>
                      <MarkdownRenderer content={optionText} />
                      {explanation && (
                        <p className="mt-2 text-sm text-gray-600 italic border-t pt-2">
                          {explanation}
                        </p>
                      )}
                    </div>
                    {hasFeedback && (
                      <span className={`ml-2 flex-shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        {isCorrect ? '✓' : (isSelected ? '✗' : '')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setReviewMode(false)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Results
          </button>
          <button
            onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
            disabled={currentIndex === questions.length - 1}
            className="px-6 py-2 bg-tech hover:bg-tech/90 text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // Normal results view
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-tech"
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

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Test Completed!
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you, {candidateName}
        </p>

        <div className={`${statusBg} ${statusBorder} border-2 rounded-lg p-8 mb-6`}>
          <div className="text-6xl font-bold text-primary mb-2">
            {Math.round(scoreNum)}%
          </div>
          <div className={`text-xl font-semibold ${statusColor}`}>
            {status.toUpperCase()}
          </div>
        </div>

        {canReview && (
          <button
            onClick={() => setReviewMode(true)}
            className="mb-6 px-6 py-3 bg-tech hover:bg-tech/90 text-white font-semibold rounded-md transition-colors"
          >
            Review Your Answers
          </button>
        )}

        <p className="text-gray-600 text-sm">
          You may close this page.
        </p>
      </div>
    </div>
  );
};

export default TestResults;
