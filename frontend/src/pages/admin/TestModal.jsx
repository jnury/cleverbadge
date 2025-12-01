import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { apiRequest } from '../../utils/api';

const TestModal = ({ isOpen, onClose, test, initialTab = 'settings', onSave }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private',
    is_enabled: true,
    pass_threshold: 0,
    show_explanations: 'never',
    explanation_scope: 'selected_only'
  });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionWeights, setQuestionWeights] = useState({});
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

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
        is_enabled: true,
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

  // Load all questions when Questions or Preview tab is activated
  useEffect(() => {
    if ((activeTab === 'questions' || activeTab === 'preview') && allQuestions.length === 0) {
      loadQuestions();
    }
  }, [activeTab]);

  // Load test questions when editing
  useEffect(() => {
    if (test && isOpen) {
      loadTestQuestions();
    }
  }, [test, isOpen]);

  // Reset preview index when selected questions change
  useEffect(() => {
    if (previewIndex >= selectedQuestionIds.length) {
      setPreviewIndex(Math.max(0, selectedQuestionIds.length - 1));
    }
  }, [selectedQuestionIds.length]);

  const isCreateMode = !test;
  const isTitleFilled = formData.title.trim().length > 0;
  const hasQuestions = selectedQuestionIds.length > 0;

  // Tab enabled states
  const isQuestionsTabEnabled = isCreateMode ? isTitleFilled : true;
  const isPreviewTabEnabled = isCreateMode ? hasQuestions : (test?.question_count > 0 || hasQuestions);

  const loadQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const data = await apiRequest('/api/questions');
      setAllQuestions(data.questions || []);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const loadTestQuestions = async () => {
    try {
      const data = await apiRequest(`/api/tests/${test.id}/questions`);
      const ids = data.questions.map(q => q.id);
      setSelectedQuestionIds(ids);
      // Store weights
      const weights = {};
      data.questions.forEach(q => {
        weights[q.id] = q.weight || 1;
      });
      setQuestionWeights(weights);
    } catch (err) {
      console.error('Failed to load test questions:', err);
    }
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

  const VISIBILITY_LEVEL = { public: 0, private: 1, protected: 2 };

  const canQuestionBeInTest = (questionVisibility, testVisibility) => {
    const questionLevel = VISIBILITY_LEVEL[questionVisibility] || 1;
    const testLevel = VISIBILITY_LEVEL[testVisibility] || 1;
    return testLevel >= questionLevel;
  };

  const handleToggleQuestion = (questionId) => {
    setSelectedQuestionIds(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
    setHasChanges(true);
  };

  const parseOptions = (options) => {
    if (!options) return {};
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch (e) {
        return {};
      }
    }
    return options;
  };

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
    if (!formData.title.trim()) {
      setError('Title is required');
      setActiveTab('settings');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isCreateMode) {
        // Create new test
        const newTest = await apiRequest('/api/tests', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            visibility: formData.visibility,
            is_enabled: formData.is_enabled,
            pass_threshold: formData.pass_threshold,
            show_explanations: formData.show_explanations,
            explanation_scope: formData.explanation_scope
          })
        });

        // If questions were selected, add them to the test
        if (selectedQuestionIds.length > 0) {
          await apiRequest(`/api/tests/${newTest.id}/questions`, {
            method: 'POST',
            body: JSON.stringify({
              questions: selectedQuestionIds.map(id => ({ question_id: id, weight: 1 }))
            })
          });
        }
      } else {
        // Update existing test
        await apiRequest(`/api/tests/${test.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            visibility: formData.visibility,
            is_enabled: formData.is_enabled,
            pass_threshold: formData.pass_threshold,
            show_explanations: formData.show_explanations,
            explanation_scope: formData.explanation_scope
          })
        });

        // Sync questions - remove all and re-add (simplest approach for now)
        // Get current questions
        const currentQuestions = await apiRequest(`/api/tests/${test.id}/questions`);
        const currentIds = currentQuestions.questions.map(q => q.id);

        // Remove questions not in selectedQuestionIds
        for (const qId of currentIds) {
          if (!selectedQuestionIds.includes(qId)) {
            await apiRequest(`/api/tests/${test.id}/questions/${qId}`, {
              method: 'DELETE'
            });
          }
        }

        // Add new questions not in currentIds
        const newQuestionIds = selectedQuestionIds.filter(id => !currentIds.includes(id));
        if (newQuestionIds.length > 0) {
          await apiRequest(`/api/tests/${test.id}/questions`, {
            method: 'POST',
            body: JSON.stringify({
              questions: newQuestionIds.map(id => ({ question_id: id, weight: 1 }))
            })
          });
        }
      }

      setHasChanges(false);
      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save test');
    } finally {
      setSaving(false);
    }
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

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
                className="w-full h-10 border border-gray-300 rounded-md px-3"
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
                className="w-full h-10 border border-gray-300 rounded-md px-3"
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
                  className="w-full h-10 border border-gray-300 rounded-md px-3"
                >
                  <option value="selected_only">Selected Answers Only</option>
                  <option value="all_answers">All Answer Options</option>
                </select>
              </div>
            )}
          </div>
        )}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {questionsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-600">Loading questions...</p>
              </div>
            ) : (
              <>
                {/* Available Questions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Available Questions ({allQuestions.filter(q => !selectedQuestionIds.includes(q.id)).length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {allQuestions.filter(q => !selectedQuestionIds.includes(q.id)).length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        {allQuestions.length === 0 ? 'No questions available' : 'All questions selected'}
                      </p>
                    ) : (
                      allQuestions
                        .filter(question => !selectedQuestionIds.includes(question.id))
                        .map(question => {
                          const isCompatible = canQuestionBeInTest(question.visibility, formData.visibility);

                          return (
                            <div
                              key={question.id}
                              className={`p-2 border rounded flex items-center gap-2 ${
                                isCompatible ? 'hover:bg-gray-50' : 'opacity-50 bg-gray-100'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{question.title}</div>
                                <div className="text-xs text-gray-600 truncate">{truncateText(question.text)}</div>
                                {!isCompatible && (
                                  <p className="text-xs text-red-600">
                                    Incompatible visibility
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => isCompatible && handleToggleQuestion(question.id)}
                                disabled={!isCompatible}
                                className="text-green-600 hover:text-green-800 p-1 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                title="Add question"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Selected Questions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Selected Questions ({selectedQuestionIds.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {selectedQuestionIds.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No questions selected</p>
                    ) : (
                      selectedQuestionIds.map(qId => {
                        const question = allQuestions.find(q => q.id === qId);
                        if (!question) return null;

                        return (
                          <div
                            key={qId}
                            className="p-2 border border-tech bg-tech/10 rounded flex items-center gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{question.title}</div>
                              <div className="text-xs text-gray-600 truncate">{truncateText(question.text)}</div>
                            </div>
                            <button
                              onClick={() => handleToggleQuestion(qId)}
                              className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                              title="Remove question"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="rounded border-gray-300 text-tech focus:ring-tech"
                />
                <span className="text-sm font-medium text-gray-700">Show Answers</span>
              </label>
              <span className="text-sm text-gray-500">
                Question {previewIndex + 1} of {selectedQuestionIds.length}
              </span>
            </div>

            {questionsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-600">Loading questions...</p>
              </div>
            ) : selectedQuestionIds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No questions selected. Add questions in the Questions tab.
              </div>
            ) : (() => {
              const currentQuestion = allQuestions.find(q => q.id === selectedQuestionIds[previewIndex]);
              if (!currentQuestion) return <div className="text-center py-8 text-gray-500">Question not found</div>;

              const options = parseOptions(currentQuestion.options);
              const optionsArray = Object.entries(options)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([id, opt]) => ({ id, ...opt }));

              return (
                <div className="space-y-4">
                  {/* Question */}
                  <div>
                    {currentQuestion.title && (
                      <h3 className="font-semibold text-gray-800 mb-2">{currentQuestion.title}</h3>
                    )}
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer content={currentQuestion.text} />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {optionsArray.map((option) => {
                      const isCorrect = option.is_correct;
                      const borderClass = showAnswers
                        ? isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-300 bg-red-50'
                        : 'border-gray-200';
                      const indicatorClass = showAnswers
                        ? isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-300 bg-red-300'
                        : 'border-gray-300';

                      return (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border-2 ${borderClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 flex-shrink-0 border-2 ${indicatorClass} ${
                              currentQuestion.type === 'SINGLE' ? 'rounded-full' : 'rounded'
                            }`} />
                            <div className="flex-1 prose prose-sm max-w-none">
                              <MarkdownRenderer content={option.text} />
                              {showAnswers && option.explanation && (
                                <p className="mt-1 text-sm text-gray-600 italic">
                                  {option.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation with Remove button */}
                  <div className="grid grid-cols-3 items-center py-2 border-t">
                    <div className="justify-self-start">
                      <Button
                        variant="secondary"
                        onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                        disabled={previewIndex === 0}
                      >
                        Previous
                      </Button>
                    </div>
                    <div className="justify-self-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          handleToggleQuestion(currentQuestion.id);
                          // Stay on same index or go back if at end
                          if (previewIndex >= selectedQuestionIds.length - 1 && previewIndex > 0) {
                            setPreviewIndex(previewIndex - 1);
                          }
                        }}
                      >
                        Remove from Test
                      </Button>
                    </div>
                    <div className="justify-self-end">
                      <Button
                        variant="secondary"
                        onClick={() => setPreviewIndex(i => Math.min(selectedQuestionIds.length - 1, i + 1))}
                        disabled={previewIndex === selectedQuestionIds.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isTitleFilled || saving} loading={saving}>
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
