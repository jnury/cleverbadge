import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast, { ToastContainer } from '../../src/components/ui/Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render message', () => {
    render(<Toast message="Test message" onClose={vi.fn()} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render with success style by default', () => {
    render(<Toast message="Success" onClose={vi.fn()} />);
    const toast = screen.getByText('Success').closest('div');
    expect(toast).toHaveClass('bg-green-500');
  });

  it('should render with error style', () => {
    render(<Toast message="Error" type="error" onClose={vi.fn()} />);
    const toast = screen.getByText('Error').closest('div');
    expect(toast).toHaveClass('bg-red-500');
  });

  it('should render with info style', () => {
    render(<Toast message="Info" type="info" onClose={vi.fn()} />);
    const toast = screen.getByText('Info').closest('div');
    expect(toast).toHaveClass('bg-blue-500');
  });

  it('should render with warning style', () => {
    render(<Toast message="Warning" type="warning" onClose={vi.fn()} />);
    const toast = screen.getByText('Warning').closest('div');
    expect(toast).toHaveClass('bg-yellow-500');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after default duration (3000ms)', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after custom duration', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} duration={5000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Toast message="Test" onClose={onClose} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ToastContainer Component', () => {
  it('should render empty when no toasts', () => {
    const { container } = render(
      <ToastContainer toasts={[]} removeToast={vi.fn()} />
    );
    expect(container.querySelector('div')).toBeEmptyDOMElement();
  });

  it('should render multiple toasts', () => {
    const toasts = [
      { id: 1, message: 'Toast 1', type: 'success' },
      { id: 2, message: 'Toast 2', type: 'error' },
      { id: 3, message: 'Toast 3', type: 'info' }
    ];

    render(<ToastContainer toasts={toasts} removeToast={vi.fn()} />);

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
  });

  it('should call removeToast with correct id when toast is closed', () => {
    const removeToast = vi.fn();
    const toasts = [
      { id: 42, message: 'Closeable toast', type: 'success' }
    ];

    render(<ToastContainer toasts={toasts} removeToast={removeToast} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(removeToast).toHaveBeenCalledWith(42);
  });

  it('should render toasts with correct types', () => {
    const toasts = [
      { id: 1, message: 'Success', type: 'success' },
      { id: 2, message: 'Error', type: 'error' }
    ];

    render(<ToastContainer toasts={toasts} removeToast={vi.fn()} />);

    const successToast = screen.getByText('Success').closest('div');
    const errorToast = screen.getByText('Error').closest('div');

    expect(successToast).toHaveClass('bg-green-500');
    expect(errorToast).toHaveClass('bg-red-500');
  });
});
