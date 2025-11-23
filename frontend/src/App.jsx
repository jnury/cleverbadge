import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary mb-4">
                  Clever Badge
                </h1>
                <p className="text-gray-600">
                  Frontend v{import.meta.env.VITE_VERSION}
                </p>
                <p className="text-gray-600">
                  Environment: {import.meta.env.VITE_ENV}
                </p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
