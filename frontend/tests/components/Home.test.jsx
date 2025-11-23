import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../src/pages/Home';

// Helper to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
  it('renders welcome message', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Clever Badge')).toBeInTheDocument();
    expect(screen.getByText('Online Skills Assessment Platform')).toBeInTheDocument();
  });

  it('renders admin login link', () => {
    renderWithRouter(<Home />);
    const link = screen.getByRole('link', { name: /admin login/i });
    expect(link).toBeInTheDocument();
  });

  it('link points to correct URL', () => {
    renderWithRouter(<Home />);
    const link = screen.getByRole('link', { name: /admin login/i });
    expect(link).toHaveAttribute('href', '/admin/login');
  });
});
