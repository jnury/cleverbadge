import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center min-h-full">
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
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
