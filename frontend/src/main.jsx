import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Set page title based on environment
const environment = import.meta.env.VITE_ENV || 'development';
if (environment === 'development') {
  document.title = 'Clever Badge (Development)';
} else if (environment === 'staging') {
  document.title = 'Clever Badge (Staging)';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
