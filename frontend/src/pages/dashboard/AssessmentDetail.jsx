import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const AssessmentDetail = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Store the referrer URL from location state, or default to assessments tab
  const backUrl = location.state?.from || '/dashboard?tab=assessments';
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAssessmentDetails();
  }, [assessmentId]);

  const fetchAssessmentDetails = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/assessments/${assessmentId}/details`);
      setAssessment(data.assessment);
      setAnswers(data.answers);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(navigator.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return null;
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-red-50 border border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(backUrl)}>
            Back to Assessments
          </Button>
        </Card>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <p className="text-center text-gray-500 py-8">Assessment not found</p>
          <div className="text-center">
            <Button variant="secondary" onClick={() => navigate(backUrl)}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate(backUrl)}
          className="mb-4"
        >
          <span className="mr-2">←</span> Back to Assessments
        </Button>

        <Card>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Assessment Details
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Candidate</span>
              <p className="text-lg font-semibold text-gray-900">{assessment.candidate_name}</p>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Test</span>
              <p className="text-lg text-gray-900">{assessment.test_title}</p>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Score</span>
              <p className={`text-3xl font-bold ${
                assessment.score_percentage >= 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {assessment.score_percentage !== null ? `${Math.round(assessment.score_percentage)}%` : 'N/A'}
              </p>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Correct Answers</span>
              <p className="text-lg text-gray-900">
                {assessment.correct_answers} / {assessment.total_questions}
              </p>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Status</span>
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                assessment.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {assessment.status}
              </span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-600 mb-1">Date</span>
              <p className="text-lg text-gray-900">
                {formatDate(assessment.started_at)}
                {assessment.completed_at && (
                  <span className="text-gray-500 ml-1">
                    ({formatDuration(assessment.started_at, assessment.completed_at)})
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Questions & Answers
        </h2>

        {answers.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">No answers recorded</p>
          </Card>
        ) : (
          answers.map((answer, index) => (
            <Card
              key={answer.question_id}
              className={`border-l-4 ${
                answer.is_correct ? 'border-green-500' : 'border-red-500'
              }`}
            >
              {/* Question header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-500">
                    Question {index + 1}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-semibold ${
                    answer.is_correct
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Weight: {answer.weight}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={answer.question_text} />
                </div>
              </div>

              {/* Answer options */}
              <div className="space-y-2">
                {(() => {
                  // Convert options object to array format
                  const optionsArray = Object.entries(answer.options || {})
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([id, opt]) => ({
                      id,
                      text: opt.text,
                      is_correct: opt.is_correct
                    }));

                  // Get selected option IDs as strings
                  const selectedIds = (answer.selected_options || []).map(String);
                  // Use correct_option_ids from backend
                  const correctIds = (answer.correct_option_ids || []).map(String);

                  return optionsArray.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    const isCorrect = correctIds.includes(option.id);

                    let borderColor = 'border-gray-200';
                    let bgColor = 'bg-white';
                    let textColor = 'text-gray-800';

                    if (isSelected && isCorrect) {
                      // Correctly selected
                      borderColor = 'border-green-500';
                      bgColor = 'bg-green-50';
                      textColor = 'text-green-900';
                    } else if (isSelected && !isCorrect) {
                      // Incorrectly selected
                      borderColor = 'border-red-500';
                      bgColor = 'bg-red-50';
                      textColor = 'text-red-900';
                    } else if (!isSelected && isCorrect) {
                      // Correct but not selected (missed)
                      borderColor = 'border-green-300';
                      bgColor = 'bg-green-50';
                      textColor = 'text-green-800';
                    }

                    return (
                      <div
                        key={option.id}
                        className={`p-3 border-2 rounded-md ${borderColor} ${bgColor}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className={`flex-1 ${textColor} font-medium prose prose-sm max-w-none`}>
                            <MarkdownRenderer content={option.text} />
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {isSelected && (
                              <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                Selected
                              </span>
                            )}
                            {isCorrect && (
                              <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Question type indicator */}
              <div className="mt-4 text-sm text-gray-500">
                Type: {answer.question_type === 'SINGLE' ? 'Single Choice' : 'Multiple Choice'}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AssessmentDetail;
