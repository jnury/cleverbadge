import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import Home from './pages/Home';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';
import AdminLogin from './pages/admin/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AssessmentDetail from './pages/admin/AssessmentDetail';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/t/:slug" element={<TestLanding />} />
            <Route path="/t/:slug/run" element={<QuestionRunner />} />
            <Route path="/t/:slug/result" element={<TestResults />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/assessment/:assessmentId" element={
              <ProtectedRoute>
                <AssessmentDetail />
              </ProtectedRoute>
            } />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
