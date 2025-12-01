import React from 'react';
import Navigation from '../components/landing/Navigation';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';

const Home = () => {
  return (
    <div className="scroll-smooth">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </div>
  );
};

export default Home;
