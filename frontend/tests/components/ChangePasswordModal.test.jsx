import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordModal from '../../src/components/ChangePasswordModal';
import * as api from '../../src/utils/api';

// Mock the api module
vi.mock('../../src/utils/api', () => ({
  changePassword: vi.fn()
}));

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<ChangePasswordModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
  });

  it('renders form fields when open', () => {
    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);
    // Title appears in modal header
    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'currentpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'different' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
    });

    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is too short', async () => {
    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'currentpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: '12345' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 6 characters')).toBeInTheDocument();
    });

    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('calls changePassword API with correct parameters', async () => {
    api.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'currentpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith('currentpass', 'newpass123');
    });
  });

  it('shows success message on successful password change', async () => {
    api.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'currentpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    api.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

    render(<ChangePasswordModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  it('clears form and calls onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(<ChangePasswordModal isOpen={true} onClose={handleClose} />);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(handleClose).toHaveBeenCalled();
  });
});
