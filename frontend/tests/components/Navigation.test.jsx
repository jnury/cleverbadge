import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../../src/components/landing/Navigation';

// Mock api
vi.mock('../../src/utils/api', () => ({
  isLoggedIn: vi.fn(() => false),
  login: vi.fn()
}));

import { isLoggedIn } from '../../src/utils/api';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.mockReturnValue(false);
  });

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

  it('renders Try Demo link', () => {
    renderWithRouter(<Navigation />);
    const link = screen.getByRole('link', { name: /try demo/i });
    expect(link).toHaveAttribute('href', '/t/demo');
  });

  describe('when not logged in', () => {
    it('renders Login link', () => {
      renderWithRouter(<Navigation />);
      const loginLink = screen.getByRole('link', { name: /^login$/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('renders Register link', () => {
      renderWithRouter(<Navigation />);
      const registerLink = screen.getByRole('link', { name: /register/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      isLoggedIn.mockReturnValue(true);
    });

    it('renders Dashboard link instead of Login and Register', () => {
      renderWithRouter(<Navigation />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^login$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
    });

    it('Dashboard link points to /dashboard', () => {
      renderWithRouter(<Navigation />);
      const link = screen.getByRole('link', { name: /dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });
});
