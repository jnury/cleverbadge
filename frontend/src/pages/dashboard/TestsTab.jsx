import React, { useState, useEffect } from 'react';
import { useUrlParams } from '../../hooks/useUrlParams';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TestModal from './TestModal';
import SortableHeader from '../../components/ui/SortableHeader';
import { apiRequest } from '../../utils/api';

// Protected demo test slug - cannot be deleted or have slug regenerated
const PROTECTED_DEMO_SLUG = 'demo';

const TestsTab = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalTest, setModalTest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('settings');
  const [regenerateConfirm, setRegenerateConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkVisibility, setBulkVisibility] = useState('');
  const [bulkAuthor, setBulkAuthor] = useState('');
  const [users, setUsers] = useState([]);

  // URL-synced filters
  const [urlParams, setParam] = useUrlParams({
    visibility: null,
    status: null,
    search: null,
    sort: null
  });

  const filterVisibility = urlParams.visibility || 'ALL';
  const filterStatus = urlParams.status || 'ALL';
  const searchTitle = urlParams.search || '';
  const sortOrder = urlParams.sort || null;

  useEffect(() => {
    loadTests();
    fetchUsers();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/tests');

      // Get question counts for each test
      const testsWithCounts = await Promise.all(
        data.tests.map(async (test) => {
          try {
            const questionsData = await apiRequest(`/api/tests/${test.id}/questions`);
            return {
              ...test,
              question_count: questionsData.questions.length
            };
          } catch (err) {
            return {
              ...test,
              question_count: 0
            };
          }
        })
      );

      setTests(testsWithCounts);
    } catch (err) {
      setError(err.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiRequest('/api/questions/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleOpenModal = (test, tab = 'settings') => {
    setModalTest(test);
    setModalInitialTab(tab);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalTest(null);
  };

  const handleModalSave = () => {
    loadTests();
  };

  const handleToggleEnabled = async (test) => {
    try {
      await apiRequest(`/api/tests/${test.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: test.title,
          description: test.description,
          is_enabled: !test.is_enabled,
          pass_threshold: test.pass_threshold ?? 0
        })
      });

      loadTests();
    } catch (err) {
      alert(err.message || 'Failed to update test');
    }
  };

  const handleDeleteTest = async (test) => {
    if (!confirm(`Are you sure you want to delete "${test.title}"?\n\nThe test link will no longer work. Historical assessment data will be preserved.`)) {
      return;
    }

    try {
      await apiRequest(`/api/tests/${test.id}`, {
        method: 'DELETE'
      });

      loadTests();
    } catch (err) {
      alert(err.message || 'Failed to delete test');
    }
  };

  const handleCopySlug = (slug) => {
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url);
    setSuccessMessage('Test URL copied to clipboard!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRegenerateSlug = async (testId) => {
    try {
      const result = await apiRequest(`/api/tests/${testId}/regenerate-slug`, {
        method: 'POST'
      });
      setSuccessMessage(`Link regenerated: /t/${result.slug}`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setRegenerateConfirm(null);
      loadTests();
    } catch (error) {
      setError(error.message || 'Failed to regenerate link');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === tests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tests.map(t => t.id)));
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkEnable = async (enable) => {
    try {
      let updatedCount = 0;
      let skippedDemo = false;
      for (const testId of selectedIds) {
        const test = tests.find(t => t.id === testId);
        // Skip demo test when disabling
        if (test && test.slug === PROTECTED_DEMO_SLUG && !enable) {
          skippedDemo = true;
          continue;
        }
        if (test && test.is_enabled !== enable) {
          await apiRequest(`/api/tests/${testId}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: test.title,
              description: test.description,
              visibility: test.visibility,
              is_enabled: enable,
              pass_threshold: test.pass_threshold ?? 0,
              show_explanations: test.show_explanations,
              explanation_scope: test.explanation_scope
            })
          });
          updatedCount++;
        }
      }
      let message = `${enable ? 'Enabled' : 'Disabled'} ${updatedCount} test${updatedCount !== 1 ? 's' : ''}`;
      if (skippedDemo) {
        message += ' (demo test skipped)';
      }
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
      setSelectedIds(new Set());
      setBulkAction(null);
      loadTests();
    } catch (err) {
      setError(err.message || 'Failed to update tests');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkChangeVisibility = async () => {
    if (!bulkVisibility) return;
    try {
      for (const testId of selectedIds) {
        const test = tests.find(t => t.id === testId);
        if (test) {
          await apiRequest(`/api/tests/${testId}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: test.title,
              description: test.description,
              visibility: bulkVisibility,
              is_enabled: test.is_enabled,
              pass_threshold: test.pass_threshold ?? 0,
              show_explanations: test.show_explanations,
              explanation_scope: test.explanation_scope
            })
          });
        }
      }
      setSuccessMessage(`Changed visibility for ${selectedIds.size} test${selectedIds.size > 1 ? 's' : ''}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkVisibility('');
      loadTests();
    } catch (err) {
      setError(err.message || 'Failed to update tests');
      setTimeout(() => setError(null), 5000);
    }
  };

  const getVisibilityBadge = (visibility) => {
    const badges = {
      public: { bg: 'bg-green-100', text: 'text-green-800', label: 'Public' },
      private: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Private' },
      protected: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Protected' }
    };
    const badge = badges[visibility] || badges.private;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Filter tests
  const filteredTests = tests.filter(test => {
    if (filterVisibility !== 'ALL' && test.visibility !== filterVisibility) return false;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'enabled' && !test.is_enabled) return false;
      if (filterStatus === 'disabled' && test.is_enabled) return false;
    }
    if (searchTitle && !test.title.toLowerCase().includes(searchTitle.toLowerCase())) return false;
    return true;
  });

  // Sort tests
  const sortedTests = [...filteredTests].sort((a, b) => {
    if (!sortOrder) return 0;

    const [sortKey, sortDir] = sortOrder.split('-');
    let comparison = 0;

    switch (sortKey) {
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      case 'questions':
        comparison = (a.question_count || 0) - (b.question_count || 0);
        break;
      case 'threshold':
        comparison = (a.pass_threshold || 0) - (b.pass_threshold || 0);
        break;
      default:
        return 0;
    }

    return sortDir === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-600">Loading tests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl text-gray-900">Manage your assessment tests</h2>
          {selectedIds.size > 0 && (
            <span className="text-sm font-medium text-tech">
              ({selectedIds.size} selected)
            </span>
          )}
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
                  onClick={() => { setBulkAction('enable'); setBulkDropdownOpen(false); }}
                >
                  Enable selected
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('disable'); setBulkDropdownOpen(false); }}
                >
                  Disable selected
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => { setBulkAction('changeVisibility'); setBulkDropdownOpen(false); }}
                >
                  Change visibility
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => handleOpenModal(null, 'settings')}>
            Create Test
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end mb-4">
        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            value={filterVisibility}
            onChange={(e) => setParam('visibility', e.target.value === 'ALL' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="ALL">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="protected">Protected</option>
          </select>
        </div>

        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setParam('status', e.target.value === 'ALL' ? null : e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          >
            <option value="ALL">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Title</label>
          <input
            type="text"
            value={searchTitle}
            onChange={(e) => setParam('search', e.target.value || null)}
            placeholder="Filter by title..."
            className="w-full h-10 border border-gray-300 rounded-md px-3"
          />
        </div>

        <div className="text-sm text-gray-600 ml-auto">
          Showing {sortedTests.length} of {tests.length} tests
        </div>
      </div>

      {/* Tests Table */}
      {sortedTests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No tests yet</p>
          <Button onClick={() => handleOpenModal(null, 'settings')}>
            Create Your First Test
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedTests.length && sortedTests.length > 0}
                    onChange={() => {
                      if (selectedIds.size === sortedTests.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(sortedTests.map(t => t.id)));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <SortableHeader
                  label="Title"
                  sortKey="title"
                  currentSort={sortOrder}
                  onSort={(value) => setParam('sort', value)}
                />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <SortableHeader
                  label="Questions"
                  sortKey="questions"
                  currentSort={sortOrder}
                  onSort={(value) => setParam('sort', value)}
                />
                <SortableHeader
                  label="Threshold"
                  sortKey="threshold"
                  currentSort={sortOrder}
                  onSort={(value) => setParam('sort', value)}
                />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(test.id)}
                      onChange={() => handleSelectOne(test.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{test.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    {getVisibilityBadge(test.visibility)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {test.question_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {test.pass_threshold ?? 0}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      test.is_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {test.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {/* Edit icon */}
                      <button
                        onClick={() => handleOpenModal(test, 'settings')}
                        className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                        title="Edit test"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Preview icon */}
                      <button
                        onClick={() => test.question_count > 0 && handleOpenModal(test, 'preview')}
                        className={`p-1.5 rounded ${
                          test.question_count > 0
                            ? 'text-gray-500 hover:text-tech hover:bg-gray-100'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={test.question_count > 0 ? 'Preview test' : 'Add questions first'}
                        disabled={test.question_count === 0}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* Copy link icon */}
                      <button
                        onClick={() => handleCopySlug(test.slug)}
                        className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                        title="Copy link"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {/* Regenerate link icon */}
                      <button
                        onClick={() => test.slug !== PROTECTED_DEMO_SLUG && setRegenerateConfirm(test)}
                        className={`p-1.5 rounded ${
                          test.slug === PROTECTED_DEMO_SLUG
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
                        }`}
                        title={test.slug === PROTECTED_DEMO_SLUG ? 'Demo test link cannot be changed' : 'Regenerate link'}
                        disabled={test.slug === PROTECTED_DEMO_SLUG}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      {/* Toggle enabled icon */}
                      <button
                        onClick={() => test.slug !== PROTECTED_DEMO_SLUG && handleToggleEnabled(test)}
                        className={`p-1.5 rounded ${
                          test.slug === PROTECTED_DEMO_SLUG
                            ? 'text-gray-300 cursor-not-allowed'
                            : test.is_enabled
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={test.slug === PROTECTED_DEMO_SLUG ? 'Demo test cannot be disabled' : (test.is_enabled ? 'Disable test' : 'Enable test')}
                        disabled={test.slug === PROTECTED_DEMO_SLUG}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {test.is_enabled ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                      {/* Delete icon */}
                      <button
                        onClick={() => test.slug !== PROTECTED_DEMO_SLUG && handleDeleteTest(test)}
                        className={`p-1.5 rounded ${
                          test.slug === PROTECTED_DEMO_SLUG
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={test.slug === PROTECTED_DEMO_SLUG ? 'Demo test cannot be deleted' : 'Delete test'}
                        disabled={test.slug === PROTECTED_DEMO_SLUG}
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

      {/* Test Modal (Create/Edit) */}
      <TestModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        test={modalTest}
        initialTab={modalInitialTab}
        onSave={handleModalSave}
      />

      {/* Regenerate Slug Confirmation Modal */}
      {regenerateConfirm && (
        <Modal
          isOpen={!!regenerateConfirm}
          onClose={() => setRegenerateConfirm(null)}
          title="Regenerate Test Link"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to regenerate the link for "{regenerateConfirm.title}"?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <strong>Warning:</strong> Regenerating the link will make the current link invalid.
              Candidates with the old link will no longer be able to access this test.
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setRegenerateConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleRegenerateSlug(regenerateConfirm.id)}>
                Regenerate Link
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Enable/Disable Modal */}
      {(bulkAction === 'enable' || bulkAction === 'disable') && (
        <Modal
          isOpen={true}
          onClose={() => setBulkAction(null)}
          title={`${bulkAction === 'enable' ? 'Enable' : 'Disable'} ${selectedIds.size} Test${selectedIds.size > 1 ? 's' : ''}`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to {bulkAction} {selectedIds.size} test{selectedIds.size > 1 ? 's' : ''}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setBulkAction(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleBulkEnable(bulkAction === 'enable')}>
                {bulkAction === 'enable' ? 'Enable' : 'Disable'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Change Visibility Modal */}
      {bulkAction === 'changeVisibility' && (
        <Modal
          isOpen={true}
          onClose={() => { setBulkAction(null); setBulkVisibility(''); }}
          title={`Change Visibility for ${selectedIds.size} Test${selectedIds.size > 1 ? 's' : ''}`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Visibility
              </label>
              <select
                value={bulkVisibility}
                onChange={(e) => setBulkVisibility(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md px-3"
              >
                <option value="">Select visibility...</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="protected">Protected</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setBulkAction(null); setBulkVisibility(''); }}>
                Cancel
              </Button>
              <Button onClick={handleBulkChangeVisibility} disabled={!bulkVisibility}>
                Change Visibility
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TestsTab;
