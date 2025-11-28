import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

const TestModal = ({ isOpen, onClose, test, initialTab = 'settings', onSave }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private',
    is_enabled: false,
    pass_threshold: 0,
    show_explanations: 'never',
    explanation_scope: 'selected_only'
  });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Initialize form data when test prop changes
  useEffect(() => {
    if (test) {
      setFormData({
        title: test.title || '',
        description: test.description || '',
        visibility: test.visibility || 'private',
        is_enabled: test.is_enabled || false,
        pass_threshold: test.pass_threshold ?? 0,
        show_explanations: test.show_explanations || 'never',
        explanation_scope: test.explanation_scope || 'selected_only'
      });
    } else {
      // Reset for create mode
      setFormData({
        title: '',
        description: '',
        visibility: 'private',
        is_enabled: false,
        pass_threshold: 0,
        show_explanations: 'never',
        explanation_scope: 'selected_only'
      });
      setSelectedQuestionIds([]);
    }
    setHasChanges(false);
  }, [test, isOpen]);

  // Reset to initial tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const isCreateMode = !test;
  const isTitleFilled = formData.title.trim().length > 0;
  const hasQuestions = selectedQuestionIds.length > 0;

  // Tab enabled states
  const isQuestionsTabEnabled = isCreateMode ? isTitleFilled : true;
  const isPreviewTabEnabled = isCreateMode ? hasQuestions : (test?.question_count > 0 || hasQuestions);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setHasChanges(false);
    onClose();
  };

  const handleSave = async () => {
    // Will be implemented in Task 3
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isCreateMode ? 'Create Test' : 'Edit Test'}
      size="lg"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-tech text-tech'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => isQuestionsTabEnabled && setActiveTab('questions')}
          disabled={!isQuestionsTabEnabled}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'questions'
              ? 'border-tech text-tech'
              : !isQuestionsTabEnabled
              ? 'border-transparent text-gray-300 cursor-not-allowed'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          title={!isQuestionsTabEnabled ? 'Fill in title first' : ''}
        >
          Questions {selectedQuestionIds.length > 0 && `(${selectedQuestionIds.length})`}
        </button>
        <button
          onClick={() => isPreviewTabEnabled && setActiveTab('preview')}
          disabled={!isPreviewTabEnabled}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-tech text-tech'
              : !isPreviewTabEnabled
              ? 'border-transparent text-gray-300 cursor-not-allowed'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          title={!isPreviewTabEnabled ? 'Add questions first' : ''}
        >
          Preview
        </button>
      </div>

      {/* Tab Content - Placeholder */}
      <div className="min-h-[400px]">
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <Input
              label="Title"
              name="title"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                setHasChanges(true);
              }}
              required
              placeholder="e.g., JavaScript Fundamentals"
            />

            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                setHasChanges(true);
              }}
              rows={3}
              placeholder="Brief description of the test..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, visibility: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="private">Private - Requires direct link</option>
                <option value="public">Public - Listed on home page (v2)</option>
                <option value="protected">Protected - Access restricted (v2)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Private tests require the direct link. Public/protected features coming in v2.
              </p>
            </div>

            {test && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Link</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-md text-sm">
                    /t/{test.slug}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${test.slug}`)}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            )}

            <Input
              label="Pass Threshold (%)"
              name="pass_threshold"
              type="number"
              min="0"
              max="100"
              value={formData.pass_threshold}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, pass_threshold: parseInt(e.target.value) || 0 }));
                setHasChanges(true);
              }}
              placeholder="0"
              help="Set to 0 for neutral scoring (no pass/fail). Set to 1-100 to show pass/fail based on score."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Show Explanations</label>
              <select
                name="show_explanations"
                value={formData.show_explanations}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, show_explanations: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="never">Never - Candidates see score only</option>
                <option value="after_each_question">After Each Question</option>
                <option value="after_submit">After Test Submission</option>
              </select>
            </div>

            {formData.show_explanations !== 'never' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation Scope</label>
                <select
                  name="explanation_scope"
                  value={formData.explanation_scope}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, explanation_scope: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="selected_only">Selected Answers Only</option>
                  <option value="all_answers">All Answer Options</option>
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_enabled"
                name="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, is_enabled: e.target.checked }));
                  setHasChanges(true);
                }}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-700">
                Enable test (allow candidates to take it)
              </label>
            </div>
          </div>
        )}
        {activeTab === 'questions' && (
          <div>Questions tab content (Task 4)</div>
        )}
        {activeTab === 'preview' && (
          <div>Preview tab content (Task 5)</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isTitleFilled}>
          {isCreateMode ? 'Create Test' : 'Save Changes'}
        </Button>
      </div>

      {/* Discard Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Discard changes?</h3>
            <p className="text-gray-600 mb-4">You have unsaved changes. Are you sure you want to discard them?</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowDiscardConfirm(false)}>
                Keep Editing
              </Button>
              <Button variant="danger" onClick={handleConfirmDiscard}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TestModal;
