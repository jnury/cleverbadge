import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 pt-24">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Clever Badge"
          className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-8"
        />

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Create tests. Share links. Get results.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          A simple platform to assess skills with multiple-choice questions.
          Perfect for recruiters, educators, and tech teams.
        </p>

        {/* Primary CTA */}
        <Link
          to="/t/demo"
          className="inline-block px-8 py-3 bg-tech text-white font-medium rounded-lg hover:bg-tech/90 transition-colors text-lg mb-4"
        >
          Try a Sample Test
        </Link>

        {/* Secondary link */}
        <div>
          <a
            href="#features"
            className="text-tech hover:underline text-sm"
          >
            or learn more about features
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 animate-bounce">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
