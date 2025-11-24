import { useState, useEffect } from 'react';
import { getTests, getQuestionAnalytics } from '../../utils/api';

const AnalyticsTab = () => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tests on mount
  useEffect(() => {
    const loadTests = async () => {
      try {
        setTestsLoading(true);
        const data = await getTests();
        setTests(data.tests || []);
      } catch (err) {
        setError('Failed to load tests');
      } finally {
        setTestsLoading(false);
      }
    };
    loadTests();
  }, []);

  // Load analytics when test is selected
  useEffect(() => {
    if (!selectedTestId) {
      setAnalytics(null);
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getQuestionAnalytics(selectedTestId);
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [selectedTestId]);

  // Get color class based on success rate
  const getSuccessRateColor = (rate) => {
    if (rate < 30) return 'text-red-600 bg-red-50';
    if (rate < 50) return 'text-orange-600 bg-orange-50';
    if (rate < 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  // Get difficulty label
  const getDifficultyLabel = (rate) => {
    if (rate < 30) return 'Very Hard';
    if (rate < 50) return 'Hard';
    if (rate < 75) return 'Medium';
    if (rate < 90) return 'Easy';
    return 'Very Easy';
  };

  if (testsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tech"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Question Analytics</h2>
        <p className="text-gray-600 mb-4">
          View success rates for each question in a test. Questions are sorted by difficulty (hardest first).
        </p>

        {/* Test Selector */}
        <div className="max-w-md">
          <label htmlFor="test-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select a Test
          </label>
          <select
            id="test-select"
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-tech focus:border-tech"
            aria-label="Select a test to view analytics"
          >
            <option value="">Choose a test...</option>
            {tests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.title} {!test.is_enabled && '(disabled)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tech"></div>
        </div>
      )}

      {/* Empty State - No Test Selected */}
      {!selectedTestId && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No test selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a test from the dropdown above to view question analytics.
          </p>
        </div>
      )}

      {/* Analytics Results */}
      {analytics && !loading && (
        <div>
          {/* Summary Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{analytics.test_title}</h3>
            <div className="flex gap-6 text-sm text-gray-600">
              <div>
                <span className="font-medium">{analytics.total_assessments}</span> completed assessments
              </div>
              <div>
                <span className="font-medium">{analytics.question_stats.length}</span> questions
              </div>
            </div>
          </div>

          {/* No Data State */}
          {analytics.total_assessments === 0 && (
            <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
              <svg
                className="mx-auto h-10 w-10 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-yellow-800">No completed assessments yet</h3>
              <p className="mt-1 text-sm text-yellow-600">
                Analytics will appear once candidates complete this test.
              </p>
            </div>
          )}

          {/* Questions Table */}
          {analytics.total_assessments > 0 && analytics.question_stats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correct
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.question_stats.map((stat, index) => (
                    <tr key={stat.question_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="max-w-md truncate" title={stat.question_text}>
                          {stat.question_text}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {stat.question_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-center">
                        {stat.weight}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-center">
                        {stat.total_attempts}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 text-center">
                        {stat.correct_attempts}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getSuccessRateColor(stat.success_rate)}`}>
                          {stat.success_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSuccessRateColor(stat.success_rate)}`}>
                          {getDifficultyLabel(stat.success_rate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          {analytics.total_assessments > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Difficulty Legend</h4>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300"></span>
                  <span className="text-gray-600">Very Hard (&lt;30%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300"></span>
                  <span className="text-gray-600">Hard (30-49%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span>
                  <span className="text-gray-600">Medium (50-74%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                  <span className="text-gray-600">Easy (75-89%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                  <span className="text-gray-600">Very Easy (90%+)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
