import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from '../../src/components/landing/CTASection';

// Mock api
vi.mock('../../src/utils/api', () => ({
  isLoggedIn: vi.fn(() => false),
  login: vi.fn()
}));

import { isLoggedIn } from '../../src/utils/api';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CTASection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.mockReturnValue(false);
  });

  it('renders headline', () => {
    renderWithRouter(<CTASection />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('renders Try Sample Test button', () => {
    renderWithRouter(<CTASection />);
    const button = screen.getByRole('link', { name: /try sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  describe('when not logged in', () => {
    it('renders Login button', () => {
      renderWithRouter(<CTASection />);
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('opens login modal when Login clicked', () => {
      renderWithRouter(<CTASection />);
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      isLoggedIn.mockReturnValue(true);
    });

    it('renders Go to Dashboard link', () => {
      renderWithRouter(<CTASection />);
      const link = screen.getByRole('link', { name: /go to dashboard/i });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });
});
