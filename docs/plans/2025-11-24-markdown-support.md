# Markdown Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add markdown rendering with syntax highlighting to questions, answer options, and test descriptions

**Architecture:** Client-side markdown rendering using react-markdown + react-syntax-highlighter with Prism. Backend validates markdown syntax during YAML import. Store raw markdown in database (no HTML caching). Custom dark theme matching brand colors.

**Tech Stack:** react-markdown, react-syntax-highlighter, prismjs, marked (backend validation)

---

## Task 1: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install markdown rendering libraries**

Run from frontend directory:
```bash
cd frontend
npm install react-markdown@9.0.1 react-syntax-highlighter@15.5.0 remark-gfm@4.0.0
```

Expected: Dependencies added to package.json and node_modules installed

**Step 2: Verify installation**

Run:
```bash
npm list react-markdown react-syntax-highlighter remark-gfm
```

Expected: Shows installed versions without errors

**Step 3: Commit dependency changes**

```bash
git add package.json package-lock.json
git commit -m "feat: add markdown rendering dependencies

- react-markdown for markdown parsing
- react-syntax-highlighter for code highlighting
- remark-gfm for GitHub Flavored Markdown (tables, etc.)
"
```

---

## Task 2: Create MarkdownRenderer Component

**Files:**
- Create: `frontend/src/components/MarkdownRenderer.jsx`
- Create: `frontend/tests/components/MarkdownRenderer.test.jsx`

**Step 1: Write the failing test**

Create `frontend/tests/components/MarkdownRenderer.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from '../../src/components/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownRenderer content="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<MarkdownRenderer content="**bold text**" />);
    const element = screen.getByText('bold text');
    expect(element.tagName).toBe('STRONG');
  });

  it('renders italic text', () => {
    render(<MarkdownRenderer content="*italic text*" />);
    const element = screen.getByText('italic text');
    expect(element.tagName).toBe('EM');
  });

  it('renders inline code', () => {
    render(<MarkdownRenderer content="`const x = 1`" />);
    const element = screen.getByText('const x = 1');
    expect(element.tagName).toBe('CODE');
  });

  it('renders code blocks', () => {
    const code = '```javascript\nconst sum = (a, b) => a + b;\n```';
    render(<MarkdownRenderer content={code} />);
    expect(screen.getByText(/const sum/)).toBeInTheDocument();
  });

  it('disallows raw HTML for security', () => {
    render(<MarkdownRenderer content="<script>alert('xss')</script>" />);
    expect(screen.queryByText("alert('xss')")).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownRenderer content="test" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

**Step 2: Run test to verify it fails**

Run from frontend directory:
```bash
npm test MarkdownRenderer.test.jsx
```

Expected: FAIL - "Cannot find module '../../src/components/MarkdownRenderer'"

**Step 3: Write minimal implementation**

Create `frontend/src/components/MarkdownRenderer.jsx`:

```javascript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRenderer - Renders markdown content with syntax highlighting
 *
 * @param {string} content - Raw markdown content to render
 * @param {string} className - Optional CSS classes to apply to container
 */
const MarkdownRenderer = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && language ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                  backgroundColor: '#1D4E5A',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`${className} bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
        disallowedElements={['script', 'iframe', 'object', 'embed']}
        unwrapDisallowed={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test MarkdownRenderer.test.jsx
```

Expected: PASS - All tests green

**Step 5: Commit**

```bash
git add frontend/src/components/MarkdownRenderer.jsx frontend/tests/components/MarkdownRenderer.test.jsx
git commit -m "feat: add MarkdownRenderer component with syntax highlighting

- Supports code blocks, inline code, bold, italic, tables
- Custom dark theme with brand Deep Teal background
- Disallows dangerous HTML elements for security
- Tested with vitest
"
```

---

## Task 3: Create Custom Syntax Theme

**Files:**
- Create: `frontend/src/styles/syntax-theme.js`
- Modify: `frontend/src/components/MarkdownRenderer.jsx`

**Step 1: Define custom Prism theme**

Create `frontend/src/styles/syntax-theme.js`:

