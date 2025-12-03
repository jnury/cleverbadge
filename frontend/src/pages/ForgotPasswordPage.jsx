import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { forgotPassword, resendVerification } from '../utils/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const ForgotPasswordPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Check if coming from login page for resend verification
  const isResendVerification = location.state?.resendVerification;
  const [mode, setMode] = useState(isResendVerification ? 'resend' : 'reset');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'resend') {
        await resendVerification(email.trim());
      } else {
        await forgotPassword(email.trim());
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
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
              {mode === 'resend'
                ? `If an unverified account exists for ${email}, we've sent a new verification link.`
                : `If an account exists for ${email}, we've sent a password reset link.`
              }
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
          <h2 className="text-3xl font-bold text-gray-900">
            {mode === 'resend' ? 'Resend Verification' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-gray-600">
            {mode === 'resend'
              ? "Enter your email to receive a new verification link"
              : "Enter your email and we'll send you a reset link"
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Mode toggle */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setMode('reset')}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                mode === 'reset'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reset Password
            </button>
            <button
              type="button"
              onClick={() => setMode('resend')}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                mode === 'resend'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resend Verification
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {mode === 'resend' ? 'Resend Verification Email' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-tech hover:text-tech/80"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
