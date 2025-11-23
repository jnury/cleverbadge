import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

const TestResults = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from navigation state
  const { score, candidateName, passThreshold } = location.state || {};

  // Redirect if no state
  if (score === undefined) {
    navigate(`/t/${slug}`);
    return null;
  }

  const scoreNum = parseFloat(score);
  const threshold = passThreshold ?? 0;

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
            {scoreNum.toFixed(1)}%
          </div>
          <div className={`text-xl font-semibold ${statusColor}`}>
            {status.toUpperCase()}
          </div>
        </div>

        <div className="text-gray-600">
          <p>Your score has been recorded.</p>
          <p className="mt-2 text-sm">
            You may close this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
