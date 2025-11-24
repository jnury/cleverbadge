# Markdown Support Feature

## Overview

Clever Badge supports full markdown rendering in questions, answer options, and test descriptions. This feature is particularly useful for technical assessments that include code snippets with syntax highlighting.

## Where Markdown Works

Markdown is rendered in the following locations:

1. **Question text** - The main question body shown to candidates
2. **Answer options** - Individual MCQ choices (A, B, C, D, etc.)
3. **Test description** - Optional description text on the test landing page
4. **Admin preview** - When admins view questions in the dashboard

## Supported Markdown Features

### Code Blocks with Syntax Highlighting

Fenced code blocks with language specification:

```yaml
text: |
  What does this code do?
  ```javascript
  const sum = (a, b) => a + b;
  console.log(sum(5, 3));
  ```
```

Supported languages include: JavaScript, Python, Java, C#, SQL, and many more via Prism.

### Inline Code

Use backticks for inline code snippets within text:

```yaml
text: "What is the output of `console.log(typeof null)`?"
```

### Basic Formatting

- **Bold**: `**bold text**` or `__bold text__`
- *Italic*: `*italic text*` or `_italic text_`
- Headings: `# H1`, `## H2`, `### H3`, etc.
- Links: `[link text](https://example.com)`
- Lists: Unordered (`-`, `*`) and ordered (`1.`, `2.`)

### Tables

```yaml
text: |
  | Method | Time Complexity |
  |--------|-----------------|
  | Search | O(n)            |
  | Insert | O(1)            |
```

## YAML Import Format

Use YAML multi-line strings (`|` or `>`) for markdown content:

```yaml
questions:
  - id: q1
    text: |
      # JavaScript Question

      Consider this code:
      ```javascript
      const arr = [1, 2, 3];
      const result = arr.map(x => x * 2);
      ```

      What is the value of `result`?
    type: SINGLE
    options:
      - text: "`[1, 2, 3]`"
        is_correct: false
      - text: "`[2, 4, 6]`"
        is_correct: true
      - text: "`[1, 4, 9]`"
        is_correct: false

  - id: q2
    text: "Which SQL keyword filters rows?"
    type: MULTIPLE
    options:
      - text: "`WHERE`"
        is_correct: true
      - text: "`SELECT`"
        is_correct: false
      - text: "`HAVING`"
        is_correct: true
      - text: "`FROM`"
        is_correct: false
```

## Technical Implementation

### Frontend Stack

- **react-markdown** - Markdown parsing and rendering
- **react-syntax-highlighter** - Code syntax highlighting
- **Prism** - Syntax highlighter engine with custom theme

### Security

- Raw HTML is **disabled** by default (prevents XSS attacks)
- Only safe markdown subset is rendered
- Admins are trusted users, but HTML injection is still blocked

### Storage

- Database stores **raw markdown** (not processed HTML)
- Rendering happens on the client side
- No HTML caching - keeps data portable and editable

### Validation

During YAML import, the backend validates markdown syntax:

- Parses markdown with `marked` library
- Catches malformed code blocks, unbalanced delimiters
- Rejects entire import if validation fails
- Returns specific error messages with field and line numbers

### Backward Compatibility

- No database schema changes required
- Plain text questions render correctly as markdown
- No migration needed for existing questions

## Syntax Highlighting Theme

Custom dark theme based on Clever Badge brand colors:

