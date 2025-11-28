import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

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
          <div>Settings tab content (Task 2)</div>
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
