import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EnvironmentBanner from './components/EnvironmentBanner';
import Footer from './components/Footer';
import Home from './pages/Home';
import TestLanding from './pages/TestLanding';
import QuestionRunner from './pages/QuestionRunner';
import TestResults from './pages/TestResults';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/dashboard/Dashboard';
import AssessmentDetail from './pages/dashboard/AssessmentDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

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
        <Route path="/login" element={
          <AppLayout>
            <LoginPage />
          </AppLayout>
        } />
        <Route path="/register" element={
          <AppLayout>
            <RegisterPage />
          </AppLayout>
        } />
        <Route path="/verify-email/:token" element={
          <AppLayout>
            <VerifyEmailPage />
          </AppLayout>
        } />
        <Route path="/forgot-password" element={
          <AppLayout>
            <ForgotPasswordPage />
          </AppLayout>
        } />
        <Route path="/reset-password/:token" element={
          <AppLayout>
            <ResetPasswordPage />
          </AppLayout>
        } />
        <Route path="/*" element={
          <AppLayout>
            <main className="flex-1">
              <Routes>
                <Route path="/t/:slug" element={<TestLanding />} />
                <Route path="/t/:slug/run" element={<QuestionRunner />} />
                <Route path="/t/:slug/result" element={<TestResults />} />

                {/* Dashboard routes (formerly admin) */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/assessment/:assessmentId" element={
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
