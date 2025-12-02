import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from '../../utils/api';
import LoginModal from '../LoginModal';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());

  // Check if environment banner should be shown
  const environment = import.meta.env.VITE_ENV || 'development';
  const hasBanner = environment !== 'production';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for storage changes to sync authentication state across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        setIsAuthenticated(isLoggedIn());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <>
      <nav
        className={`fixed left-0 right-0 z-50 transition-all duration-200 ${
          hasBanner ? 'top-9' : 'top-0'
        } ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Clever Badge" className="w-8 h-8" />
              <span className="font-bold text-primary">Clever Badge</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Features
              </a>
              <Link
                to="/t/demo"
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Try Demo
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 bg-white">
              <div className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <Link
                  to="/t/demo"
                  className="text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Try Demo
                </Link>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="px-4 py-2 bg-tech text-white rounded-lg hover:bg-tech/90 transition-colors"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default Navigation;
