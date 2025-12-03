import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginWithEmail, login, isLoggedIn } from '../utils/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

  // Get redirect destination from location state
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowResendLink(false);
    setLoading(true);

    try {
      // Detect if identifier is email or username
      const isEmail = identifier.includes('@');

      if (isEmail) {
        await loginWithEmail(identifier.trim(), password);
      } else {
        // Legacy username login
        await login(identifier.trim(), password);
      }

      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);

      // Show resend link if email not verified
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setShowResendLink(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="Clever Badge" className="w-10 h-10" />
            <span className="text-2xl font-bold text-primary">Clever Badge</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-tech hover:text-tech/80 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
                {showResendLink && (
                  <div className="mt-2">
                    <Link
                      to="/forgot-password"
                      state={{ resendVerification: true, email: identifier }}
                      className="text-red-800 underline hover:text-red-900"
                    >
                      Resend verification email
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Email or Username"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />

            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
              <div className="mt-1 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-tech hover:text-tech/80"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
