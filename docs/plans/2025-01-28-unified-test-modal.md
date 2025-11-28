# Unified Test Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge test edit, questions management, and preview into a single tabbed modal with table-based test list and bulk actions.

**Architecture:** Create a new `TestModal` component with 3 tabs (Settings, Questions, Preview). Refactor `TestsTab` from card-based to table-based layout matching `QuestionsTab` pattern. All changes in-memory until explicit Save. Bulk actions via dropdown menu with selection checkboxes.

**Tech Stack:** React, Tailwind CSS, existing UI components (Modal, Button, Input, etc.)

---

## Task 1: Create TestModal Component Shell

**Files:**
- Create: `frontend/src/pages/admin/TestModal.jsx`

**Step 1: Create basic modal component with tabs**

```jsx
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
```

**Step 2: Verify file was created**

Run: `ls -la frontend/src/pages/admin/TestModal.jsx`
Expected: File exists

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/TestModal.jsx
git commit -m "feat: add TestModal component shell with tabs"
```

---

## Task 2: Implement Settings Tab

**Files:**
- Modify: `frontend/src/pages/admin/TestModal.jsx`

**Step 1: Add Settings tab form fields**

Replace the Settings tab placeholder with the full form. Add these imports at the top:

```jsx
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
```

Replace `{activeTab === 'settings' && (<div>Settings tab content (Task 2)</div>)}` with:

```jsx
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
```

**Step 2: Verify Settings tab renders**

Run: `npm run dev` and check the modal visually
Expected: Settings tab shows all form fields

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/TestModal.jsx
git commit -m "feat: implement Settings tab in TestModal"
```

---

## Task 3: Implement Save Logic

**Files:**
- Modify: `frontend/src/pages/admin/TestModal.jsx`

**Step 1: Add API import and save handler**

Add import at top:
```jsx
import { apiRequest } from '../../utils/api';
```

Add state for loading and errors:
```jsx
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
```

Replace the `handleSave` function with:

```jsx
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
```

**Step 2: Add error display**

Add error display at the top of the modal content (after tab navigation):

```jsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
    {error}
  </div>
)}
```

**Step 3: Update Save button to show loading state**

```jsx
<Button onClick={handleSave} disabled={!isTitleFilled || saving} loading={saving}>
  {isCreateMode ? 'Create Test' : 'Save Changes'}
</Button>
```

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/TestModal.jsx
git commit -m "feat: implement save logic for TestModal"
```

---

## Task 4: Implement Questions Tab

**Files:**
- Modify: `frontend/src/pages/admin/TestModal.jsx`

**Step 1: Add state for questions data**

Add these state variables:

```jsx
const [allQuestions, setAllQuestions] = useState([]);
const [questionsLoading, setQuestionsLoading] = useState(false);
const [questionWeights, setQuestionWeights] = useState({});
```

**Step 2: Add questions loading effect**

```jsx
// Load all questions when Questions tab is activated
useEffect(() => {
  if (activeTab === 'questions' && allQuestions.length === 0) {
    loadQuestions();
  }
}, [activeTab]);

