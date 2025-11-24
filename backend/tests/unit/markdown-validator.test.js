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

  it('validates italic text', () => {
    const result = validateMarkdown('*italic text*');
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
