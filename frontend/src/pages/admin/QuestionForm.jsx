import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';

const QuestionForm = ({ question, onSubmit, onCancel, onFormChange, hideButtons = false }) => {
  // Convert correct_answers from indices to option text if editing
  const getCorrectAnswersText = () => {
    if (!question?.correct_answers || !question?.options) return [];

    // If correct_answers contains indices (numbers), convert to option text
    return question.correct_answers.map(answer => {
      if (typeof answer === 'number') {
        return question.options[answer];
      }
      return answer;
    }).filter(Boolean);
  };

  const [formData, setFormData] = useState({
    title: question?.title || '',
    text: question?.text || '',
    type: question?.type || 'SINGLE',
    visibility: question?.visibility || 'private',
    options: Array.isArray(question?.options) ? question.options : ['', ''],
    correct_answers: getCorrectAnswersText(),
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
      const cleanedOptions = formData.options.filter(opt => opt.trim());

      // Convert correct_answers from option text to indices
      const correctAnswersIndices = formData.correct_answers.map(answer => {
        return cleanedOptions.indexOf(answer);
      }).filter(index => index !== -1);

      const submitData = {
        title: formData.title.trim(),
        text: formData.text.trim(),
        type: formData.type,
        visibility: formData.visibility,
        options: cleanedOptions,
        correct_answers: correctAnswersIndices,
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
