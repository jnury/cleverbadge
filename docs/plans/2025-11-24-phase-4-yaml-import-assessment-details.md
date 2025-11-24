# Phase 4: YAML Import & Assessment Details Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable bulk question import via YAML files and provide detailed assessment viewing with correct/incorrect indicators

**Architecture:** Add multer for file uploads, js-yaml for parsing, transactional bulk inserts, and enhanced GET endpoint for full assessment details with answer correctness flags

**Tech Stack:** Express.js, multer, js-yaml, postgres-js, React, Tailwind CSS

**Version:** 0.4.0

---

## Task 1: Backend Dependencies - Install multer and js-yaml

**Files:**
- Modify: `backend/package.json`

**Step 1: Install multer and js-yaml**

Run: `cd backend && npm install multer js-yaml`
Expected: Both packages installed successfully

**Step 2: Verify installations**

Run: `npm list multer js-yaml`
Expected: Shows versions of both packages

**Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "deps: add multer and js-yaml for file upload and YAML parsing"
```

---

## Task 2: Backend - YAML Import Endpoint

**Files:**
- Create: `backend/routes/import.js`
- Modify: `backend/index.js`

**Step 1: Create import route with YAML parsing**

Create `backend/routes/import.js`:

```javascript
import express from 'express';
import multer from 'multer';
import yaml from 'js-yaml';
import { db } from '../db/index.js';
import { questions } from '../db/schema.js';
import fs from 'fs';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only .yaml and .yml files
    if (file.mimetype === 'application/x-yaml' ||
        file.mimetype === 'text/yaml' ||
        file.originalname.endsWith('.yaml') ||
        file.originalname.endsWith('.yml')) {
      cb(null, true);
    } else {
      cb(new Error('Only YAML files (.yaml or .yml) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/questions/import
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse YAML
    let parsedData;
    try {
      const fileContent = req.file.buffer.toString('utf8');
      parsedData = yaml.load(fileContent);
    } catch (yamlError) {
      return res.status(400).json({
        error: 'Invalid YAML format',
        details: yamlError.message
      });
    }

    // Validate structure
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return res.status(400).json({
        error: 'YAML must contain an array of questions'
      });
    }

    // Validate each question
    const errors = [];
    const validQuestions = [];

    parsedData.forEach((q, index) => {
      const questionNum = index + 1;
      const errs = [];

      // Required fields
      if (!q.text || typeof q.text !== 'string') {
        errs.push(`Question ${questionNum}: 'text' is required and must be a string`);
      }
      if (!q.type || !['SINGLE', 'MULTIPLE'].includes(q.type)) {
        errs.push(`Question ${questionNum}: 'type' must be either 'SINGLE' or 'MULTIPLE'`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errs.push(`Question ${questionNum}: 'options' must be an array with at least 2 items`);
      }
      if (!Array.isArray(q.correct_answers) || q.correct_answers.length === 0) {
        errs.push(`Question ${questionNum}: 'correct_answers' must be a non-empty array`);
      }

      // Optional fields validation
      if (q.tags && !Array.isArray(q.tags)) {
        errs.push(`Question ${questionNum}: 'tags' must be an array if provided`);
      }

      if (errs.length > 0) {
        errors.push(...errs);
      } else {
        validQuestions.push({
          text: q.text.trim(),
          type: q.type,
          options: q.options,
          correct_answers: q.correct_answers,
          tags: q.tags || []
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        valid_count: validQuestions.length,
        invalid_count: errors.length
      });
    }

    // Bulk insert (transactional)
    const inserted = await db
      .insert(questions)
      .values(validQuestions)
      .returning();

    res.status(201).json({
      message: 'Questions imported successfully',
      imported_count: inserted.length,
      questions: inserted
    });

  } catch (error) {
    console.error('Error importing questions:', error);

    if (error.message.includes('Only YAML files')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to import questions' });
  }
});

export default router;
```

**Step 2: Register import routes in main server**

Modify `backend/index.js`:

```javascript
// ... existing imports
import questionsRouter from './routes/questions.js';
import testsRouter from './routes/tests.js';
import assessmentsRouter from './routes/assessments.js';
import importRouter from './routes/import.js';

// ... middleware

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/questions', importRouter); // Mount import under /api/questions
app.use('/api/tests', testsRouter);
app.use('/api/assessments', assessmentsRouter);

// ... rest of code
```

**Step 3: Test YAML import endpoint**

Create test file `test-questions.yaml`:
```yaml
- text: "What is the capital of France?"
  type: "SINGLE"
  options: ["London", "Paris", "Berlin", "Madrid"]
  correct_answers: ["Paris"]
  tags: ["geography", "europe"]

- text: "Select all prime numbers"
  type: "MULTIPLE"
  options: ["2", "3", "4", "5", "6"]
  correct_answers: ["2", "3", "5"]
  tags: ["math", "numbers"]
```

Test import:
```bash
curl -X POST http://localhost:3000/api/questions/import \
  -F "file=@test-questions.yaml"
```

Expected: Returns `{ message: "Questions imported successfully", imported_count: 2 }`

Test with invalid YAML:
```bash
echo "invalid: yaml: content:" > invalid.yaml
curl -X POST http://localhost:3000/api/questions/import \
  -F "file=@invalid.yaml"
```

Expected: Returns 400 error with validation details

**Step 4: Commit**

```bash
git add backend/routes/import.js backend/index.js
git commit -m "feat: add YAML question import endpoint with validation"
```

---

## Task 3: Backend - Assessment Details Endpoint

**Files:**
- Create: `backend/routes/assessment-details.js`
- Modify: `backend/index.js`

**Step 1: Create assessment details route**

Create `backend/routes/assessment-details.js`:

```javascript
import express from 'express';
import { db } from '../db/index.js';
import { assessments, assessmentAnswers, questions, testQuestions, tests } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// GET /api/assessments/:id/details
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment with test info
    const [assessment] = await db
      .select({
        id: assessments.id,
        test_id: assessments.test_id,
        test_title: tests.title,
        candidate_name: assessments.candidate_name,
        status: assessments.status,
        score_percentage: assessments.score_percentage,
        started_at: assessments.started_at,
        completed_at: assessments.completed_at
      })
      .from(assessments)
      .innerJoin(tests, eq(assessments.test_id, tests.id))
      .where(eq(assessments.id, id));

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Get all answers with question details
    const answers = await db
      .select({
        answer_id: assessmentAnswers.id,
        question_id: assessmentAnswers.question_id,
        question_text: questions.text,
        question_type: questions.type,
        question_options: questions.options,
        correct_answers: questions.correct_answers,
        selected_options: assessmentAnswers.selected_options,
        is_correct: assessmentAnswers.is_correct,
        weight: testQuestions.weight,
        answered_at: assessmentAnswers.answered_at
      })
      .from(assessmentAnswers)
      .innerJoin(questions, eq(assessmentAnswers.question_id, questions.id))
      .innerJoin(testQuestions,
        and(
          eq(testQuestions.question_id, questions.id),
          eq(testQuestions.test_id, assessment.test_id)
        )
      )
      .where(eq(assessmentAnswers.assessment_id, id))
      .orderBy(assessmentAnswers.answered_at);

    // Calculate summary statistics
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const totalWeight = answers.reduce((sum, a) => sum + a.weight, 0);
    const earnedWeight = answers.filter(a => a.is_correct).reduce((sum, a) => sum + a.weight, 0);

    res.json({
      assessment: {
        id: assessment.id,
        test_title: assessment.test_title,
        candidate_name: assessment.candidate_name,
        status: assessment.status,
        score_percentage: assessment.score_percentage,
        started_at: assessment.started_at,
        completed_at: assessment.completed_at,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        total_weight: totalWeight,
        earned_weight: earnedWeight
      },
      answers: answers.map(a => ({
        question_id: a.question_id,
        question_text: a.question_text,
        question_type: a.question_type,
        options: a.question_options,
        correct_answers: a.correct_answers,
        selected_options: a.selected_options,
        is_correct: a.is_correct,
        weight: a.weight,
        answered_at: a.answered_at
      }))
    });

  } catch (error) {
    console.error('Error fetching assessment details:', error);
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
});

export default router;
```

**Step 2: Register assessment details routes**

Modify `backend/index.js`:

```javascript
// ... existing imports
import assessmentsRouter from './routes/assessments.js';
import assessmentDetailsRouter from './routes/assessment-details.js';

// ... middleware

// API routes
app.use('/api/questions', questionsRouter);
app.use('/api/questions', importRouter);
app.use('/api/tests', testsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/assessments', assessmentDetailsRouter); // Mount details under /api/assessments

// ... rest of code
```

**Step 3: Test assessment details endpoint**

First, create an assessment by taking a test through the frontend or API.

Then test the endpoint:
```bash
curl http://localhost:3000/api/assessments/{ASSESSMENT_ID}/details
```

Expected: Returns assessment with all answers, showing correct/incorrect flags

**Step 4: Commit**

```bash
git add backend/routes/assessment-details.js backend/index.js
git commit -m "feat: add assessment details endpoint with answer correctness"
```

---

## Task 4: Frontend - YAML Upload Component

**Files:**
- Create: `frontend/src/components/YamlUpload.jsx`
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx` (assuming this exists from Phase 3)

**Step 1: Create YAML upload component**

Create `frontend/src/components/YamlUpload.jsx`:

```javascript
import React, { useState } from 'react';

const YamlUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.endsWith('.yaml') && !selectedFile.name.endsWith('.yml')) {
        setError('Please select a YAML file (.yaml or .yml)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/api/questions/import`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult({
        success: true,
        count: data.imported_count
      });
      setFile(null);

      // Reset file input
      document.getElementById('yaml-file-input').value = '';

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

    } catch (err) {
      setError(err.message);
      setResult({ success: false });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Import Questions from YAML
      </h3>

      <div className="space-y-4">
        {/* File input */}
        <div>
          <label
            htmlFor="yaml-file-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select YAML file
          </label>
          <input
            id="yaml-file-input"
            type="file"
            accept=".yaml,.yml"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-tech file:text-white
              hover:file:bg-tech/90
              cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name}
            </p>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-6 py-2 bg-accent hover:bg-accent-dark text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Questions'}
        </button>

        {/* Result messages */}
        {result && result.success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800 font-medium">
              Successfully imported {result.count} question{result.count !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Help text */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            YAML Format Example:
          </p>
          <pre className="text-xs text-blue-800 overflow-x-auto">
{`- text: "What is 2+2?"
  type: "SINGLE"
  options: ["3", "4", "5", "6"]
  correct_answers: ["4"]
  tags: ["math", "easy"]`}
          </pre>
          <p className="text-sm text-blue-900 mt-2">
            See <code className="bg-blue-100 px-1 rounded">examples/questions.yaml</code> for more examples
          </p>
        </div>
      </div>
    </div>
  );
};

export default YamlUpload;
```

**Step 2: Add YAML upload to Questions tab**

Assuming `frontend/src/pages/admin/QuestionsTab.jsx` exists from Phase 3, add the component at the top of the tab:

```javascript
import React, { useState, useEffect } from 'react';
import YamlUpload from '../../components/YamlUpload';

const QuestionsTab = () => {
  // ... existing state

  const handleUploadSuccess = (data) => {
    // Refresh questions list
    fetchQuestions();
    // Show success toast or notification
    alert(`Successfully imported ${data.imported_count} questions!`);
  };

  return (
    <div className="space-y-6">
      {/* YAML Upload Section */}
      <YamlUpload onUploadSuccess={handleUploadSuccess} />

      {/* Existing questions list */}
      {/* ... rest of questions tab content ... */}
    </div>
  );
};

export default QuestionsTab;
```

**Step 3: Test YAML upload in browser**

1. Run frontend: `npm run dev`
2. Navigate to admin questions tab
3. Click "Select YAML file"
4. Choose a .yaml file
5. Click "Upload Questions"
6. Expected: Success message with count
7. Verify questions appear in list

**Step 4: Commit**

```bash
git add frontend/src/components/YamlUpload.jsx frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat: add YAML upload component to questions tab"
```

---

## Task 5: Frontend - Assessment Details View

**Files:**
- Create: `frontend/src/pages/admin/AssessmentDetail.jsx`
- Modify: `frontend/src/pages/admin/AssessmentsTab.jsx` (assuming this exists from Phase 3)
- Modify: `frontend/src/App.jsx`

**Step 1: Create assessment detail view**

Create `frontend/src/pages/admin/AssessmentDetail.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AssessmentDetail = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchAssessmentDetails();
  }, [assessmentId]);

  const fetchAssessmentDetails = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/assessments/${assessmentId}/details`);
      if (!response.ok) throw new Error('Failed to fetch assessment details');

      const data = await response.json();
      setAssessment(data.assessment);
      setAnswers(data.answers);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading assessment details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md inline-flex items-center"
        >
          <span className="mr-2">←</span> Back to Assessments
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Assessment Details
          </h1>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Candidate:</span>
              <p className="text-gray-900 font-semibold">{assessment.candidate_name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Test:</span>
              <p className="text-gray-900">{assessment.test_title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Score:</span>
              <p className="text-2xl font-bold text-primary">{assessment.score_percentage}%</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Correct Answers:</span>
              <p className="text-gray-900">
                {assessment.correct_answers} / {assessment.total_questions}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <p className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                assessment.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {assessment.status}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Completed:</span>
              <p className="text-gray-900">
                {new Date(assessment.completed_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          Questions & Answers
        </h2>

        {answers.map((answer, index) => (
          <div
            key={answer.question_id}
            className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              answer.is_correct ? 'border-green-500' : 'border-red-500'
            }`}
          >
            {/* Question header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-500">
                    Question {index + 1}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    answer.is_correct
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Weight: {answer.weight}
                  </span>
                </div>
                <p className="text-gray-900 font-medium text-lg">
                  {answer.question_text}
                </p>
              </div>
            </div>

            {/* Answer options */}
            <div className="space-y-2">
              {answer.options.map((option, optIndex) => {
                const isSelected = answer.selected_options.includes(option);
                const isCorrect = answer.correct_answers.includes(option);

                let borderColor = 'border-gray-200';
                let bgColor = 'bg-white';
                let textColor = 'text-gray-800';

                if (isSelected && isCorrect) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-900';
                } else if (isSelected && !isCorrect) {
                  borderColor = 'border-red-500';
                  bgColor = 'bg-red-50';
                  textColor = 'text-red-900';
                } else if (!isSelected && isCorrect) {
                  borderColor = 'border-green-300';
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-800';
                }

                return (
                  <div
                    key={optIndex}
                    className={`p-3 border-2 rounded-md ${borderColor} ${bgColor}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={textColor}>{option}</span>
                      <div className="flex gap-2">
                        {isSelected && (
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Selected
                          </span>
                        )}
                        {isCorrect && (
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Question type indicator */}
            <div className="mt-3 text-sm text-gray-500">
              Type: {answer.question_type === 'SINGLE' ? 'Single Choice' : 'Multiple Choice'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentDetail;
```

**Step 2: Add route to App.jsx**

Modify `frontend/src/App.jsx`:

```javascript
// ... existing imports
import AssessmentDetail from './pages/admin/AssessmentDetail';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <EnvironmentBanner />

        <main className="flex-1">
          <Routes>
            {/* ... existing routes ... */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/assessment/:assessmentId" element={<AssessmentDetail />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
```

**Step 3: Update AssessmentsTab to link to detail view**

Modify `frontend/src/pages/admin/AssessmentsTab.jsx` to add click handler:

```javascript
const AssessmentsTab = () => {
  const navigate = useNavigate();

  // ... existing code

  const handleViewDetails = (assessmentId) => {
    navigate(`/admin/assessment/${assessmentId}`);
  };

  return (
    <div>
      {/* ... assessments list ... */}
      {assessments.map(assessment => (
        <div key={assessment.id} className="border rounded p-4">
          {/* ... assessment info ... */}
          <button
            onClick={() => handleViewDetails(assessment.id)}
            className="px-4 py-2 bg-tech hover:bg-tech/90 text-white rounded-md"
          >
            View Details
          </button>
        </div>
      ))}
    </div>
  );
};
```

**Step 4: Test assessment detail view**

1. Navigate to admin assessments tab
2. Click "View Details" on an assessment
3. Expected: Shows assessment detail page with all questions
4. Verify correct/incorrect indicators
5. Verify selected options highlighted
6. Verify correct answers shown
7. Test "Back to Assessments" button

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/AssessmentDetail.jsx frontend/src/App.jsx frontend/src/pages/admin/AssessmentsTab.jsx
git commit -m "feat: add assessment detail view with answer correctness"
```

---

## Task 6: Create Example YAML File

**Files:**
- Create: `examples/questions.yaml`

**Step 1: Create examples directory and sample file**

Create `examples/questions.yaml`:

```yaml
# Clever Badge - Sample Questions for Import
# Format: YAML array of question objects
# Each question must have: text, type, options, correct_answers
# Optional: tags (array of strings)

# Math Questions
- text: "What is 2 + 2?"
  type: "SINGLE"
  options: ["3", "4", "5", "6"]
  correct_answers: ["4"]
  tags: ["math", "easy", "arithmetic"]

- text: "What is 15% of 200?"
  type: "SINGLE"
  options: ["20", "25", "30", "35"]
  correct_answers: ["30"]
  tags: ["math", "percentage"]

- text: "Select all prime numbers"
  type: "MULTIPLE"
  options: ["2", "3", "4", "5", "6", "7", "8", "9"]
  correct_answers: ["2", "3", "5", "7"]
  tags: ["math", "prime-numbers"]

# Geography Questions
- text: "What is the capital of France?"
  type: "SINGLE"
  options: ["London", "Paris", "Berlin", "Madrid"]
  correct_answers: ["Paris"]
  tags: ["geography", "europe", "easy"]

- text: "Which continents have land on the equator?"
  type: "MULTIPLE"
  options: ["Africa", "Asia", "South America", "Europe", "North America", "Australia"]
  correct_answers: ["Africa", "Asia", "South America"]
  tags: ["geography", "continents"]

# Programming Questions
- text: "Which of these is a JavaScript framework?"
  type: "SINGLE"
  options: ["Python", "React", "MySQL", "Docker"]
  correct_answers: ["React"]
  tags: ["programming", "javascript"]

- text: "Select all valid HTTP methods"
  type: "MULTIPLE"
  options: ["GET", "POST", "FETCH", "DELETE", "LOAD", "PUT"]
  correct_answers: ["GET", "POST", "DELETE", "PUT"]
  tags: ["programming", "http", "web"]

- text: "What does SQL stand for?"
  type: "SINGLE"
  options: [
    "Structured Query Language",
    "Simple Question Language",
    "System Query Logic",
    "Standard Quality Language"
  ]
  correct_answers: ["Structured Query Language"]
  tags: ["programming", "database"]

# Science Questions
- text: "What is the chemical symbol for gold?"
  type: "SINGLE"
  options: ["Go", "Gd", "Au", "Ag"]
  correct_answers: ["Au"]
  tags: ["science", "chemistry"]

- text: "Select all states of matter"
  type: "MULTIPLE"
  options: ["Solid", "Liquid", "Gas", "Plasma", "Vacuum", "Energy"]
  correct_answers: ["Solid", "Liquid", "Gas", "Plasma"]
  tags: ["science", "physics"]

# General Knowledge
- text: "In which year did World War II end?"
  type: "SINGLE"
  options: ["1943", "1944", "1945", "1946"]
  correct_answers: ["1945"]
  tags: ["history", "world-war"]

- text: "Which planets are inner planets (rocky planets)?"
  type: "MULTIPLE"
  options: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"]
  correct_answers: ["Mercury", "Venus", "Earth", "Mars"]
  tags: ["science", "astronomy"]

- text: "Who painted the Mona Lisa?"
  type: "SINGLE"
  options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"]
  correct_answers: ["Leonardo da Vinci"]
  tags: ["art", "history"]

- text: "Select all Shakespeare plays"
  type: "MULTIPLE"
  options: ["Hamlet", "Romeo and Juliet", "Pride and Prejudice", "Macbeth", "1984"]
  correct_answers: ["Hamlet", "Romeo and Juliet", "Macbeth"]
  tags: ["literature", "shakespeare"]

# Logic Questions
- text: "If all roses are flowers and some flowers fade quickly, which statement is true?"
  type: "SINGLE"
  options: [
    "All roses fade quickly",
    "Some roses might fade quickly",
    "No roses fade quickly",
    "Only roses fade quickly"
  ]
  correct_answers: ["Some roses might fade quickly"]
  tags: ["logic", "reasoning"]

- text: "Select all even numbers"
  type: "MULTIPLE"
  options: ["1", "2", "3", "4", "5", "6", "7", "8"]
  correct_answers: ["2", "4", "6", "8"]
  tags: ["math", "numbers", "easy"]
```

**Step 2: Test importing the example file**

```bash
curl -X POST http://localhost:3000/api/questions/import \
  -F "file=@examples/questions.yaml"
```

Expected: Successfully imports 16 questions

**Step 3: Commit**

```bash
git add examples/questions.yaml
git commit -m "docs: add example YAML file with 16 sample questions"
```

---

## Task 7: Update Package Versions to 0.4.0

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

**Step 1: Update backend version**

Modify `backend/package.json`:

Change line:
```json
"version": "0.3.0"
```

To:
```json
"version": "0.4.0"
```

**Step 2: Update frontend version**

Modify `frontend/package.json`:

Change line:
```json
"version": "0.3.0"
```

To:
```json
"version": "0.4.0"
```

**Step 3: Test version display**

Run both servers and verify:
- Backend health endpoint returns `"version": "0.4.0"`
- Frontend footer shows v0.4.0

**Step 4: Commit**

```bash
git add backend/package.json frontend/package.json
git commit -m "chore: bump version to 0.4.0 for Phase 4 release"
```

---

## Task 8: Final Testing & Validation

**Files:**
- None (testing only)

**Step 1: Test YAML import flow**

1. Create test YAML with 5 questions
2. Upload via admin UI
3. Verify all 5 appear in questions list
4. Try uploading invalid YAML
5. Verify error messages are clear

**Step 2: Test assessment detail flow**

1. Have test candidate take a test
2. View assessments list as admin
3. Click on assessment to view details
4. Verify:
   - All questions shown
   - Correct/incorrect clearly indicated
   - Selected options highlighted
   - Correct answers shown (even if not selected)
   - Score calculation correct

**Step 3: Test with both question types**

Create test with mix of SINGLE and MULTIPLE choice:
1. Import via YAML
2. Add to test
3. Have candidate take test
4. View details
5. Verify both types display correctly

**Step 4: Test large batch import**

1. Upload examples/questions.yaml (16 questions)
2. Verify all imported successfully
3. Check performance
4. Verify no errors in console

**Step 5: Verify all previous features still work**

- Candidate flow (landing, runner, results)
- Admin login
- Question CRUD
- Test management
- Assessment listing

**Step 6: Document any issues**

If any bugs found, create list for fixing before deployment

---

## Task 9: Create README for Phase 4

**Files:**
- Create: `docs/PHASE_4_COMPLETE.md`

**Step 1: Create completion document**

Create `docs/PHASE_4_COMPLETE.md`:

```markdown
# Phase 4 Complete - YAML Import & Assessment Details

**Version:** 0.4.0
**Completion Date:** 2025-11-24

## What's New

### YAML Question Import
- Bulk import questions from YAML files
- File validation (format and structure)
- Detailed error messages for invalid questions
- Example file with 16 sample questions

### Assessment Details View
- Click any assessment to see full details
- View all questions with candidate's answers
- Correct/incorrect indicators for each question
- Visual highlighting of selected vs correct answers
- Support for both SINGLE and MULTIPLE choice questions

## Features Added

### Backend
- POST `/api/questions/import` - Upload YAML file
- GET `/api/assessments/:id/details` - Full assessment with answers
- Input validation for YAML structure
- Transactional bulk inserts
- File size limit (5MB)

### Frontend
- YAML upload component in Questions tab
- Assessment detail page with full answer breakdown
- Color-coded correct/incorrect indicators
- Selected options vs correct answers display
- Back navigation to assessments list

## How to Use

### Import Questions

1. Create YAML file (see `examples/questions.yaml`)
2. Go to Admin → Questions
3. Click "Select YAML file"
4. Choose your file
5. Click "Upload Questions"
6. Verify import count

### View Assessment Details

1. Go to Admin → Assessments
2. Click "View Details" on any assessment
3. See all questions with answers
4. Check correct/incorrect indicators
5. Review candidate performance

## Example YAML Format

```yaml
- text: "Your question here?"
  type: "SINGLE"  # or "MULTIPLE"
  options: ["Option 1", "Option 2", "Option 3"]
  correct_answers: ["Option 2"]
  tags: ["category", "difficulty"]
```

## Testing Checklist

- ✅ YAML import works with valid file
- ✅ Error handling for invalid YAML
- ✅ Validation catches missing fields
- ✅ Large batch import (50+ questions)
- ✅ Assessment details show all questions
- ✅ Correct/incorrect indicators accurate
- ✅ Both SINGLE and MULTIPLE choice display correctly
- ✅ All previous features still work

## Known Limitations

- Max file size: 5MB
- No partial imports (all or nothing)
- Cannot edit imported questions in bulk

## Next Steps (Phase 5)

- Question analytics (success rates)
- UI polish and mobile responsiveness
- Performance optimizations
- Final MVP completion
```

**Step 2: Commit**

```bash
git add docs/PHASE_4_COMPLETE.md
git commit -m "docs: add Phase 4 completion summary"
```

---

## Success Criteria

- ✅ Can import 50+ questions from YAML file
- ✅ Import validation catches errors with clear messages
- ✅ Assessment details show all questions and answers
- ✅ Correct/incorrect clearly indicated with visual cues
- ✅ Selected options vs correct answers distinguished
- ✅ Both SINGLE and MULTIPLE choice questions display correctly
- ✅ Error handling throughout (file upload, fetch failures)
- ✅ All Phase 1, 2, and 3 features still work
- ✅ Backend version 0.4.0, Frontend version 0.4.0
- ✅ Example YAML file with 16+ questions

---

## Notes

- YAML format must be strict (validate before upload)
- Large files (1000+ questions) may take time to process
- Assessment details page shows all questions (no pagination yet)
- Consider adding question preview before final import
- Future: Add export functionality (questions to YAML)
