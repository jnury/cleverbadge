import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../../src/components/landing/Navigation';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Navigation', () => {
  it('renders logo', () => {
    renderWithRouter(<Navigation />);
    const logo = screen.getByAltText('Clever Badge');
    expect(logo).toBeInTheDocument();
  });

  it('renders Clever Badge text', () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByText('Clever Badge')).toBeInTheDocument();
  });

  it('renders Features link', () => {
    renderWithRouter(<Navigation />);
    const link = screen.getByRole('link', { name: /features/i });
    expect(link).toHaveAttribute('href', '#features');
  });

  it('renders Try Demo button', () => {
    renderWithRouter(<Navigation />);
    const button = screen.getByRole('link', { name: /try demo/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders Login button', () => {
    renderWithRouter(<Navigation />);
    const button = screen.getByRole('link', { name: /login/i });
    expect(button).toHaveAttribute('href', '/admin/login');
  });

  it('is fixed position', () => {
    const { container } = renderWithRouter(<Navigation />);
    const nav = container.firstChild;
    expect(nav).toHaveClass('fixed');
  });
});
