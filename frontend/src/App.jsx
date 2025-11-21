import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TestLanding } from './pages/candidate/TestLanding';
import { QuestionRunner } from './pages/candidate/QuestionRunner';
import { TestResult } from './pages/candidate/TestResult';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Candidate Routes */}
          <Route path="/t/:slug" element={<TestLanding />} />
          <Route path="/t/:slug/run" element={<QuestionRunner />} />
          <Route path="/t/:slug/result" element={<TestResult />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
