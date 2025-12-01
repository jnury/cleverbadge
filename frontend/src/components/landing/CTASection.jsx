import React from 'react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
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
          <Link
            to="/admin/login"
            className="px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
