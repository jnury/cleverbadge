import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyEmail } from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.message || 'Verification failed');
        if (err.code === 'TOKEN_EXPIRED') {
          setIsExpired(true);
        }
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {status === 'loading' && (
            <>
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-6">
                Your email has been verified successfully. You can now log in to your account.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-tech text-white rounded-md hover:bg-tech/90 transition-colors"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              {isExpired ? (
                <Link
                  to="/forgot-password"
                  state={{ resendVerification: true }}
                  className="inline-block px-6 py-2 bg-tech text-white rounded-md hover:bg-tech/90 transition-colors"
                >
                  Request New Link
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-block px-6 py-2 bg-tech text-white rounded-md hover:bg-tech/90 transition-colors"
                >
                  Go to Login
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
