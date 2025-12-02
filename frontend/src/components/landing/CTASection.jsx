import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from '../../utils/api';
import LoginModal from '../LoginModal';

const CTASection = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <>
      <section className="bg-tech py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-white/90 mb-8">
            Try a sample test to see how it works, or log in to create your own.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/t/demo"
              className="px-6 py-3 bg-white text-tech font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Try Sample Test
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default CTASection;
