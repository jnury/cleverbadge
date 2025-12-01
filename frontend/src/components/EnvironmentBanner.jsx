import React from 'react';

const EnvironmentBanner = () => {
  const environment = import.meta.env.VITE_ENV || 'development';

  // Don't show banner in production
  if (environment === 'production') {
    return null;
  }

  // Color based on environment
  const colors = {
    development: 'bg-yellow-400 text-yellow-900',
    testing: 'bg-blue-400 text-blue-900',
    staging: 'bg-purple-400 text-purple-900'
  };

  const bgColor = colors[environment] || colors.development;

  return (
    <div className={`${bgColor} py-2 px-4 text-center text-sm font-semibold fixed top-0 left-0 right-0 z-[60]`}>
      {environment.toUpperCase()} ENVIRONMENT
    </div>
  );
};

export default EnvironmentBanner;
