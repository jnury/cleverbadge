import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from '../components/landing/Navigation';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';
import LoginModal from '../components/LoginModal';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Check if redirected from protected route
  useEffect(() => {
    if (location.state?.openLoginModal) {
      setIsLoginModalOpen(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    // Redirect to original destination or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from);
  };

  return (
    <div className="scroll-smooth">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CTASection />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Home;
