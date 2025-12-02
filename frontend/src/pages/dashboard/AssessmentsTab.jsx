import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUrlParams } from '../../hooks/useUrlParams';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SortableHeader from '../../components/ui/SortableHeader';
import { ToastContainer } from '../../components/ui/Toast';

const AssessmentsTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const sortBy = urlParams.sort || 'started-desc';

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [deleteAssessmentId, setDeleteAssessmentId] = useState(null);

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
    return date.toLocaleString(navigator.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
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
      if (!sortBy) return 0;

      const [sortKey, sortDir] = sortBy.split('-');
      let comparison = 0;

      switch (sortKey) {
        case 'candidate':
          comparison = (a.candidate_name || '').localeCompare(b.candidate_name || '');
          break;
        case 'score':
          comparison = (a.score_percentage || 0) - (b.score_percentage || 0);
          break;
        case 'started':
          comparison = new Date(a.started_at) - new Date(b.started_at);
          break;
        case 'duration': {
          const getDuration = (assessment) => {
            if (!assessment.completed_at) return -1;
            return new Date(assessment.completed_at) - new Date(assessment.started_at);
          };
          comparison = getDuration(a) - getDuration(b);
          break;
        }
        default:
          return 0;
      }

      return sortDir === 'asc' ? comparison : -comparison;
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
      const data = await apiRequest('/api/assessments/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          assessment_ids: Array.from(selectedIds)
        })
      });
      showSuccess(`Permanently deleted ${data.deleted} assessment(s)`);
      setSelectedIds(new Set());
      setBulkAction(null);
      loadData();
    } catch (error) {
      showError(error.message || 'Failed to delete assessments');
    }
  };

  const handleSingleDelete = async () => {
    if (!deleteAssessmentId) return;
    try {
      await apiRequest('/api/assessments/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          assessment_ids: [deleteAssessmentId]
        })
      });
      showSuccess('Assessment permanently deleted');
      setDeleteAssessmentId(null);
      loadData();
    } catch (error) {
      showError(error.message || 'Failed to delete assessment');
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
          <h2 className="text-xl text-gray-900">View all candidate assessment results</h2>
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
          <label htmlFor="filter-test" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Test
          </label>
          <select
            id="filter-test"
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
          <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setParam('status', e.target.value || null)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="">All Statuses</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
        </div>

        <div className="text-sm text-gray-500 self-end pb-2">
          Showing {filteredAndSortedAssessments.length} of {assessments.length} assessments
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
                  <SortableHeader
                    label="Candidate"
                    sortKey="candidate"
                    currentSort={sortBy}
                    onSort={(value) => setParam('sort', value)}
                    className="px-6"
                  />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <SortableHeader
                    label="Score"
                    sortKey="score"
                    currentSort={sortBy}
                    onSort={(value) => setParam('sort', value)}
                    className="px-6"
                  />
                  <SortableHeader
                    label="Started"
                    sortKey="started"
                    currentSort={sortBy}
                    onSort={(value) => setParam('sort', value)}
                    className="px-6"
                  />
                  <SortableHeader
                    label="Duration"
                    sortKey="duration"
                    currentSort={sortBy}
                    onSort={(value) => setParam('sort', value)}
                    className="px-6"
                  />
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
                            : assessment.status === 'ABANDONED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {assessment.status === 'COMPLETED' ? 'Completed' : assessment.status === 'ABANDONED' ? 'Abandoned' : 'In Progress'}
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
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/dashboard/assessment/${assessment.id}`, {
                            state: { from: `/dashboard${location.search}` }
                          })}
                          className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteAssessmentId(assessment.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
              Are you sure you want to permanently delete {selectedIds.size} assessment{selectedIds.size > 1 ? 's' : ''}?
              This action cannot be undone and will affect analytics.
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

      {/* Single Delete Confirmation Modal */}
      {deleteAssessmentId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteAssessmentId(null)}
          title="Delete Assessment"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to permanently delete this assessment?
              This action cannot be undone and will affect analytics.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteAssessmentId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleSingleDelete}>
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
