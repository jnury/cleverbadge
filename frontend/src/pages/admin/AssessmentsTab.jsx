import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUrlParams } from '../../hooks/useUrlParams';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { ToastContainer } from '../../components/ui/Toast';

const AssessmentsTab = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [assessments, setAssessments] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // URL-synced filters
  const [urlParams, setParam] = useUrlParams({
    test: null,
    status: null,
    sort: null
  });

  const filterTest = urlParams.test || '';
  const filterStatus = urlParams.status || '';
  const sortBy = urlParams.sort || 'date-desc';

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

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
    return `${Math.round(parseFloat(score))}%`;
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!completedAt) return 'N/A';
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

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    try {
      const data = await apiRequest('/api/assessments/bulk-archive', {
        method: 'POST',
        body: JSON.stringify({
          assessment_ids: Array.from(selectedIds)
        })
      });
      showSuccess(`Deleted ${data.archived} assessment(s)`);
      setSelectedIds(new Set());
      setBulkAction(null);
      loadData();
    } catch (error) {
      showError(error.message || 'Failed to delete assessments');
    }
  };

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
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assessments</h2>
            <p className="text-sm text-gray-500">
              View all candidate assessment results
            </p>
          </div>
          <div className="flex gap-3">
            {/* Bulk Actions Dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                disabled={selectedIds.size === 0}
                onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
              >
                Bulk Actions
              </Button>
              {bulkDropdownOpen && selectedIds.size > 0 && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => { setBulkAction('delete'); setBulkDropdownOpen(false); }}
                  >
                    Delete selected
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-44">
          <select
            value={filterTest}
            onChange={(e) => setParam('test', e.target.value || null)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="">All Tests</option>
            {tests.map(test => (
              <option key={test.id} value={test.id}>
                {test.title}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <select
            value={filterStatus}
            onChange={(e) => setParam('status', e.target.value || null)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="">All Statuses</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="w-44">
          <select
            value={sortBy}
            onChange={(e) => setParam('sort', e.target.value === 'date-desc' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="score-desc">Highest Score</option>
            <option value="score-asc">Lowest Score</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filteredAndSortedAssessments.length} of {assessments.length} assessments
        </div>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAndSortedAssessments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg">
            <p className="text-center text-gray-500 py-8">
              {assessments.length === 0
                ? 'No assessments yet. Candidates will appear here after taking tests.'
                : 'No assessments match your filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredAndSortedAssessments.length && filteredAndSortedAssessments.length > 0}
                      onChange={() => {
                        if (selectedIds.size === filteredAndSortedAssessments.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(filteredAndSortedAssessments.map(a => a.id)));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
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
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(assessment.id)}
                        onChange={() => toggleSelection(assessment.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
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
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          assessment.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {assessment.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
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
                      {formatDuration(assessment.started_at, assessment.completed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/admin/assessment/${assessment.id}`)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {bulkAction === 'delete' && (
        <Modal
          isOpen={true}
          onClose={() => setBulkAction(null)}
          title={`Delete ${selectedIds.size} Assessment${selectedIds.size > 1 ? 's' : ''}`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete {selectedIds.size} assessment{selectedIds.size > 1 ? 's' : ''}?
              This will remove them from the list but data will be preserved.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setBulkAction(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleBulkDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </>
  );
};

export default AssessmentsTab;
