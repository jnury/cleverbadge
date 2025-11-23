import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Clever Badge
        </h1>
        <p className="text-gray-600 mb-6">
          Online Skills Assessment Platform
        </p>
        <Link
          to="/admin/login"
          className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90 transition-colors"
        >
          Admin Login
        </Link>
      </div>
    </div>
  );
};

export default Home;
