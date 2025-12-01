import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from '../../src/components/landing/CTASection';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CTASection', () => {
  it('renders headline', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('renders subtext', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText(/try a sample test to see how it works/i)).toBeInTheDocument();
  });

  it('renders Try Sample Test button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /try sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders Login button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /login/i });
    expect(button).toHaveAttribute('href', '/admin/login');
  });

  it('has teal background', () => {
    const { container } = renderWithRouter(<CTASection />);
    const section = container.firstChild;
    expect(section).toHaveClass('bg-tech');
  });
});