```javascript
/**
 * Custom Prism syntax highlighting theme
 * Based on Clever Badge brand colors
 */
export const cleverBadgeTheme = {
  'code[class*="language-"]': {
    color: '#E5E7EB', // Light gray for general text
    background: '#1D4E5A', // Deep Teal
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
  },
  'pre[class*="language-"]': {
    color: '#E5E7EB',
    background: '#1D4E5A',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    padding: '1rem',
    margin: '0.5rem 0',
    overflow: 'auto',
    borderRadius: '0.5rem',
  },
  'comment': {
    color: '#2A6373', // Circuit Blue
    fontStyle: 'italic',
  },
  'prolog': {
    color: '#2A6373',
  },
  'doctype': {
    color: '#2A6373',
  },
  'cdata': {
    color: '#2A6373',
  },
  'punctuation': {
    color: '#D1D5DB', // Gray
  },
  'property': {
    color: '#4DA6C0', // Tech Blue
  },
  'tag': {
    color: '#4DA6C0',
  },
  'boolean': {
    color: '#D98C63', // Light Copper
  },
  'number': {
    color: '#D98C63',
  },
  'constant': {
    color: '#D98C63',
  },
  'symbol': {
    color: '#D98C63',
  },
  'deleted': {
    color: '#EF4444', // Red
  },
  'selector': {
    color: '#B55C34', // Copper
  },
  'attr-name': {
    color: '#B55C34',
  },
  'string': {
    color: '#D98C63', // Light Copper
  },
  'char': {
    color: '#D98C63',
  },
  'builtin': {
    color: '#4DA6C0', // Tech Blue
  },
  'inserted': {
    color: '#10B981', // Green
  },
  'operator': {
    color: '#D1D5DB', // Gray
  },
  'entity': {
    color: '#D98C63',
    cursor: 'help',
  },
  'url': {
    color: '#4DA6C0',
  },
  'atrule': {
    color: '#D98C63',
  },
  'attr-value': {
    color: '#D98C63',
  },
  'keyword': {
    color: '#4DA6C0', // Tech Blue
  },
  'function': {
    color: '#B55C34', // Copper
  },
  'class-name': {
    color: '#B55C34',
  },
  'regex': {
    color: '#D98C63',
  },
  'important': {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  'variable': {
    color: '#E5E7EB',
  },
};
```

**Step 2: Update MarkdownRenderer to use custom theme**

Modify `frontend/src/components/MarkdownRenderer.jsx`:

