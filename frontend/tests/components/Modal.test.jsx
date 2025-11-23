import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../src/components/ui/Modal';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<Modal isOpen={false} title="Test">Content</Modal>);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<Modal isOpen={true} title="Test">Content</Modal>);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    const closeButtons = screen.getAllByRole('button');
    // Click the X button (should be the first button in the modal header)
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    const overlay = document.querySelector('.bg-gray-500');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalled();
  });
});
