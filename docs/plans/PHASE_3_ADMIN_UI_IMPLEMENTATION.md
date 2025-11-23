# Phase 3: Admin Test & Question Management - Implementation Plan

**Goal:** Admins can fully manage tests and questions via UI (no more curl!)

**Duration Estimate:** 4-6 days

**Starting Version:** Backend 0.6.1, Frontend 0.6.2
**Target Version:** Backend 0.7.0, Frontend 0.7.0

---

## Overview

Phase 3 transforms the admin dashboard from a placeholder shell into a fully functional management interface. After this phase, admins will be able to create, edit, and delete questions and tests entirely through the UI, add/remove questions from tests, and view assessment results.

**What's Already Done (Phase 1 & 2):**
- ✅ All backend API endpoints exist (CRUD for questions, tests, test_questions)
- ✅ JWT authentication working
- ✅ Admin dashboard shell with tab navigation
- ✅ Protected routes
- ✅ API helper with automatic JWT management

**What We're Building:**
- Questions Management UI (list, create, edit, delete, filter)
- Tests Management UI (list, create, edit, delete, add/remove questions)
- Assessments List UI (view results by test)
- Reusable UI components (buttons, modals, forms, notifications)

---

## Task Breakdown

### Task 1: Shared UI Components Library

**Why First:** All subsequent tasks need these components. Building them first prevents duplication and ensures consistent UI.

**Duration:** 1 day

#### Components to Create

**`frontend/src/components/ui/Button.jsx`**
```jsx
import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-opacity-90 focus:ring-primary',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${(disabled || loading) ? disabledClasses : ''}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};

export default Button;
```

**`frontend/src/components/ui/Input.jsx`**
```jsx
import React from 'react';

const Input = ({
  label,
  error,
  required = false,
  type = 'text',
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
```

**`frontend/src/components/ui/Textarea.jsx`**
```jsx
import React from 'react';

const Textarea = ({
  label,
  error,
  required = false,
  rows = 4,
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Textarea;
```

**`frontend/src/components/ui/Select.jsx`**
```jsx
import React from 'react';

const Select = ({
  label,
  error,
  required = false,
  options = [],
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;
```

**`frontend/src/components/ui/Modal.jsx`**
```jsx
import React, { useEffect } from 'react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className={`inline-block w-full ${sizeClasses[size]} my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
```

**`frontend/src/components/ui/Card.jsx`**
```jsx
import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
```

**`frontend/src/components/ui/LoadingSpinner.jsx`**
```jsx
import React from 'react';

const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <svg
        className={`animate-spin text-primary ${sizeClasses[size]}`}
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;
```

**`frontend/src/components/ui/Toast.jsx`**
```jsx
import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${typeClasses[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Toast container component to manage multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default Toast;
```

**`frontend/src/hooks/useToast.js`**
```javascript
import { useState, useCallback } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = toastId++;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess: (msg) => addToast(msg, 'success'),
    showError: (msg) => addToast(msg, 'error'),
    showInfo: (msg) => addToast(msg, 'info'),
    showWarning: (msg) => addToast(msg, 'warning')
  };
};
```

#### Unit Tests for Components

**`frontend/tests/components/Button.test.jsx`**
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../src/components/ui/Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

**`frontend/tests/components/Modal.test.jsx`**
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../src/components/ui/Modal';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<Modal isOpen={false} title="Test">Content</Modal>);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<Modal isOpen={true} title="Test">Content</Modal>);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalled();
  });
});
```

#### Commit

```bash
git add frontend/src/components/ui/ frontend/src/hooks/useToast.js frontend/tests/components/
git commit -m "feat(frontend): add shared UI component library

- Add Button, Input, Textarea, Select components
- Add Modal and Card components
- Add LoadingSpinner and Toast notification system
- Add useToast hook for toast management
- Include unit tests for all components

All components follow Tailwind CSS design system with
consistent styling, focus states, and accessibility features.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Questions Management Tab

**Why Second:** Questions are the foundation - tests are built from questions. Admins need questions before they can create meaningful tests.

**Duration:** 1.5 days

#### Features to Implement

1. **List all questions** with pagination
2. **Create question form** (modal)
3. **Edit question** (modal)
4. **Delete question** (with confirmation)
5. **Filter by type** (SINGLE/MULTIPLE)
6. **Filter by tags**

#### Create Questions List Component

**`frontend/src/pages/admin/QuestionsTab.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import QuestionForm from './QuestionForm';
import Modal from '../../components/ui/Modal';

const QuestionsTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTag, setSearchTag] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/questions');
      setQuestions(data.questions || []);
    } catch (error) {
      showError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (questionData) => {
    try {
      await apiRequest('/api/questions', {
        method: 'POST',
        body: JSON.stringify(questionData)
      });
      showSuccess('Question created successfully');
      setIsFormOpen(false);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to create question');
    }
  };

  const handleEdit = async (questionData) => {
    try {
      await apiRequest(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify(questionData)
      });
      showSuccess('Question updated successfully');
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to update question');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/questions/${id}`, {
        method: 'DELETE'
      });
      showSuccess('Question deleted successfully');
      setDeleteConfirm(null);
      fetchQuestions();
    } catch (error) {
      showError(error.message || 'Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filterType !== 'ALL' && q.type !== filterType) return false;
    if (searchTag && !q.tags?.some(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))) return false;
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          Create Question
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">All Types</option>
              <option value="SINGLE">Single Choice</option>
              <option value="MULTIPLE">Multiple Choice</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Tags</label>
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="Filter by tag..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No questions found. Create your first question to get started!
            </p>
          </Card>
        ) : (
          filteredQuestions.map(question => (
            <Card key={question.id} className="hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.type}
                    </span>
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex gap-1">
                        {question.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-gray-900 font-medium mb-2">{question.text}</p>

                  <div className="text-sm text-gray-600">
                    <strong>Options:</strong> {question.options.join(', ')}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    <strong>Correct:</strong> {question.correct_answers.join(', ')}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingQuestion(question)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteConfirm(question)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Create Question"
          size="lg"
        >
          <QuestionForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          title="Edit Question"
          size="lg"
        >
          <QuestionForm
            question={editingQuestion}
            onSubmit={handleEdit}
            onCancel={() => setEditingQuestion(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete this question?
            </p>
            <p className="text-sm text-gray-600 italic">
              "{deleteConfirm.text}"
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete Question
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuestionsTab;
```

**`frontend/src/pages/admin/QuestionForm.jsx`**

```jsx
import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';

const QuestionForm = ({ question, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    text: question?.text || '',
    type: question?.type || 'SINGLE',
    options: question?.options || ['', ''],
    correct_answers: question?.correct_answers || [],
    tags: question?.tags?.join(', ') || ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
        correct_answers: prev.correct_answers.filter(ans => ans !== prev.options[index])
      }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    const oldValue = newOptions[index];
    newOptions[index] = value;

    // Update correct_answers if this option was selected
    const newCorrectAnswers = formData.correct_answers.map(ans =>
      ans === oldValue ? value : ans
    );

    setFormData(prev => ({
      ...prev,
      options: newOptions,
      correct_answers: newCorrectAnswers
    }));
  };

  const handleCorrectAnswerToggle = (option) => {
    setFormData(prev => {
      if (prev.type === 'SINGLE') {
        return { ...prev, correct_answers: [option] };
      } else {
        const isSelected = prev.correct_answers.includes(option);
        return {
          ...prev,
          correct_answers: isSelected
            ? prev.correct_answers.filter(ans => ans !== option)
            : [...prev.correct_answers, option]
        };
      }
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.text.trim()) {
      newErrors.text = 'Question text is required';
    } else if (formData.text.length < 10) {
      newErrors.text = 'Question must be at least 10 characters';
    } else if (formData.text.length > 1000) {
      newErrors.text = 'Question must be at most 1000 characters';
    }

    const nonEmptyOptions = formData.options.filter(opt => opt.trim());
    if (nonEmptyOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    if (formData.correct_answers.length === 0) {
      newErrors.correct_answers = 'At least one correct answer must be selected';
    }

    if (formData.type === 'SINGLE' && formData.correct_answers.length > 1) {
      newErrors.correct_answers = 'Single choice questions can only have one correct answer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const submitData = {
        text: formData.text.trim(),
        type: formData.type,
        options: formData.options.filter(opt => opt.trim()),
        correct_answers: formData.correct_answers,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      await onSubmit(submitData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        label="Question Text"
        value={formData.text}
        onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
        error={errors.text}
        required
        rows={3}
        placeholder="Enter your question..."
      />

      <Select
        label="Question Type"
        value={formData.type}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          type: e.target.value,
          correct_answers: e.target.value === 'SINGLE' ? [prev.correct_answers[0]].filter(Boolean) : prev.correct_answers
        }))}
        options={[
          { value: 'SINGLE', label: 'Single Choice' },
          { value: 'MULTIPLE', label: 'Multiple Choice' }
        ]}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Answer Options <span className="text-red-500">*</span>
        </label>

        <div className="space-y-2">
          {formData.options.map((option, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input
                type={formData.type === 'SINGLE' ? 'radio' : 'checkbox'}
                checked={formData.correct_answers.includes(option)}
                onChange={() => handleCorrectAnswerToggle(option)}
                disabled={!option.trim()}
                className="mt-3"
              />
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              {formData.options.length > 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => handleRemoveOption(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        {errors.options && <p className="mt-1 text-sm text-red-600">{errors.options}</p>}
        {errors.correct_answers && <p className="mt-1 text-sm text-red-600">{errors.correct_answers}</p>}

        {formData.options.length < 10 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAddOption}
            className="mt-2"
          >
            Add Option
          </Button>
        )}
      </div>

      <Input
        label="Tags (comma-separated)"
        value={formData.tags}
        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
        placeholder="e.g., math, easy, algebra"
      />

      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={submitting}
        >
          {question ? 'Update Question' : 'Create Question'}
        </Button>
      </div>
    </form>
  );
};

export default QuestionForm;
```

#### Update AdminDashboard to Use QuestionsTab

**`frontend/src/pages/admin/AdminDashboard.jsx`** (modify)

```jsx
import QuestionsTab from './QuestionsTab';

// In the tab content section:
{activeTab === 'questions' && <QuestionsTab />}
```

#### E2E Tests

**`frontend/tests/e2e/questions-management.spec.js`**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Questions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to Questions tab
    await page.click('text=Questions');
  });

  test('should display questions list', async ({ page }) => {
    await expect(page.locator('h2:has-text("Questions")')).toBeVisible();
  });

  test('should create a new question', async ({ page }) => {
    await page.click('text=Create Question');

    await page.fill('textarea[placeholder*="question"]', 'What is 2+2?');
    await page.selectOption('select', 'SINGLE');

    // Fill options
    await page.fill('input[placeholder="Option 1"]', '3');
    await page.fill('input[placeholder="Option 2"]', '4');

    // Select correct answer
    const correctRadio = page.locator('input[type="radio"]').nth(1);
    await correctRadio.check();

    await page.fill('input[placeholder*="tags"]', 'math, easy');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Question created successfully')).toBeVisible();
    await expect(page.locator('text=What is 2+2?')).toBeVisible();
  });

  test('should filter questions by type', async ({ page }) => {
    await page.selectOption('select', 'SINGLE');
    // Verify filtered results
  });

  test('should edit a question', async ({ page }) => {
    await page.click('button:has-text("Edit")').first();
    await page.fill('textarea[placeholder*="question"]', 'Updated question text');
    await page.click('button:has-text("Update Question")');
    await expect(page.locator('text=Question updated successfully')).toBeVisible();
  });

  test('should delete a question', async ({ page }) => {
    await page.click('button:has-text("Delete")').first();
    await page.click('button:has-text("Delete Question")');
    await expect(page.locator('text=Question deleted successfully')).toBeVisible();
  });
});
```

#### Commit

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx frontend/src/pages/admin/QuestionForm.jsx frontend/tests/e2e/questions-management.spec.js
git commit -m "feat(admin): add questions management UI

- Full CRUD operations for questions
- Filter by type (SINGLE/MULTIPLE) and tags
- Create/edit question form with validation
- Delete confirmation modal
- Real-time form validation
- Toast notifications for user feedback
- E2E tests for all operations

Admins can now manage questions entirely through the UI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Tests Management Tab

**Duration:** 1.5 days

#### Features to Implement

1. **List all tests** with metadata
2. **Create test form**
3. **Edit test** (title, description, slug, enabled status)
4. **Delete test** (with confirmation)
5. **Add questions to test** (with weight)
6. **Remove questions from test**
7. **Enable/disable toggle**
8. **Copy test slug** for sharing

#### Backend Enhancement Needed

Add endpoint to get questions for a specific test with weights:

**`backend/routes/tests.js`** - Add this endpoint if not exists:

```javascript
// GET /api/tests/:testId/questions
router.get('/:testId/questions',
  authenticateToken,
  param('testId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const questions = await sql`
        SELECT
          q.*,
          tq.weight
        FROM ${sql(dbSchema)}.test_questions tq
        JOIN ${sql(dbSchema)}.questions q ON q.id = tq.question_id
        WHERE tq.test_id = ${req.params.testId}
        ORDER BY tq.created_at ASC
      `;

      res.json({ questions });
    } catch (error) {
      console.error('Error fetching test questions:', error);
      res.status(500).json({ error: 'Failed to fetch test questions' });
    }
  }
);

// DELETE /api/tests/:testId/questions/:questionId
router.delete('/:testId/questions/:questionId',
  authenticateToken,
  param('testId').isUUID(),
  param('questionId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      await sql`
        DELETE FROM ${sql(dbSchema)}.test_questions
        WHERE test_id = ${req.params.testId}
        AND question_id = ${req.params.questionId}
      `;

      res.json({ message: 'Question removed from test' });
    } catch (error) {
      console.error('Error removing question from test:', error);
      res.status(500).json({ error: 'Failed to remove question from test' });
    }
  }
);
```

#### Create Tests Management Component

**`frontend/src/pages/admin/TestsTab.jsx`**

[Similar structure to QuestionsTab but for tests, including:]
- List tests with question count, enabled status
- Create/edit test form
- Add/remove questions modal with weight input
- Enable/disable toggle
- Copy slug button
- Delete confirmation

**`frontend/src/pages/admin/TestForm.jsx`**

Form for creating/editing tests (title, description, slug, is_enabled)

**`frontend/src/pages/admin/ManageTestQuestions.jsx`**

Modal component for adding/removing questions from a test with weight input

#### E2E Tests

**`frontend/tests/e2e/tests-management.spec.js`**

Test all CRUD operations for tests, including adding/removing questions

#### Commit

```bash
git add backend/routes/tests.js frontend/src/pages/admin/TestsTab.jsx frontend/src/pages/admin/TestForm.jsx frontend/src/pages/admin/ManageTestQuestions.jsx frontend/tests/e2e/tests-management.spec.js
git commit -m "feat(admin): add tests management UI

- Full CRUD operations for tests
- Add/remove questions to/from tests with weights
- Enable/disable tests toggle
- Copy test slug for sharing
- Backend endpoint for test questions listing
- E2E tests for all operations

Admins can now manage tests and compose them from questions.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Assessments List Tab

**Duration:** 1 day

#### Features to Implement

1. **List all assessments**
2. **Filter by test**
3. **Filter by status** (STARTED/COMPLETED)
4. **Sort by date, score**
5. **Display:** candidate name, test title, score, status, completion date

Note: Detailed view is Phase 4. This is list-only.

#### Create Assessments List Component

**`frontend/src/pages/admin/AssessmentsTab.jsx`**

Lists all assessments with filters and sorting

#### E2E Tests

**`frontend/tests/e2e/assessments-list.spec.js`**

#### Commit

```bash
git add frontend/src/pages/admin/AssessmentsTab.jsx frontend/tests/e2e/assessments-list.spec.js
git commit -m "feat(admin): add assessments list view

- List all candidate assessments
- Filter by test and status
- Sort by date and score
- Display key metrics (name, score, status, date)
- E2E tests for filtering and sorting

Admins can now view all assessment results at a glance.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Final Integration & Testing

**Duration:** 0.5 days

#### Tasks

1. **Run all tests** (unit, integration, E2E)
2. **Manual testing** of complete workflows
3. **Update package.json versions** to 0.7.0
4. **Update documentation**
5. **Final commit**

#### Testing Checklist

**Questions Management:**
- [ ] Create question (SINGLE and MULTIPLE)
- [ ] Edit question
- [ ] Delete question
- [ ] Filter by type
- [ ] Filter by tags
- [ ] Form validation works

**Tests Management:**
- [ ] Create test
- [ ] Edit test
- [ ] Delete test
- [ ] Add questions to test
- [ ] Remove questions from test
- [ ] Enable/disable test
- [ ] Copy test slug
- [ ] Test with questions works for candidates

**Assessments:**
- [ ] View assessments list
- [ ] Filter by test
- [ ] Filter by status
- [ ] Sort by date
- [ ] Sort by score

**Integration:**
- [ ] Create question → Add to test → Candidate takes test → View in assessments
- [ ] Disable test → Candidate cannot access
- [ ] Edit question → Test still works
- [ ] Delete question not in tests
- [ ] Cannot delete question that's in a test (should show error)

#### Update Documentation

**`README.md`** - Update with Phase 3 features

**Update package.json versions:**

```bash
# Backend
cd backend
npm version minor  # 0.6.1 -> 0.7.0

# Frontend
cd frontend
npm version minor  # 0.6.2 -> 0.7.0
```

#### Final Commit

```bash
git add README.md backend/package.json frontend/package.json
git commit -m "chore: Phase 3 complete - version 0.7.0

Phase 3 delivers complete admin management UI:
- Questions: Full CRUD with filtering
- Tests: Full CRUD with question management
- Assessments: List view with filtering
- Shared UI component library
- Comprehensive E2E test coverage

All tests passing:
- Backend: 62+ tests
- Frontend Unit: 25+ tests
- Frontend E2E: 35+ tests

No more curl needed - admins can manage everything via UI!

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

After Phase 3, verify these capabilities:

**Questions Management:**
- ✅ Create questions via UI (no more curl!)
- ✅ Edit existing questions
- ✅ Delete questions
- ✅ Filter by type and tags
- ✅ See all question details clearly

**Tests Management:**
- ✅ Create tests via UI
- ✅ Add questions to tests with custom weights
- ✅ Remove questions from tests
- ✅ Enable/disable tests
- ✅ Edit test metadata (title, description, slug)
- ✅ Delete tests
- ✅ Copy test slug for sharing

**Assessments:**
- ✅ View all candidate assessment results
- ✅ Filter by test
- ✅ Filter by completion status
- ✅ Sort by date or score

**Integration:**
- ✅ Complete workflow: Create question → Create test → Add questions → Share slug → Candidate takes test → View results
- ✅ All Phase 1 & 2 features still work
- ✅ All tests passing (unit + integration + E2E)

**User Experience:**
- ✅ Consistent UI across all tabs
- ✅ Toast notifications for all actions
- ✅ Loading states during API calls
- ✅ Error messages are helpful
- ✅ Confirmation dialogs for destructive actions
- ✅ Form validation prevents bad data

---

## Testing Strategy

### Unit Tests
- All UI components (Button, Modal, Input, etc.)
- useToast hook
- Form validation logic

### Integration Tests
- Questions API CRUD operations
- Tests API CRUD operations
- Test-questions relationship operations

### E2E Tests
- Complete question management workflow
- Complete test management workflow
- Add/remove questions to/from tests
- Assessments list with filters
- End-to-end: Admin creates test → Candidate takes → Admin views results

**Run tests:**
```bash
# Backend
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# Frontend E2E
cd frontend && npm run test:e2e -- --reporter=line
```

---

## Deployment Notes

**After Phase 3:**

1. **Test locally first**
   - All features working
   - All tests passing
   - No console errors

2. **Update versions**
   - Backend: 0.6.1 → 0.7.0
   - Frontend: 0.6.2 → 0.7.0

3. **Commit and tag**
   ```bash
   git tag v0.7.0
   git push && git push --tags
   ```

4. **Deploy to Render** (staging first, then production)
   - No database migrations needed (schema unchanged)
   - Environment variables unchanged
   - Just deploy new code

5. **Post-deployment testing**
   - Login to admin
   - Create a question
   - Create a test
   - Add question to test
   - Take test as candidate
   - View results

---

## Notes

- **No TypeScript:** Keep everything in JavaScript as per CLAUDE.md
- **Keep it simple:** Avoid over-engineering, build exactly what's needed
- **Progressive enhancement:** Each task builds on the previous
- **Test as you go:** Don't wait until the end to test
- **Commit frequently:** After each completed task
- **Ask for clarification:** If requirements are unclear

---

## What's Next (Phase 4)

After Phase 3, these features remain for Phase 4:
- YAML question import UI
- Assessment detail view (see all answers)
- Better error handling throughout
- Loading skeletons
- Empty states

Phase 3 focuses on core CRUD operations. Phase 4 will add the convenience features.