```javascript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cleverBadgeTheme } from '../styles/syntax-theme';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && language ? (
              <SyntaxHighlighter
                style={cleverBadgeTheme}
                language={language}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`${className} bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Style tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-300">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-100">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left border-b border-gray-300 font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 border-b border-gray-200">{children}</td>
            );
          },
          // Style headings
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },
          // Style lists
          ul({ children }) {
            return <ul className="list-disc list-inside my-3 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-3 space-y-1">{children}</ol>;
          },
          // Style paragraphs
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },
          // Style links
          a({ children, href }) {
            return (
              <a
                href={href}
                className="text-tech hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
        disallowedElements={['script', 'iframe', 'object', 'embed']}
        unwrapDisallowed={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
```

**Step 3: Test manually**

Run dev server:
```bash
npm run dev
```

Visit browser console and test:
```javascript
import MarkdownRenderer from './components/MarkdownRenderer';
// Visual inspection of colors
```

Expected: Code blocks use brand colors (Deep Teal background, Tech Blue keywords, Copper functions)

**Step 4: Commit**

```bash
git add frontend/src/styles/syntax-theme.js frontend/src/components/MarkdownRenderer.jsx
git commit -m "feat: add custom syntax highlighting theme with brand colors

- Deep Teal (#1D4E5A) background for code blocks
- Tech Blue (#4DA6C0) for keywords and properties
- Copper (#B55C34) for functions and selectors
- Circuit Blue (#2A6373) for comments
- Styled tables, headings, lists, links with Tailwind
"
```

---

## Task 4: Integrate MarkdownRenderer in QuestionRunner

**Files:**
- Modify: `frontend/src/pages/QuestionRunner.jsx`
- Create: `frontend/tests/e2e/markdown-rendering.spec.js`

**Step 1: Write the failing E2E test**

Create `frontend/tests/e2e/markdown-rendering.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering in Questions', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes test data with markdown questions exists
    // This will be seeded in a later task
    await page.goto('/t/markdown-test');
    await page.fill('input[placeholder*="name"]', 'Test Candidate');
    await page.click('button:has-text("Start Test")');
  });

  test('renders bold text in question', async ({ page }) => {
    await expect(page.locator('strong').first()).toBeVisible();
  });

  test('renders inline code in question', async ({ page }) => {
    await expect(page.locator('code').first()).toBeVisible();
  });

  test('renders code block with syntax highlighting', async ({ page }) => {
    await expect(page.locator('.markdown-content pre')).toBeVisible();
  });

  test('renders markdown in answer options', async ({ page }) => {
    const option = page.locator('label').filter({ hasText: '`code`' }).first();
    await expect(option.locator('code')).toBeVisible();
  });
});
```

**Step 2: Run E2E test to verify it fails**

Run:
```bash
npm run test:e2e markdown-rendering.spec.js
```

Expected: FAIL - Markdown not rendering (shows raw markdown syntax)

**Step 3: Update QuestionRunner to use MarkdownRenderer**

Modify `frontend/src/pages/QuestionRunner.jsx` lines 1-3, 150-151, 175:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

// ... existing code ...

      {/* Question card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="text-2xl font-bold text-gray-800 mb-6">
          <MarkdownRenderer content={currentQuestion.text} />
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentAnswer.includes(index);
            const inputType = currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox';

            return (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-tech bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type={inputType}
                  name={`question-${currentQuestion.id}`}
                  checked={isSelected}
                  onChange={() => handleOptionChange(index)}
                  className="mr-3 flex-shrink-0"
                />
                <div className="flex-1">
                  <MarkdownRenderer content={option} />
                </div>
              </label>
            );
          })}
        </div>
```

**Step 4: Run E2E test to verify it passes**

Run:
```bash
npm run test:e2e markdown-rendering.spec.js
```

Expected: PASS (after seed data is created - will fail now due to missing test data, that's ok)

**Step 5: Test manually**

Start dev server and navigate to any test with markdown. Verify rendering.

**Step 6: Commit**

```bash
git add frontend/src/pages/QuestionRunner.jsx frontend/tests/e2e/markdown-rendering.spec.js
git commit -m "feat: integrate markdown rendering in question runner

- Question text renders markdown
- Answer options render markdown
- Supports code blocks, inline code, formatting in MCQ
"
```

---

## Task 5: Integrate MarkdownRenderer in TestLanding

**Files:**
- Modify: `frontend/src/pages/TestLanding.jsx`

**Step 1: Update TestLanding to render description with markdown**

Modify `frontend/src/pages/TestLanding.jsx` line 1-2, 97-100:

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

// ... existing code (lines 4-96 unchanged) ...

        {test.description && (
          <div className="text-gray-600 mb-6">
            <MarkdownRenderer content={test.description} />
          </div>
        )}
```

**Step 2: Test manually**

Create test with markdown description via admin UI, visit landing page.

Expected: Description renders markdown correctly

**Step 3: Commit**

```bash
git add frontend/src/pages/TestLanding.jsx
git commit -m "feat: render test descriptions with markdown

Test landing page now supports markdown formatting in descriptions
"
```

---

## Task 6: Add Preview Mode to Admin QuestionsTab

**Files:**
- Modify: `frontend/src/pages/admin/QuestionsTab.jsx`

**Step 1: Add preview state and button to QuestionsTab**

Modify `frontend/src/pages/admin/QuestionsTab.jsx` lines 1-9, add after line 18, modify lines 143-172:

```javascript
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import QuestionForm from './QuestionForm';
import Modal from '../../components/ui/Modal';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const QuestionsTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTag, setSearchTag] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // ... existing code (lines 20-142 unchanged) ...

        ) : (
          filteredQuestions.map(question => (
            <Card key={question.id} className="hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      question.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.type}
                    </span>
                    {question.tags && Array.isArray(question.tags) && question.tags.length > 0 && (
                      <div className="flex gap-1">
                        {question.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-gray-900 font-medium mb-2 font-mono text-sm">{question.text}</p>

                  <div className="text-sm text-gray-600">
                    <strong>Options:</strong> {Array.isArray(question.options) ? question.options.join(', ') : JSON.stringify(question.options)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    <strong>Correct:</strong> {Array.isArray(question.correct_answers) ? question.correct_answers.join(', ') : JSON.stringify(question.correct_answers)}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPreviewQuestion(question)}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingQuestion(question)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteConfirm(question)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewQuestion && (
        <Modal
          isOpen={!!previewQuestion}
          onClose={() => setPreviewQuestion(null)}
          title="Question Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                previewQuestion.type === 'SINGLE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {previewQuestion.type}
              </span>
              {previewQuestion.tags && previewQuestion.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-xl font-bold text-gray-800 mb-4">
                <MarkdownRenderer content={previewQuestion.text} />
              </div>

              <div className="space-y-2">
                {previewQuestion.options.map((option, index) => {
                  const isCorrect = previewQuestion.correct_answers.includes(option);
                  return (
                    <div
                      key={index}
                      className={`p-3 border-2 rounded-lg ${
                        isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <MarkdownRenderer content={option} />
                      {isCorrect && (
                        <span className="text-xs text-green-600 font-semibold ml-2">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setPreviewQuestion(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal - existing code unchanged */}
```

**Step 2: Test manually**

Start dev server, go to admin questions tab, click Preview button.

Expected: Modal shows rendered markdown for question and options

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/QuestionsTab.jsx
git commit -m "feat: add markdown preview mode in admin questions tab

- Preview button shows rendered markdown
- Displays question and options as candidates see them
- Highlights correct answers in preview
"
```

---

## Task 7: Install Backend Validation Dependencies

**Files:**
- Modify: `backend/package.json`

**Step 1: Install marked for markdown validation**

Run from backend directory:
```bash
cd backend
npm install marked@12.0.0 js-yaml@4.1.0
```

Expected: Dependencies added to package.json

**Step 2: Verify installation**

Run:
```bash
npm list marked js-yaml
```

Expected: Shows installed versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add markdown validation dependencies

- marked for markdown parsing/validation
- js-yaml already exists, ensured version
"
```

---

## Task 8: Create Backend Markdown Validator

**Files:**
- Create: `backend/utils/markdown-validator.js`
- Create: `backend/tests/unit/markdown-validator.test.js`

**Step 1: Write the failing test**

Create `backend/tests/unit/markdown-validator.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { validateMarkdown } from '../../utils/markdown-validator.js';

describe('Markdown Validator', () => {
  it('validates plain text', () => {
    const result = validateMarkdown('Plain text');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates bold text', () => {
    const result = validateMarkdown('**bold**');
    expect(result.isValid).toBe(true);
  });

  it('validates inline code', () => {
    const result = validateMarkdown('`const x = 1`');
    expect(result.isValid).toBe(true);
  });

  it('validates code blocks', () => {
    const result = validateMarkdown('```javascript\nconst x = 1;\n```');
    expect(result.isValid).toBe(true);
  });

  it('validates tables', () => {
    const markdown = '| Header |\n|--------|\n| Value |';
    const result = validateMarkdown(markdown);
    expect(result.isValid).toBe(true);
  });

  it('detects unclosed code blocks', () => {
    const result = validateMarkdown('```javascript\nconst x = 1;');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unclosed code block detected');
  });

  it('detects malformed table syntax', () => {
    const markdown = '| Header |\n| Value |'; // Missing separator
    const result = validateMarkdown(markdown);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/table/i);
  });

  it('allows empty strings', () => {
    const result = validateMarkdown('');
    expect(result.isValid).toBe(true);
  });

  it('handles null gracefully', () => {
    const result = validateMarkdown(null);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Content must be a string');
  });
});
```

**Step 2: Run test to verify it fails**

Run from backend directory:
```bash
npm test markdown-validator.test.js
```

Expected: FAIL - "Cannot find module '../../utils/markdown-validator.js'"

**Step 3: Write implementation**

Create `backend/utils/markdown-validator.js`:

```javascript
import { marked } from 'marked';

/**
 * Validates markdown syntax
 * @param {string} content - Markdown content to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateMarkdown(content) {
  const errors = [];

  // Check if content is string
  if (typeof content !== 'string') {
    return {
      isValid: false,
      errors: ['Content must be a string']
    };
  }

  // Empty strings are valid
  if (content.trim() === '') {
    return { isValid: true, errors: [] };
  }

  try {
    // Check for unclosed code blocks
    const codeBlockMatches = content.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push('Unclosed code block detected');
    }

    // Check for malformed tables
    const lines = content.split('\n');
    let inTable = false;
    let tableHeaderFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHeaderFound = true;
        } else if (tableHeaderFound && i > 0) {
          // Check for separator row
          const prevLine = lines[i - 1].trim();
          if (prevLine.startsWith('|') && !line.match(/^[\|\s\-:]+$/)) {
            // This should be a separator but isn't
            const separatorCheck = lines[i];
            if (!separatorCheck.match(/^[\|\s\-:]+$/)) {
              errors.push(`Table missing separator row at line ${i + 1}`);
            }
          }
          tableHeaderFound = false;
        }
      } else {
        inTable = false;
        tableHeaderFound = false;
      }
    }

    // Try to parse with marked
    marked.parse(content);

  } catch (error) {
    errors.push(`Markdown parsing error: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test markdown-validator.test.js
```

Expected: PASS - All tests green

**Step 5: Commit**

```bash
git add backend/utils/markdown-validator.js backend/tests/unit/markdown-validator.test.js
git commit -m "feat: add backend markdown validator

- Validates markdown syntax before storage
- Detects unclosed code blocks
- Detects malformed tables
- Uses marked parser for validation
- Tested with vitest
"
```

---

## Task 9: Integrate Validation into Questions API

**Files:**
- Modify: `backend/routes/questions.js`
- Modify: `backend/tests/integration/questions.test.js`

**Step 1: Write failing integration tests**

Add to `backend/tests/integration/questions.test.js` at the end:

```javascript
describe('POST /api/questions - Markdown Validation', () => {
  it('accepts valid markdown in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: '**What is** `JavaScript`?',
        type: 'SINGLE',
        options: ['A language', 'A framework'],
        correct_answers: ['A language'],
        tags: ['programming']
      });

    expect(response.status).toBe(201);
    expect(response.body.text).toBe('**What is** `JavaScript`?');
  });

  it('accepts valid code blocks in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'What does this do?\n```javascript\nconst x = 1;\n```',
        type: 'SINGLE',
        options: ['Declares variable', 'Prints output'],
        correct_answers: ['Declares variable'],
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects unclosed code blocks in question text', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Bad code block\n```javascript\nconst x = 1;',
        type: 'SINGLE',
        options: ['A', 'B'],
        correct_answers: ['A'],
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/markdown/i);
    expect(response.body.error).toMatch(/unclosed code block/i);
  });

  it('accepts markdown in options', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Select the correct code',
        type: 'SINGLE',
        options: ['`const x = 1`', '`let y = 2`'],
        correct_answers: ['`const x = 1`'],
        tags: []
      });

    expect(response.status).toBe(201);
  });

  it('rejects invalid markdown in options', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Question',
        type: 'SINGLE',
        options: ['```unclosed', 'Option 2'],
        correct_answers: ['Option 2'],
        tags: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/option.*markdown/i);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test questions.test.js
```

Expected: FAIL - Tests fail because validation not implemented

**Step 3: Add validation to POST endpoint**

Modify `backend/routes/questions.js` line 4, add after line 66:

```javascript
import { validateMarkdown } from '../utils/markdown-validator.js';

// ... existing code up to line 66 ...

  async (req, res) => {
    try {
      const { text, type, options, correct_answers, tags } = req.body;

      // Validate markdown in question text
      const textValidation = validateMarkdown(text);
      if (!textValidation.isValid) {
        return res.status(400).json({
          error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
        });
      }

      // Validate markdown in each option
      for (let i = 0; i < options.length; i++) {
        const optionValidation = validateMarkdown(options[i]);
        if (!optionValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in option ${i + 1}: ${optionValidation.errors.join(', ')}`
          });
        }
      }

      const newQuestions = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (text, type, options, correct_answers, tags)
        VALUES (${text}, ${type}, ${options}, ${correct_answers}, ${tags || []})
        RETURNING *
      `;

      res.status(201).json(newQuestions[0]);
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);
```

**Step 4: Add validation to PUT endpoint**

Modify `backend/routes/questions.js` line 98, add after line 100:

```javascript
  async (req, res) => {
    try {
      const { text, type, options, correct_answers, tags } = req.body;

      // Validate markdown in question text
      const textValidation = validateMarkdown(text);
      if (!textValidation.isValid) {
        return res.status(400).json({
          error: `Invalid markdown in question text: ${textValidation.errors.join(', ')}`
        });
      }

      // Validate markdown in each option
      for (let i = 0; i < options.length; i++) {
        const optionValidation = validateMarkdown(options[i]);
        if (!optionValidation.isValid) {
          return res.status(400).json({
            error: `Invalid markdown in option ${i + 1}: ${optionValidation.errors.join(', ')}`
          });
        }
      }

      const updatedQuestions = await sql`
        UPDATE ${sql(dbSchema)}.questions
        SET
          text = ${text},
          type = ${type},
          options = ${options},
          correct_answers = ${correct_answers},
          tags = ${tags},
          updated_at = NOW()
        WHERE id = ${req.params.id}
        RETURNING *
      `;

      if (updatedQuestions.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(updatedQuestions[0]);
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
);
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test questions.test.js
```

Expected: PASS - All tests green

**Step 6: Commit**

```bash
git add backend/routes/questions.js backend/tests/integration/questions.test.js
git commit -m "feat: validate markdown in question create/update endpoints

- POST and PUT /api/questions now validate markdown
- Rejects unclosed code blocks, malformed tables
- Validates both question text and options
- Returns 400 with specific error messages
"
```

---

## Task 10: Update Example Questions YAML

**Files:**
- Modify: `examples/questions.yaml`

**Step 1: Add markdown examples**

Add to `examples/questions.yaml` after existing examples:

```yaml
  # Example with code block
  - text: |
      # JavaScript Array Methods

      What does this code return?

      ```javascript
      const numbers = [1, 2, 3, 4, 5];
      const result = numbers.filter(n => n % 2 === 0);
      console.log(result);
      ```
    type: "SINGLE"
    options:
      - "`[1, 3, 5]`"
      - "`[2, 4]`"
      - "`[1, 2, 3, 4, 5]`"
      - "`undefined`"
    correct_answers:
      - "`[2, 4]`"
    tags:
      - "javascript"
      - "arrays"

  # Example with table
  - text: |
      Given the following time complexities:

      | Operation | Best Case | Worst Case |
      |-----------|-----------|------------|
      | Binary Search | O(1) | O(log n) |
      | Linear Search | O(1) | O(n) |
      | Quick Sort | O(n log n) | O(n²) |

      Which algorithm has the best worst-case performance for searching?
    type: "SINGLE"
    options:
      - "Binary Search"
      - "Linear Search"
      - "Quick Sort"
      - "None of the above"
    correct_answers:
      - "Binary Search"
    tags:
      - "algorithms"
      - "complexity"

  # Example with inline code
  - text: "In Python, what is the difference between `list.append()` and `list.extend()`?"
    type: "SINGLE"
    options:
      - "`append()` adds one element, `extend()` adds multiple elements"
      - "They are identical"
      - "`extend()` is deprecated"
      - "`append()` is faster"
    correct_answers:
      - "`append()` adds one element, `extend()` adds multiple elements"
    tags:
      - "python"
      - "data-structures"

  # Example with bold and italic
  - text: "Which statement about **REST APIs** is *incorrect*?"
    type: "MULTIPLE"
    options:
      - "REST uses **HTTP methods** like GET, POST, PUT, DELETE"
      - "REST is *stateless* by design"
      - "REST requires **XML** for all responses"
      - "REST supports *multiple data formats*"
    correct_answers:
      - "REST requires **XML** for all responses"
    tags:
      - "api"
      - "rest"
```

**Step 2: Test import**

Run from backend directory (assumes admin created):
```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | jq -r .token)

# Import questions
curl -X POST http://localhost:3005/api/questions/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@../examples/questions.yaml"
```

Expected: Success response with imported questions

**Step 3: Commit**

```bash
git add examples/questions.yaml
git commit -m "docs: add markdown examples to questions.yaml

- Code blocks with syntax highlighting
- Tables
- Inline code
- Bold and italic formatting
"
```

---

## Task 11: Update Documentation

**Files:**
- Modify: `docs/MARKDOWN.md`
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION.md`

**Step 1: Verify MARKDOWN.md is complete**

The file already exists from brainstorming phase. Verify it matches implementation.

Run:
```bash
cat docs/MARKDOWN.md | head -50
```

Expected: Documentation exists and is accurate

**Step 2: Add markdown feature to README.md**

Modify `README.md` - add after "Key Features" section:

```markdown
## Key Features

✅ **Shareable Test Links** - No candidate accounts needed
✅ **MCQ Support** - Single and multiple choice questions
✅ **Markdown Support** - Code syntax highlighting in questions
✅ **Admin Dashboard** - Manage tests, questions, view results
✅ **YAML Import** - Bulk import questions
✅ **Detailed Analytics** - Per-question success rates
✅ **Weighted Scoring** - Flexible test configuration
```

**Step 3: Update IMPLEMENTATION.md**

Add section to `docs/IMPLEMENTATION.md` before "Common Tasks":

```markdown
## Using Markdown in Questions

Clever Badge supports full markdown rendering including code syntax highlighting.

**Supported features:**
- Code blocks with language specification: ` ```javascript ... ``` `
- Inline code: `` `const x = 1` ``
- Bold, italic, headings, lists
- Tables
- Links

**Example:**

```yaml
- text: |
    What does this code do?
    ```python
    result = [x * 2 for x in range(5)]
    ```
  type: "SINGLE"
  options:
    - "`[0, 2, 4, 6, 8]`"
    - "`[0, 1, 2, 3, 4]`"
  correct_answers:
    - "`[0, 2, 4, 6, 8]`"
```

See [docs/MARKDOWN.md](MARKDOWN.md) for complete documentation.
```

**Step 4: Commit documentation**

```bash
git add README.md docs/IMPLEMENTATION.md
git commit -m "docs: document markdown support feature

- Add to README key features
- Add markdown usage guide to IMPLEMENTATION.md
- Reference full MARKDOWN.md documentation
"
```

---

## Task 12: Increment Version Numbers

**Files:**
- Modify: `frontend/package.json`
- Modify: `backend/package.json`

**Step 1: Update frontend version**

Modify `frontend/package.json` line 3:

```json
  "version": "0.8.0",
```

**Step 2: Update backend version**

Modify `backend/package.json` line 3:

```json
  "version": "0.8.0",
```

**Step 3: Commit version bumps**

```bash
git add frontend/package.json backend/package.json
git commit -m "chore: bump version to 0.8.0 for markdown feature"
```

---

## Task 13: E2E Test with Seed Data

**Files:**
- Create: `backend/scripts/seed-markdown-test.js`
- Modify: `frontend/tests/e2e/markdown-rendering.spec.js`

**Step 1: Create seed script for E2E tests**

Create `backend/scripts/seed-markdown-test.js`:

```javascript
import { sql, dbSchema } from '../db/index.js';
import 'dotenv/config';

async function seedMarkdownTest() {
  try {
    console.log(`Seeding markdown test data in ${dbSchema} schema...`);

    // Create test with markdown description
    const [test] = await sql`
      INSERT INTO ${sql(dbSchema)}.tests (title, slug, description, is_enabled)
      VALUES (
        'Markdown Test',
        'markdown-test',
        'This test demonstrates **markdown rendering** with `code syntax` highlighting.',
        true
      )
      RETURNING *
    `;

    console.log(`Created test: ${test.title} (${test.slug})`);

    // Create markdown questions
    const questions = [
      {
        text: '**What does this code do?**\n\n```javascript\nconst sum = (a, b) => a + b;\n```',
        type: 'SINGLE',
        options: ['Adds two numbers', 'Multiplies two numbers', 'Subtracts two numbers'],
        correct_answers: ['Adds two numbers'],
        tags: ['javascript', 'functions']
      },
      {
        text: 'Select all `array methods`:',
        type: 'MULTIPLE',
        options: ['`map()`', '`filter()`', '`console.log()`', '`reduce()`'],
        correct_answers: ['`map()`', '`filter()`', '`reduce()`'],
        tags: ['javascript', 'arrays']
      }
    ];

    for (const q of questions) {
      const [question] = await sql`
        INSERT INTO ${sql(dbSchema)}.questions (text, type, options, correct_answers, tags)
        VALUES (${q.text}, ${q.type}, ${q.options}, ${q.correct_answers}, ${q.tags})
        RETURNING *
      `;

      await sql`
        INSERT INTO ${sql(dbSchema)}.test_questions (test_id, question_id, weight)
        VALUES (${test.id}, ${question.id}, 1)
      `;

      console.log(`Added question: ${question.text.substring(0, 50)}...`);
    }

    console.log('Markdown test seed complete!');
  } catch (error) {
    console.error('Error seeding markdown test:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedMarkdownTest();
```

**Step 2: Run seed script**

```bash
cd backend
NODE_ENV=testing node scripts/seed-markdown-test.js
```

Expected: Test and questions created in testing schema

**Step 3: Update E2E test to be more specific**

Modify `frontend/tests/e2e/markdown-rendering.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering in Questions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/t/markdown-test');
    await page.fill('input[placeholder*="name"]', 'Test Candidate');
    await page.click('button:has-text("Start")');
  });

  test('renders bold text in question', async ({ page }) => {
    const bold = page.locator('.markdown-content strong').first();
    await expect(bold).toBeVisible();
    await expect(bold).toHaveText('What does this code do?');
  });

  test('renders code block with JavaScript syntax highlighting', async ({ page }) => {
    const codeBlock = page.locator('.markdown-content pre').first();
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('const sum');
  });

  test('code block has brand color background', async ({ page }) => {
    const codeBlock = page.locator('.markdown-content pre').first();
    const bgColor = await codeBlock.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    // Deep Teal #1D4E5A = rgb(29, 78, 90)
    expect(bgColor).toBe('rgb(29, 78, 90)');
  });

  test('renders inline code in options', async ({ page }) => {
    const option = page.locator('label').filter({ hasText: 'map()' }).first();
    const code = option.locator('code').first();
    await expect(code).toBeVisible();
    await expect(code).toHaveText('map()');
  });

  test('test landing shows markdown description', async ({ page }) => {
    await page.goto('/t/markdown-test');
    const description = page.locator('.markdown-content');
    await expect(description.locator('strong')).toHaveText('markdown rendering');
    await expect(description.locator('code')).toHaveText('code syntax');
  });
});
```

**Step 4: Run E2E tests**

```bash
cd frontend
npm run test:e2e markdown-rendering.spec.js
```

Expected: PASS - All tests green

**Step 5: Commit E2E tests**

```bash
git add backend/scripts/seed-markdown-test.js frontend/tests/e2e/markdown-rendering.spec.js
git commit -m "test: add E2E tests for markdown rendering

- Seed script creates markdown test data
- E2E tests verify rendering in candidate flow
- Validates brand colors in code blocks
- Tests markdown in descriptions and options
"
```

---

## Task 14: Run Full Test Suite

**Files:**
- None (verification step)

**Step 1: Run backend tests**

@superpowers:verification-before-completion

```bash
cd backend
npm test
```

Expected: All tests PASS

**Step 2: Run frontend tests**

```bash
cd frontend
npm test
```

Expected: All tests PASS

**Step 3: Run E2E tests**

```bash
cd frontend
npm run test:e2e
```

Expected: All tests PASS

**Step 4: Manual smoke test**

Start both servers (use alternate ports as specified):
```bash
# Terminal 1 - Backend
cd backend
cp .env .env.alt
# Edit .env.alt to set PORT=3005
PORT=3005 npm run dev

# Terminal 2 - Frontend
cd frontend
cp .env .env.alt
# Edit .env.alt to set VITE_API_URL=http://localhost:3005
VITE_API_URL=http://localhost:3005 VITE_PORT=5175 npm run dev
```

Manual checks:
1. Import examples/questions.yaml via admin
2. Create test with markdown questions
3. View test as candidate - verify rendering
4. Check admin preview - verify rendering
5. Verify code blocks use brand colors

**Step 5: Document completion**

If all tests pass and manual checks pass, proceed to final commit.

---

## Task 15: Final Commit and Summary

**Files:**
- Modify: `docs/MARKDOWN.md` (if needed)

**Step 1: Final verification**

Run complete test suite one more time:
```bash
# Backend
cd backend && npm test

# Frontend unit
cd frontend && npm test

# Frontend E2E
cd frontend && npm run test:e2e
```

Expected: All PASS

**Step 2: Update CLAUDE.md if needed**

If learned anything important, update "Today I learned" section.

**Step 3: Final commit**

```bash
git add -A
git status
# Verify only intended files staged
git commit -m "feat: complete markdown support implementation

Summary:
- Frontend: MarkdownRenderer component with custom syntax theme
- Backend: Markdown validation in question endpoints
- E2E: Full test coverage for markdown rendering
- Docs: Complete MARKDOWN.md guide with examples
- Versions: Bumped to 0.8.0

Markdown now works in:
- Question text (QuestionRunner)
- Answer options (QuestionRunner)
- Test descriptions (TestLanding)
- Admin previews (QuestionsTab)

Brand colors applied to syntax highlighting:
- Deep Teal background
- Tech Blue keywords
- Copper functions
- Circuit Blue comments
"
```

---

## Execution Complete

All tasks completed. The markdown support feature is fully implemented with:

✅ Frontend rendering (MarkdownRenderer component)
✅ Custom syntax highlighting theme (brand colors)
✅ Backend validation (markdown-validator utility)
✅ Integration in all UI locations
✅ Admin preview mode
✅ Complete test coverage (unit + integration + E2E)
✅ Documentation (MARKDOWN.md + examples)
✅ Version bumped to 0.8.0

**Next steps:**
1. Ask user to review implementation
2. User manually tests in alternate port environment (5175/3005)
3. User requests commit when satisfied
4. User manually pushes to git (as per CLAUDE.md rules)
