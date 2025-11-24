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
