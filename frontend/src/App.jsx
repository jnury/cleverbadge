import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';

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
                    Online Skills Assessment Platform
                  </p>
                </div>
              </div>
            } />
            <Route path="/t/:slug" element={<TestLanding />} />
            <Route path="/t/:slug/run" element={<QuestionRunner />} />
            <Route path="/t/:slug/result" element={<TestResults />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
