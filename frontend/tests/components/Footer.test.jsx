import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Footer from '../../src/components/Footer';

describe('Footer', () => {
  beforeEach(() => {
    // Mock fetch for each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders copyright text', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'development' })
    });

    render(<Footer />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/Backend: 1\.0\.0/)).toBeInTheDocument();
    });

    expect(screen.getByText(/© 2025 Clever Badge/i)).toBeInTheDocument();
  });

  it('displays frontend version', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'development' })
    });

    render(<Footer />);
    expect(screen.getByText(/Frontend: \d+\.\d+\.\d+/i)).toBeInTheDocument();
  });

  it('fetches and displays backend version', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.2.3', environment: 'development' })
    });

    render(<Footer />);

    // Initially shows loading
    expect(screen.getByText(/Backend: \.\.\./i)).toBeInTheDocument();

    // Wait for backend version to load (no "v" prefix)
    await waitFor(() => {
      expect(screen.getByText(/Backend: 1\.2\.3/i)).toBeInTheDocument();
    });

    // Verify fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalled();
  });

  it('shows backend version after fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'production' })
    });

    render(<Footer />);

    await waitFor(() => {
      expect(screen.getByText(/Backend: 1\.0\.0/i)).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Footer />);

    await waitFor(() => {
      // Component shows "error" when fetch fails
      expect(screen.getByText(/Backend: error/)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch backend version:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