- **Background**: Deep Teal (#1D4E5A)
- **Keywords**: Tech Blue (#4DA6C0)
- **Strings**: Copper (#D98C63)
- **Comments**: Circuit Blue (#2A6373)
- **Functions**: Light Copper (#D98C63)

## Admin Dashboard

### Preview Mode

Admins can preview how markdown will render to candidates:

1. Click the **"Preview"** button on any question
2. Toggle between:
   - **Raw mode**: View markdown source
   - **Preview mode**: See rendered output with syntax highlighting

Preview uses the same rendering engine as the candidate view, ensuring consistency.

## Best Practices

### Code Blocks

Always specify the language for proper syntax highlighting:

```yaml
# ✅ Good - language specified
text: |
  ```python
  def hello():
      print("Hello")
  ```

# ❌ Bad - no language
text: |
  ```
  def hello():
      print("Hello")
  ```
```

### Inline Code

Use inline code for variable names, function names, and short code snippets:

```yaml
# ✅ Good
text: "What does the `map()` function return?"

# ❌ Bad - code block for short snippet
text: |
  What does this return?
  ```
  map()
  ```
```

### Escaping Special Characters

If you need literal backticks or asterisks, escape them:

```yaml
text: "Use \\`backticks\\` for code"
```

### Multiline Questions

Use the pipe (`|`) for block scalar style (preserves line breaks):

```yaml
text: |
  Line 1
  Line 2
  Line 3
```

Or greater-than (`>`) for folded style (joins lines):

```yaml
text: >
  This long text will be
  folded into a single
  paragraph.
```

## Error Handling

### Import Validation Errors

If markdown validation fails during import, you'll receive an error like:

```json
{
  "error": "Markdown validation failed",
  "details": [
    {
      "field": "questions[0].text",
      "line": 3,
      "message": "Unclosed code block: expected closing ```"
    }
  ]
}
```

### Common Issues

**Unclosed code blocks:**
```yaml
# ❌ Missing closing backticks
text: |
  ```javascript
  const x = 1;
```

**Solution:** Always close code blocks with three backticks

**Invalid table syntax:**
```yaml
# ❌ Missing separator row
text: |
  | Header |
  | Value |
```

**Solution:** Add separator row with dashes:
```yaml
text: |
  | Header |
  |--------|
  | Value  |
```

## Examples

### Complete Question with Code

```yaml
- id: q_js_01
  text: |
    # Array Methods

    Consider the following code:

    ```javascript
    const numbers = [1, 2, 3, 4, 5];
    const result = numbers.filter(n => n % 2 === 0);
    ```

    What will `result` contain?
  type: SINGLE
  options:
    - text: "`[1, 3, 5]`"
      is_correct: false
    - text: "`[2, 4]`"
      is_correct: true
    - text: "`[1, 2, 3, 4, 5]`"
      is_correct: false
    - text: "`[]`"
      is_correct: false
```

### Question with Table

```yaml
- id: q_complexity_01
  text: |
    Given the following time complexities:

    | Operation | Complexity |
    |-----------|------------|
    | Binary Search | O(log n) |
    | Linear Search | O(n) |
    | Quick Sort | O(n log n) |

    Which operation is fastest for large datasets?
  type: SINGLE
  options:
    - text: Binary Search
      is_correct: true
    - text: Linear Search
      is_correct: false
    - text: Quick Sort
      is_correct: false
```

### Question with Inline Code

```yaml
- id: q_python_01
  text: "In Python, what is the difference between `list.append()` and `list.extend()`?"
  type: SINGLE
  options:
    - text: "`append()` adds a single element, `extend()` adds multiple elements"
      is_correct: true
    - text: "They are identical"
      is_correct: false
    - text: "`extend()` is deprecated"
      is_correct: false
```

## Testing

### Unit Tests

- MarkdownRenderer component with various markdown inputs
- Backend validation function with valid/invalid markdown

### Integration Tests

- YAML import with markdown (success and failure cases)
- API responses contain raw markdown (not HTML)
- Markdown validation rejects malformed syntax

### E2E Tests

- Candidates see rendered markdown in questions and options
- Code blocks display with syntax highlighting
- Admin preview toggle works correctly
- Brand colors applied to syntax highlighting

## Performance Considerations

### Bundle Size

Markdown libraries add approximately 4MB to the frontend bundle:
- `react-markdown`: ~2.8MB
- `react-syntax-highlighter`: ~1.2MB
- Prism themes: ~100KB

**Mitigation:** Dynamic imports for syntax highlighter to reduce initial load time.

### Rendering Performance

Multiple code blocks on one page could impact performance.

**Mitigation:** Memoize `MarkdownRenderer` component to prevent unnecessary re-renders.

## Future Enhancements

Post-MVP features to consider:

- **Copy-to-clipboard button** for code blocks
- **Line numbers** in code blocks
- **Language auto-detection** for unlabeled code blocks
- **Markdown editor** in admin UI (WYSIWYG or split view)
- **LaTeX math support** for scientific/mathematical content
- **Diagrams** via Mermaid.js
- **Diff highlighting** for code comparison questions

## See Also

- [API Documentation](API.md) - Import endpoint details
- [Implementation Guide](IMPLEMENTATION.md) - Development setup
- [Database Schema](DATABASE.md) - Data model
- [Question Examples](../examples/questions.yaml) - Sample YAML with markdown
