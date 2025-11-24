import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { cleverBadgeTheme } from '../styles/syntax-theme';
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
