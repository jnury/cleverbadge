import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TestLanding } from './pages/candidate/TestLanding';
import { QuestionRunner } from './pages/candidate/QuestionRunner';
import { TestResult } from './pages/candidate/TestResult';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LoginPage } from './pages/auth/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Home */}
          <Route path="/" element={<HomePage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Candidate Routes */}
          <Route path="/t/:slug" element={<TestLanding />} />
          <Route path="/t/:slug/run" element={<QuestionRunner />} />
          <Route path="/t/:slug/result" element={<TestResult />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
