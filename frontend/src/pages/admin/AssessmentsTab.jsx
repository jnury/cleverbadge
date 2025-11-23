import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Select from '../../components/ui/Select';

const AssessmentsTab = () => {
  const [assessments, setAssessments] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTest, setFilterTest] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load assessments and tests in parallel
      const [assessmentsData, testsData] = await Promise.all([
        apiRequest('/api/assessments'),
        apiRequest('/api/tests')
      ]);

      setAssessments(assessmentsData.assessments || []);
      setTests(testsData.tests || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return `${parseFloat(score).toFixed(1)}%`;
  };

  // Filter and sort assessments
  const filteredAndSortedAssessments = assessments
    .filter(assessment => {
      if (filterTest && assessment.test_id !== filterTest) return false;
      if (filterStatus && assessment.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.started_at) - new Date(a.started_at);
        case 'date-asc':
          return new Date(a.started_at) - new Date(b.started_at);
        case 'score-desc':
          return (b.score_percentage || 0) - (a.score_percentage || 0);
        case 'score-asc':
          return (a.score_percentage || 0) - (b.score_percentage || 0);
        case 'name-asc':
          return a.candidate_name.localeCompare(b.candidate_name);
        case 'name-desc':
          return b.candidate_name.localeCompare(a.candidate_name);
        default:
          return 0;
      }
    });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessments</h2>
          <p className="text-sm text-gray-600 mt-1">
            View all candidate assessment results
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Test
            </label>
            <select
              value={filterTest}
              onChange={(e) => setFilterTest(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Tests</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>
                  {test.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="STARTED">Started</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="score-desc">Score (Highest First)</option>
              <option value="score-asc">Score (Lowest First)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSortedAssessments.length} of {assessments.length} assessments
        </div>
      </Card>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAndSortedAssessments.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              {assessments.length === 0
                ? 'No assessments yet. Candidates will appear here after taking tests.'
                : 'No assessments match your filters.'}
            </p>
          </Card>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assessment.candidate_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assessment.test_title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {assessment.test_slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          assessment.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        assessment.score_percentage !== null && assessment.score_percentage >= 70
                          ? 'text-green-600'
                          : assessment.score_percentage !== null
                          ? 'text-red-600'
                          : 'text-gray-400'
                      }`}>
                        {formatScore(assessment.score_percentage)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(assessment.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(assessment.completed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentsTab;
