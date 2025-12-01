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

// Layout wrapper that handles environment banner padding
function AppLayout({ children }) {
  const environment = import.meta.env.VITE_ENV || 'development';
  const hasBanner = environment !== 'production';

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 ${hasBanner ? 'pt-9' : ''}`}>
      <EnvironmentBanner />
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={
          <>
            <EnvironmentBanner />
            <Home />
            <Footer />
          </>
        } />
        <Route path="/*" element={
          <AppLayout>
            <main className="flex-1">
              <Routes>
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
          </AppLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
