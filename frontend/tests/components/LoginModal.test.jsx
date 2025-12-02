import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginModal from '../../src/components/LoginModal';

// Mock the api module
vi.mock('../../src/utils/api', () => ({
  login: vi.fn(),
  isLoggedIn: vi.fn(() => false)
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LoginModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithRouter(
      <LoginModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when open', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders username and password fields', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls onClose when clicking overlay', () => {
    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles successful form submission', async () => {
    const { login } = await import('../../src/utils/api');
    login.mockResolvedValueOnce({ success: true });

    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('testuser', 'testpass');
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('displays error message on failed login', async () => {
    const { login } = await import('../../src/utils/api');
    login.mockRejectedValueOnce(new Error('Invalid credentials'));

    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('displays loading state during form submission', async () => {
    const { login } = await import('../../src/utils/api');
    login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithRouter(
      <LoginModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
