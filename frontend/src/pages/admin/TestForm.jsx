import React, { useState, useEffect } from 'react';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

const TestForm = ({ test, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slug: '',
    visibility: 'private',
    is_enabled: false,
    pass_threshold: 0,
    show_explanations: 'never',
    explanation_scope: 'selected_only'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (test) {
      setFormData({
        title: test.title || '',
        description: test.description || '',
        slug: test.slug || '',
        visibility: test.visibility || 'private',
        is_enabled: test.is_enabled || false,
        pass_threshold: test.pass_threshold ?? 0,
        show_explanations: test.show_explanations || 'never',
        explanation_scope: test.explanation_scope || 'selected_only'
      });
    }
  }, [test]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };


  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    const validVisibilities = ['private', 'public', 'protected'];
    if (!validVisibilities.includes(formData.visibility)) {
      newErrors.visibility = 'Invalid visibility option';
    }

    const threshold = parseInt(formData.pass_threshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      newErrors.pass_threshold = 'Pass threshold must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // For new tests, don't include slug (backend auto-generates)
      // For editing, include slug as-is
      const dataToSubmit = test ? formData : { ...formData };
      if (!test) {
        delete dataToSubmit.slug;
      }
      await onSubmit(dataToSubmit);
    } catch (error) {
      setErrors({ general: error.message || 'Failed to save test' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      <Input
        label="Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        error={errors.title}
        required
        placeholder="e.g., JavaScript Fundamentals"
      />

      <Textarea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        error={errors.description}
        rows={3}
        placeholder="Brief description of the test..."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
        <select
          name="visibility"
          value={formData.visibility}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="private">Private - Requires direct link</option>
          <option value="public">Public - Listed on home page (v2)</option>
          <option value="protected">Protected - Access restricted (v2)</option>
        </select>
        {errors.visibility && (
          <p className="text-sm text-red-600 mt-1">{errors.visibility}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Private tests require the direct link. Public/protected features coming in v2.
        </p>
      </div>

      {test && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test Link</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded-md text-sm">
              /t/{formData.slug}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${formData.slug}`)}
            >
              Copy Link
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Link regeneration available in test settings.
          </p>
        </div>
      )}

      <Input
        label="Pass Threshold (%)"
        name="pass_threshold"
        type="number"
        min="0"
        max="100"
        value={formData.pass_threshold}
        onChange={handleChange}
        error={errors.pass_threshold}
        placeholder="0"
        help="Set to 0 for neutral scoring (no pass/fail). Set to 1-100 to show pass/fail based on score."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Show Explanations</label>
        <select
          name="show_explanations"
          value={formData.show_explanations}
          onChange={handleChange}
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
            onChange={handleChange}
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
          onChange={handleChange}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <label htmlFor="is_enabled" className="ml-2 block text-sm text-gray-700">
          Enable test (allow candidates to take it)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
        >
          {test ? 'Update Test' : 'Create Test'}
        </Button>
      </div>
    </form>
  );
};

export default TestForm;
