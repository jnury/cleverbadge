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
    const { container } = render(<MarkdownRenderer content={code} />);
    const codeElement = container.querySelector('code.language-javascript');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.textContent).toContain('const');
    expect(codeElement.textContent).toContain('sum');
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
