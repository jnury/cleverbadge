import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute';

// Mock the API module
vi.mock('../../src/utils/api', () => ({
  isLoggedIn: vi.fn()
}));

import { isLoggedIn } from '../../src/utils/api';

// Component to capture navigation state
const HomePage = () => {
  const location = window.location;
  return <div data-testid="home-page">Home Page</div>;
};

const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;

const renderWithRouter = (initialRoute = '/dashboard', isAuthenticated = false) => {
  isLoggedIn.mockReturnValue(isAuthenticated);

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProtectedContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user is logged in', () => {
    renderWithRouter('/dashboard', true);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('should redirect to home when user is not logged in', () => {
    renderWithRouter('/dashboard', false);

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should call isLoggedIn to check authentication', () => {
    renderWithRouter('/dashboard', false);

    expect(isLoggedIn).toHaveBeenCalled();
  });

  it('should render different children when authenticated', () => {
    isLoggedIn.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="dashboard-content">Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });
});