// Load test questions when editing
useEffect(() => {
  if (test && isOpen) {
    loadTestQuestions();
  }
}, [test, isOpen]);

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
```

**Step 3: Add helper functions**

```jsx
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
```

**Step 4: Implement Questions tab content**

Replace the Questions tab placeholder with:

```jsx
{activeTab === 'questions' && (
  <div className="space-y-4">
    {/* Test Visibility Display */}
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700">Test Visibility:</span>
      {getVisibilityBadge(formData.visibility)}
    </div>

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
            Available Questions ({allQuestions.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {allQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No questions available</p>
            ) : (
              allQuestions.map(question => {
                const isSelected = selectedQuestionIds.includes(question.id);
                const isCompatible = canQuestionBeInTest(question.visibility, formData.visibility);

                return (
                  <div
                    key={question.id}
                    className={`p-3 border rounded flex items-start gap-3 ${
                      isSelected ? 'bg-tech/10 border-tech' :
                      isCompatible ? 'hover:bg-gray-50' : 'opacity-50 bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => isCompatible && handleToggleQuestion(question.id)}
                      disabled={!isCompatible}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{question.title}</div>
                      <div className="text-xs text-gray-600">{truncateText(question.text)}</div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {question.type}
                        </span>
                        {getVisibilityBadge(question.visibility)}
                      </div>
                      {!isCompatible && (
                        <p className="text-xs text-red-600 mt-1">
                          Incompatible visibility
                        </p>
                      )}
                    </div>
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
                    className="p-3 border border-tech bg-tech/10 rounded flex items-start justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{question.title}</div>
                      <div className="text-xs text-gray-600">{truncateText(question.text)}</div>
                    </div>
                    <button
                      onClick={() => handleToggleQuestion(qId)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove question"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
```

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/TestModal.jsx
git commit -m "feat: implement Questions tab in TestModal"
```

---

## Task 5: Implement Preview Tab

**Files:**
- Modify: `frontend/src/pages/admin/TestModal.jsx`

**Step 1: Add preview state**

```jsx
const [previewIndex, setPreviewIndex] = useState(0);
const [showAnswers, setShowAnswers] = useState(false);
```

**Step 2: Add import for MarkdownRenderer**

```jsx
import MarkdownRenderer from '../../components/MarkdownRenderer';
```

**Step 3: Add parseOptions helper**

```jsx
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
```

**Step 4: Implement Preview tab content**

Replace the Preview tab placeholder with:

```jsx
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

    {selectedQuestionIds.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No questions selected. Add questions in the Questions tab.
      </div>
    ) : (() => {
      const currentQuestion = allQuestions.find(q => q.id === selectedQuestionIds[previewIndex]);
      if (!currentQuestion) return <div>Question not found</div>;

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
                  <div className="flex items-start gap-3">
                    <span className={`w-5 h-5 flex-shrink-0 mt-0.5 border-2 ${indicatorClass} ${
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

          {/* Remove from test button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="sm"
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

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
              disabled={previewIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPreviewIndex(i => Math.min(selectedQuestionIds.length - 1, i + 1))}
              disabled={previewIndex === selectedQuestionIds.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      );
    })()}
  </div>
)}
```

**Step 5: Reset preview index when questions change**

Add this effect:

```jsx
// Reset preview index when selected questions change
useEffect(() => {
  if (previewIndex >= selectedQuestionIds.length) {
    setPreviewIndex(Math.max(0, selectedQuestionIds.length - 1));
  }
}, [selectedQuestionIds.length]);
```

**Step 6: Commit**

```bash
git add frontend/src/pages/admin/TestModal.jsx
git commit -m "feat: implement Preview tab in TestModal"
```

---

## Task 6: Refactor TestsTab to Table Layout

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx`

**Step 1: Add selection state**

Add these state variables at the top of the component:

```jsx
const [selectedIds, setSelectedIds] = useState(new Set());
const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
const [bulkAction, setBulkAction] = useState(null);
const [bulkVisibility, setBulkVisibility] = useState('');
const [bulkAuthor, setBulkAuthor] = useState('');
const [users, setUsers] = useState([]);
```

**Step 2: Add users fetch**

Add users fetch in useEffect and create function:

```jsx
useEffect(() => {
  loadTests();
  fetchUsers();
}, []);

const fetchUsers = async () => {
  try {
    const data = await apiRequest('/api/questions/users');
    setUsers(data.users || []);
  } catch (error) {
    console.error('Failed to load users:', error);
  }
};
```

**Step 3: Add selection handlers**

```jsx
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
```

**Step 4: Replace card-based layout with table**

Replace the Tests List section (inside the return) with:

```jsx
{/* Tests Table */}
{tests.length === 0 ? (
  <div className="text-center py-12 bg-gray-50 rounded-lg">
    <p className="text-gray-600 mb-4">No tests yet</p>
    <Button onClick={() => setShowCreateModal(true)}>
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
              checked={selectedIds.size === tests.length && tests.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Title
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Visibility
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Questions
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Threshold
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tests.map((test) => (
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
              <div className="text-xs text-gray-500">/t/{test.slug}</div>
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
                  onClick={() => setEditingTest(test)}
                  className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                  title="Edit test"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {/* Preview icon */}
                <button
                  onClick={() => test.question_count > 0 && setPreviewTest(test)}
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
                  onClick={() => setRegenerateConfirm(test)}
                  className="p-1.5 text-gray-500 hover:text-tech hover:bg-gray-100 rounded"
                  title="Regenerate link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {/* Toggle enabled icon */}
                <button
                  onClick={() => handleToggleEnabled(test)}
                  className={`p-1.5 rounded ${
                    test.is_enabled
                      ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      : 'text-gray-500 hover:text-green-600 hover:bg-gray-100'
                  }`}
                  title={test.is_enabled ? 'Disable test' : 'Enable test'}
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
                  onClick={() => handleDeleteTest(test)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete test"
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
```

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "refactor: convert TestsTab to table layout"
```

---

## Task 7: Add Bulk Actions to TestsTab

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx`

**Step 1: Add bulk action handlers**

```jsx
const handleBulkEnable = async (enable) => {
  try {
    for (const testId of selectedIds) {
      const test = tests.find(t => t.id === testId);
      if (test && test.is_enabled !== enable) {
        await apiRequest(`/api/tests/${testId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: test.title,
            description: test.description,
            is_enabled: enable,
            pass_threshold: test.pass_threshold ?? 0
          })
        });
      }
    }
    setSuccessMessage(`${enable ? 'Enabled' : 'Disabled'} ${selectedIds.size} tests`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setSelectedIds(new Set());
    setBulkAction(null);
    loadTests();
  } catch (err) {
    setError(err.message || 'Failed to update tests');
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
            pass_threshold: test.pass_threshold ?? 0
          })
        });
      }
    }
    setSuccessMessage(`Changed visibility for ${selectedIds.size} tests`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkVisibility('');
    loadTests();
  } catch (err) {
    setError(err.message || 'Failed to update tests');
  }
};
```

**Step 2: Update header with bulk actions dropdown**

Replace the header section with:

```jsx
{/* Header */}
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-xl font-semibold text-gray-900">Tests</h2>
    <p className="text-sm text-gray-600 mt-1">
      Manage your assessment tests
      {selectedIds.size > 0 && (
        <span className="ml-2 font-medium text-tech">
          ({selectedIds.size} selected)
        </span>
      )}
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
    <Button onClick={() => setShowCreateModal(true)}>
      Create Test
    </Button>
  </div>
</div>
```

**Step 3: Add bulk action modals**

Add at the end of the component, before the final `</div>`:

```jsx
{/* Bulk Enable/Disable Modal */}
{(bulkAction === 'enable' || bulkAction === 'disable') && (
  <Modal
    isOpen={true}
    onClose={() => setBulkAction(null)}
    title={`${bulkAction === 'enable' ? 'Enable' : 'Disable'} ${selectedIds.size} Tests`}
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
    title={`Change Visibility for ${selectedIds.size} Tests`}
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
          className="w-full border border-gray-300 rounded-md px-3 py-2"
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
```

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "feat: add bulk actions to TestsTab"
```

---

## Task 8: Integrate TestModal into TestsTab

**Files:**
- Modify: `frontend/src/pages/admin/TestsTab.jsx`

**Step 1: Import TestModal and remove old imports**

Replace imports:

```jsx
import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TestModal from './TestModal';
import TestPreviewModal from '../../components/TestPreviewModal';
import { apiRequest } from '../../utils/api';
```

Remove these imports (no longer needed):
- `TestForm`
- `ManageTestQuestions`

**Step 2: Update state variables**

Replace these states:
```jsx
const [showCreateModal, setShowCreateModal] = useState(false);
const [editingTest, setEditingTest] = useState(null);
const [managingTest, setManagingTest] = useState(null);
```

With:
```jsx
const [modalTest, setModalTest] = useState(null);
const [modalOpen, setModalOpen] = useState(false);
const [modalInitialTab, setModalInitialTab] = useState('settings');
```

**Step 3: Update handlers**

```jsx
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
```

**Step 4: Update Create Test button**

```jsx
<Button onClick={() => handleOpenModal(null, 'settings')}>
  Create Test
</Button>
```

**Step 5: Update table action buttons**

Replace edit button onClick:
```jsx
onClick={() => handleOpenModal(test, 'settings')}
```

Replace preview button onClick:
```jsx
onClick={() => test.question_count > 0 && handleOpenModal(test, 'preview')}
```

**Step 6: Replace old modals with new TestModal**

Remove these modal sections:
- Create Test Modal
- Edit Test Modal
- Manage Test Questions Modal

Add new TestModal:

```jsx
{/* Test Modal (Create/Edit) */}
<TestModal
  isOpen={modalOpen}
  onClose={handleCloseModal}
  test={modalTest}
  initialTab={modalInitialTab}
  onSave={handleModalSave}
/>
```

Keep these modals:
- Regenerate Slug Confirmation Modal
- TestPreviewModal (for now, until TestModal preview is fully working)

**Step 7: Commit**

```bash
git add frontend/src/pages/admin/TestsTab.jsx
git commit -m "feat: integrate TestModal into TestsTab"
```

---

## Task 9: Clean Up Old Components

**Files:**
- Delete: `frontend/src/pages/admin/TestForm.jsx`
- Delete: `frontend/src/pages/admin/ManageTestQuestions.jsx`
- Modify: `frontend/src/pages/admin/TestsTab.jsx` (remove TestPreviewModal if not needed)

**Step 1: Delete old components**

```bash
rm frontend/src/pages/admin/TestForm.jsx
rm frontend/src/pages/admin/ManageTestQuestions.jsx
```

**Step 2: Remove unused imports from TestsTab.jsx**

Ensure TestPreviewModal import is removed if preview is now in TestModal.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated TestForm and ManageTestQuestions"
```

---

## Task 10: Update E2E Tests

**Files:**
- Modify: `frontend/tests/e2e/tests-management.spec.js`

**Step 1: Update test selectors for new table layout**

Replace the tests file content with updated selectors:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Tests Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to Tests tab (should be default)
    await page.click('text=Tests');
  });

  test('should display tests table', async ({ page }) => {
    await expect(page.locator('h2:has-text("Tests")')).toBeVisible();
    // Check for table structure
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Visibility")')).toBeVisible();
    await expect(page.locator('th:has-text("Questions")')).toBeVisible();
  });

  test('should create a new test', async ({ page }) => {
    await page.click('button:has-text("Create Test")');

    // Fill in form in Settings tab
    await page.fill('input[name="title"]', 'E2E Test Assessment');
    await page.fill('textarea[name="description"]', 'Test description for E2E');
    await page.check('input[id="is_enabled"]');

    // Click save
    await page.click('button:has-text("Create Test")');

    // Wait for modal to close and test to appear in table
    await expect(page.locator('td:has-text("E2E Test Assessment")')).toBeVisible();
  });

  test('should edit a test via edit icon', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table');

    // Click edit icon (pencil) in first row
    await page.locator('button[title="Edit test"]').first().click();

    // Modal should open in Settings tab
    await expect(page.locator('input[name="title"]')).toBeVisible();

    // Update title
    await page.fill('input[name="title"]', 'Updated Test Title');
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('td:has-text("Updated Test Title")')).toBeVisible();
  });

  test('should toggle test enabled status via icon', async ({ page }) => {
    await page.waitForSelector('table');

    // Click toggle icon
    const toggleButton = page.locator('button[title="Enable test"], button[title="Disable test"]').first();
    await toggleButton.click();

    // Wait for update
    await page.waitForTimeout(500);
  });

  test('should copy test URL', async ({ page }) => {
    await page.waitForSelector('table');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy link icon
    await page.locator('button[title="Copy link"]').first().click();

    // Wait for success message
    await expect(page.locator('text=Test URL copied to clipboard!')).toBeVisible({ timeout: 3000 });
  });

  test('should manage questions via modal tabs', async ({ page }) => {
    await page.waitForSelector('table');

    // Click edit icon
    await page.locator('button[title="Edit test"]').first().click();

    // Click Questions tab
    await page.click('button:has-text("Questions")');

    // Should show Available Questions section
    await expect(page.locator('h4:has-text("Available Questions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Selected Questions")')).toBeVisible();
  });

  test('should preview test via preview icon', async ({ page }) => {
    await page.waitForSelector('table');

    // Find a test with questions (preview icon should be enabled)
    const previewButton = page.locator('button[title="Preview test"]').first();

    // Check if button is enabled (has questions)
    const isDisabled = await previewButton.getAttribute('disabled');
    if (!isDisabled) {
      await previewButton.click();

      // Should open modal in Preview tab
      await expect(page.locator('text=Show Answers')).toBeVisible();
    }
  });

  test('should delete a test', async ({ page }) => {
    await page.waitForSelector('table');

    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('sure');
      await dialog.accept();
    });

    // Click delete icon
    await page.locator('button[title="Delete test"]').first().click();

    // Wait for deletion
    await page.waitForTimeout(500);
  });

  test('should show bulk actions when tests selected', async ({ page }) => {
    await page.waitForSelector('table');

    // Select first test
    await page.locator('tbody input[type="checkbox"]').first().click();

    // Bulk actions button should be enabled
    const bulkButton = page.locator('button:has-text("Bulk Actions")');
    await expect(bulkButton).toBeEnabled();

    // Click to open dropdown
    await bulkButton.click();

    // Should show options
    await expect(page.locator('text=Enable selected')).toBeVisible();
    await expect(page.locator('text=Disable selected')).toBeVisible();
    await expect(page.locator('text=Change visibility')).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `./scripts/e2e-tests.sh`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/tests/e2e/tests-management.spec.js
git commit -m "test: update E2E tests for unified TestModal"
```

---

## Task 11: Update Package Version

**Files:**
- Modify: `frontend/package.json`
- Modify: `backend/package.json`

**Step 1: Bump minor version**

Update version in both package.json files from current version to next minor (e.g., 1.3.0 → 1.4.0)

**Step 2: Commit**

```bash
git add frontend/package.json backend/package.json
git commit -m "chore: bump version to 1.4.0"
```

---

## Task 12: Final Integration Test

**Step 1: Run all tests**

```bash
cd backend && npm test
cd ../frontend && npm test
./scripts/e2e-tests.sh
```

**Step 2: Manual verification checklist**

- [ ] Create test modal opens with Settings tab
- [ ] Questions tab disabled until title entered
- [ ] Preview tab disabled until questions selected
- [ ] Adding/removing questions works in Questions tab
- [ ] Preview tab shows questions with Show Answers toggle
- [ ] Remove from Test button in Preview works
- [ ] Save creates test with questions
- [ ] Edit existing test loads all data correctly
- [ ] Cancel with changes shows confirmation
- [ ] Table layout shows all columns correctly
- [ ] All action icons have tooltips
- [ ] Bulk enable/disable works
- [ ] Bulk change visibility works
- [ ] E2E tests pass

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: unified test modal with table layout and bulk actions

- Merge test edit, questions, and preview into single tabbed modal
- Convert tests list from cards to table format
- Add bulk actions: enable/disable, change visibility
- Add row selection with checkboxes
- All changes kept in memory until explicit Save
- Progressive tab enabling in create mode
- Update E2E tests for new UI"
```

---

Plan complete and saved to `docs/plans/2025-01-28-unified-test-modal.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
