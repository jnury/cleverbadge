import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, isLoggedIn } from '../utils/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    } else if (formData.displayName.trim().length > 100) {
      newErrors.displayName = 'Display name must be less than 100 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await register(
        formData.email.trim(),
        formData.displayName.trim(),
        formData.password
      );
      setSuccess(true);
    } catch (err) {
      setErrors({ general: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear field error and general error on change
    if (errors[field] || errors.general) {
      setErrors({ ...errors, [field]: undefined, general: undefined });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{formData.email}</strong>.
              Please check your inbox and click the link to activate your account.
            </p>
            <Link
              to="/login"
              className="text-tech hover:text-tech/80 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="Clever Badge" className="w-10 h-10" />
            <span className="text-2xl font-bold text-primary">Clever Badge</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-tech hover:text-tech/80 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange('email')}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />

            <Input
              label="Display Name"
              type="text"
              required
              value={formData.displayName}
              onChange={handleChange('displayName')}
              error={errors.displayName}
              placeholder="Your public name"
              autoComplete="name"
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange('password')}
              error={errors.password}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={loading}
            />

            <Input
              label="Confirm Password"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
