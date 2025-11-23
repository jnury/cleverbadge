import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [backendVersion, setBackendVersion] = useState('...');
  const [backendEnv, setBackendEnv] = useState('...');
  const frontendVersion = import.meta.env.VITE_VERSION;
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Fetch backend version from health endpoint
    fetch(`${apiUrl}/health`)
      .then(res => res.json())
      .then(data => {
        setBackendVersion(data.version || 'unknown');
        setBackendEnv(data.environment || 'unknown');
      })
      .catch(err => {
        console.error('Failed to fetch backend version:', err);
        setBackendVersion('error');
        setBackendEnv('error');
      });
  }, [apiUrl]);

  return (
    <footer className="bg-gray-800 text-gray-300 py-4 px-6 text-center text-sm">
      <p>
        Copyright Clever Badge 2025 - Frontend: v{frontendVersion} - Backend: v{backendVersion} ({backendEnv})
      </p>
    </footer>
  );
};

export default Footer;
