import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';

// Helper to initialize options from either format
function initializeOptions(options) {
  const defaultOptions = [
    { text: '', is_correct: false, explanation: '' },
    { text: '', is_correct: false, explanation: '' }
  ];

  if (!options) {
    return defaultOptions;
  }

  // If options is a string, parse it first (handles double-stringified JSONB)
  let parsedOptions = options;
  if (typeof options === 'string') {
    try {
      parsedOptions = JSON.parse(options);
    } catch (e) {
      console.error('Failed to parse options string:', e);
      return defaultOptions;
    }
  }

  // Already array format
  if (Array.isArray(parsedOptions)) {
    return parsedOptions.map(opt => ({
      text: opt.text || '',
      is_correct: opt.is_correct || false,
      explanation: opt.explanation || ''
    }));
  }

  // Dict format: {"0": {text, is_correct}, ...}
  if (typeof parsedOptions === 'object' && parsedOptions !== null) {
    const entries = Object.entries(parsedOptions);
    if (entries.length === 0) {
      return defaultOptions;
    }
    return entries
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([_, opt]) => ({
        text: opt?.text || '',
        is_correct: opt?.is_correct || false,
        explanation: opt?.explanation || ''
      }));
  }

  // Fallback for any other case
  return defaultOptions;
}

const QuestionForm = ({ question, onSubmit, onCancel, onFormChange, hideButtons = false }) => {
  const [formData, setFormData] = useState({
    title: question?.title || '',
    text: question?.text || '',
    type: question?.type || 'SINGLE',
    visibility: question?.visibility || 'private',
    options: initializeOptions(question?.options),
    tags: Array.isArray(question?.tags) ? question.tags.join(', ') : ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Notify parent component of form changes for live preview
  useEffect(() => {
    if (onFormChange) {
      // Convert tags from string to array for preview
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      onFormChange({
        ...formData,
        tags: tagsArray
      });
    }
  }, [formData, onFormChange]);

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, { text: '', is_correct: false, explanation: '' }]
      }));
    }
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const handleOptionTextChange = (index, text) => {
    setFormData(prev => {
      const newOptions = [...prev.options];
      newOptions[index].text = text;
      return { ...prev, options: newOptions };
    });
  };

  const handleOptionCorrectChange = (index, isCorrect) => {
    setFormData(prev => {
      const newOptions = [...prev.options];

      if (prev.type === 'SINGLE') {
        // Uncheck all others for SINGLE type
        newOptions.forEach((opt, i) => {
          opt.is_correct = i === index ? isCorrect : false;
        });
      } else {
        newOptions[index].is_correct = isCorrect;
      }

      return { ...prev, options: newOptions };
    });
  };

  const handleOptionExplanationChange = (index, explanation) => {
    setFormData(prev => {
      const newOptions = [...prev.options];
      newOptions[index].explanation = explanation;
      return { ...prev, options: newOptions };
    });
  };

  const validate = () => {
    const newErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    // Text validation
    if (!formData.text.trim()) {
      newErrors.text = 'Question text is required';
    } else if (formData.text.length < 10) {
      newErrors.text = 'Question must be at least 10 characters';
    } else if (formData.text.length > 1000) {
      newErrors.text = 'Question must be at most 1000 characters';
    }

    // Visibility validation
    if (!['public', 'private', 'protected'].includes(formData.visibility)) {
      newErrors.visibility = 'Invalid visibility value';
    }

    // Options validation
    const nonEmptyOptions = formData.options.filter(opt => opt.text.trim());
    if (nonEmptyOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    // Correct answers validation
    const correctCount = formData.options.filter(opt => opt.is_correct).length;
    if (correctCount === 0) {
      newErrors.correct_answers = 'At least one correct answer must be selected';
    }

    if (formData.type === 'SINGLE' && correctCount > 1) {
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
      // Convert options array to dict format for API
      const optionsDict = {};
      formData.options.forEach((opt, index) => {
        if (opt.text.trim()) {
          optionsDict[String(index)] = {
            text: opt.text.trim(),
            is_correct: opt.is_correct,
            ...(opt.explanation?.trim() && { explanation: opt.explanation.trim() })
          };
        }
      });

      const submitData = {
        title: formData.title.trim(),
        text: formData.text.trim(),
        type: formData.type,
        visibility: formData.visibility,
        options: optionsDict,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      await onSubmit(submitData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        name="title"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        error={errors.title}
        required
        placeholder="e.g., Capital of France"
        help="A short, unique title to identify this question (max 200 characters)"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Visibility
        </label>
        <select
          name="visibility"
          value={formData.visibility}
          onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="private">Private - Only in private/protected tests</option>
          <option value="public">Public - Can be used in any test</option>
          <option value="protected">Protected - Only in protected tests</option>
        </select>
        {errors.visibility && <p className="mt-1 text-sm text-red-600">{errors.visibility}</p>}
        <p className="text-sm text-gray-500 mt-1">
          Controls which tests can use this question based on test visibility.
        </p>
      </div>

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
          type: e.target.value
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
                name={formData.type === 'SINGLE' ? 'correct-answer' : undefined}
                checked={option.is_correct}
                onChange={(e) => handleOptionCorrectChange(index, e.target.checked)}
                disabled={!option.text.trim()}
                className="mt-3"
              />
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionTextChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  value={option.explanation || ''}
                  onChange={(e) => handleOptionExplanationChange(index, e.target.value)}
                  placeholder="Explanation (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
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
        placeholder="Enter tags (e.g., math, easy, algebra)"
      />

      {!hideButtons && (
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
      )}
    </form>
  );
};

export default QuestionForm;
