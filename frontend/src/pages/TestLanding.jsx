import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { loadAssessment, clearAssessment } from '../utils/assessmentStorage';
import { verifyAssessment } from '../utils/api';

const TestLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  console.log('[DEBUG] TestLanding mounted, slug:', slug);
  console.log('[DEBUG] API URL:', apiUrl);

  useEffect(() => {
    console.log('[DEBUG] Fetching test from:', `${apiUrl}/api/tests/slug/${slug}`);
    // Fetch test by slug
    fetch(`${apiUrl}/api/tests/slug/${slug}`)
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json();

          // Check for protected test error
          if (res.status === 403 && errorData.code === 'PROTECTED_TEST') {
            setAccessRestricted(true);
            setLoading(false);
            return;
          }

          throw new Error(errorData.error || 'Test not found');
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setTest(data);
          setLoading(false);

          // Check for existing assessment in LocalStorage
          const saved = loadAssessment(slug);
          if (saved) {
            setExistingAssessment(saved);
          }
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug, apiUrl]);

  const handleStart = async (e) => {
    e.preventDefault();

    if (!candidateName.trim()) {
      alert('Please enter your name');
      return;
    }

    // Clear any existing assessment since we're starting fresh
    if (existingAssessment) {
      clearAssessment(slug);
      setExistingAssessment(null);
    }

    try {
      // Start assessment
      const response = await fetch(`${apiUrl}/api/assessments/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: test.id,
          candidate_name: candidateName.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to start assessment');

      const data = await response.json();

      // Navigate to question runner with state
      // Use values from the start response (data.test) as they're guaranteed to be current
      navigate(`/t/${slug}/run`, {
        state: {
          assessmentId: data.assessment_id,
          questions: data.questions,
          candidateName: candidateName.trim(),
          testSlug: slug,
          showExplanations: data.test.show_explanations,
          explanationScope: data.test.explanation_scope
        }
      });
    } catch (err) {
      alert('Failed to start test: ' + err.message);
    }
  };

  const handleResume = async () => {
    try {
      // Verify assessment is still valid (not expired or abandoned)
      await verifyAssessment(existingAssessment.assessmentId);

      // Navigate to question runner with saved state
      navigate(`/t/${slug}/run`, {
        state: {
          assessmentId: existingAssessment.assessmentId,
          questions: existingAssessment.questions,
          candidateName: existingAssessment.candidateName,
          currentQuestionIndex: existingAssessment.currentQuestionIndex,
          answers: existingAssessment.answers,
          testSlug: slug,
          isResuming: true,
          showExplanations: test.show_explanations,
          explanationScope: test.explanation_scope
        }
      });
    } catch (err) {
      // Assessment has expired or is invalid - clear it and show message
      clearAssessment(slug);
      setExistingAssessment(null);

      if (err.code === 'ASSESSMENT_EXPIRED') {
        alert('Your previous assessment has expired (2-hour time limit). Please start a new test.');
      } else if (err.code === 'ASSESSMENT_ABANDONED') {
        alert('Your previous assessment is no longer available. Please start a new test.');
      } else {
        alert('Unable to resume assessment. Please start a new test.');
      }
    }
  };

  const handleStartFresh = () => {
    clearAssessment(slug);
    setExistingAssessment(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading test...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">SUPER ERROR</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-xs text-gray-400 mt-2">API: {apiUrl}</p>
        </div>
      </div>
    );
  }

  if (accessRestricted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Access Restricted
              </h2>
              <p className="text-gray-600 mb-6">
                This test requires authentication to access. Please contact your administrator for access or log in to continue.
              </p>
              <p className="text-sm text-gray-500">
                Protected test access will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {test.title}
        </h1>

        {!test.is_enabled && (
          <p className="text-red-600 font-medium mb-4">This test is disabled</p>
        )}

        {test.description && (
          <div className="text-gray-600 mb-6">
            <MarkdownRenderer content={test.description} />
          </div>
        )}

        <div className="bg-blue-50 border-l-4 border-tech p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Questions:</strong> {test.question_count}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Format:</strong> One question at a time
          </p>
        </div>

        {test.is_enabled && existingAssessment && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-yellow-800 font-medium mb-1">
                  In-Progress Assessment Found
                </p>
                <p className="text-yellow-700 text-sm mb-3">
                  You have an in-progress assessment as "{existingAssessment.candidateName}". Would you like to resume where you left off?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 bg-tech hover:bg-tech/90 text-white font-medium rounded-md text-sm transition-colors"
                  >
                    Resume Assessment
                  </button>
                  <button
                    onClick={handleStartFresh}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-md border border-gray-300 text-sm transition-colors"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {test.is_enabled && (
          <form onSubmit={handleStart}>
            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tech"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-tech hover:bg-tech/90 text-white font-semibold py-3 px-6 rounded-md transition-colors"
            >
              Start Test
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TestLanding;
