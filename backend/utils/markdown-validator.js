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
