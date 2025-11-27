import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TestForm from './TestForm';
import ManageTestQuestions from './ManageTestQuestions';
import { apiRequest } from '../../utils/api';

const TestsTab = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [managingTest, setManagingTest] = useState(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadTests();
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

  const handleCreateTest = async (formData) => {
    await apiRequest('/api/tests', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    setShowCreateModal(false);
    loadTests();
  };

  const handleUpdateTest = async (formData) => {
    await apiRequest(`/api/tests/${editingTest.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });

    setEditingTest(null);
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
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tests</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your assessment tests
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Test
        </Button>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No tests yet</p>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Your First Test
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {test.title}
                    </h3>
                    {getVisibilityBadge(test.visibility)}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        test.is_enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {test.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {test.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {test.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span>Link: /t/{test.slug}</span>
                    <button
                      onClick={() => handleCopySlug(test.slug)}
                      className="text-tech hover:text-tech-dark"
                      title="Copy link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Questions: <span className="font-medium text-gray-700">{test.question_count}</span>
                    </span>
                    <span>
                      Pass Threshold: <span className="font-medium text-gray-700">{test.pass_threshold ?? 0}%</span>
                      {(test.pass_threshold ?? 0) === 0 && <span className="text-gray-500 ml-1">(neutral)</span>}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingTest(test)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setManagingTest(test)}
                      data-testid="manage-questions-btn"
                    >
                      Questions
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRegenerateConfirm(test)}
                    >
                      Regenerate Link
                    </Button>
                    <Button
                      size="sm"
                      variant={test.is_enabled ? 'secondary' : 'success'}
                      onClick={() => handleToggleEnabled(test)}
                    >
                      {test.is_enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteTest(test)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Test"
      >
        <TestForm
          onSubmit={handleCreateTest}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Test Modal */}
      {editingTest && (
        <Modal
          isOpen={!!editingTest}
          onClose={() => setEditingTest(null)}
          title="Edit Test"
        >
          <TestForm
            test={editingTest}
            onSubmit={handleUpdateTest}
            onCancel={() => setEditingTest(null)}
          />
        </Modal>
      )}

      {/* Manage Test Questions Modal */}
      {managingTest && (
        <ManageTestQuestions
          test={managingTest}
          isOpen={!!managingTest}
          onClose={() => setManagingTest(null)}
          onUpdate={loadTests}
        />
      )}

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
    </div>
  );
};

export default TestsTab;
