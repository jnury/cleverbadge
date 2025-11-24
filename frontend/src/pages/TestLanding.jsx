import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

const TestLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Fetch test by slug
    fetch(`${apiUrl}/api/tests/slug/${slug}`)
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Test not found');
        }
        return res.json();
      })
      .then(data => {
        setTest(data);
        setLoading(false);
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
      navigate(`/t/${slug}/run`, {
        state: {
          assessmentId: data.assessment_id,
          questions: data.questions,
          candidateName: candidateName.trim()
        }
      });
    } catch (err) {
      alert('Failed to start test: ' + err.message);
    }
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
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
      </div>
    </div>
  );
};

export default TestLanding;
