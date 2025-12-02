import { useState, useEffect } from 'react';
import { getTests, getQuestionAnalytics } from '../../utils/api';
import { useUrlParams } from '../../hooks/useUrlParams';
import SortableHeader from '../../components/ui/SortableHeader';

const AnalyticsTab = () => {
  const [tests, setTests] = useState([]);
  // URL-synced test selection and sorting
  const [urlParams, setParam] = useUrlParams({ test: null, sort: null });
  const selectedTestId = urlParams.test || '';
  const sortOrder = urlParams.sort || 'success-asc'; // Default: hardest first
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

  // Sort question stats
  const sortedQuestionStats = analytics?.question_stats ? [...analytics.question_stats].sort((a, b) => {
    if (!sortOrder) return 0;
    const [sortKey, sortDir] = sortOrder.split('-');
    let comparison = 0;

    switch (sortKey) {
      case 'question':
        comparison = (a.question_text || '').localeCompare(b.question_text || '');
        break;
      case 'success':
        comparison = (a.success_rate || 0) - (b.success_rate || 0);
        break;
      case 'attempts':
        comparison = (a.total_attempts || 0) - (b.total_attempts || 0);
        break;
      default:
        return 0;
    }

    return sortDir === 'asc' ? comparison : -comparison;
  }) : [];

  if (testsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tech"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl text-gray-900">View success rates for each question</h2>

      {/* Test Selector */}
      <div className="flex items-center gap-4">
        <select
          id="test-select"
          value={selectedTestId}
          onChange={(e) => setParam('test', e.target.value || null)}
          className="w-64 h-10 border border-gray-300 rounded-md px-3"
          aria-label="Select a test to view analytics"
        >
          <option value="">Select a test...</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.title} {!test.is_enabled && '(disabled)'}
            </option>
          ))}
        </select>
        {analytics && !loading && (
          <div className="flex gap-4 text-sm text-gray-600 ml-auto">
            <span><span className="font-medium">{analytics.question_stats.length}</span> questions</span>
            <span><span className="font-medium">{analytics.total_assessments}</span> assessments</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
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
                    <SortableHeader
                      label="Question"
                      sortKey="question"
                      currentSort={sortOrder}
                      onSort={(value) => setParam('sort', value)}
                    />
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <SortableHeader
                      label="Attempts"
                      sortKey="attempts"
                      currentSort={sortOrder}
                      onSort={(value) => setParam('sort', value)}
                      className="text-center"
                    />
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correct
                    </th>
                    <SortableHeader
                      label="Success Rate"
                      sortKey="success"
                      currentSort={sortOrder}
                      onSort={(value) => setParam('sort', value)}
                      className="text-center"
                    />
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedQuestionStats.map((stat, index) => (
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
                          {Math.round(stat.success_rate)}%
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
