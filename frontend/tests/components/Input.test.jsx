import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '../../src/components/ui/Input';

describe('Input Component', () => {
  it('renders input with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error styling when error exists', () => {
    render(<Input error="Invalid" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-500');
  });
});
