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

  it('renders copyright text', () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'development' })
    });

    render(<Footer />);
    expect(screen.getByText(/Copyright Clever Badge 2025/i)).toBeInTheDocument();
  });

  it('displays frontend version', () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'development' })
    });

    render(<Footer />);
    expect(screen.getByText(/Frontend: v0\.7\.0/i)).toBeInTheDocument();
  });

  it('fetches and displays backend version', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.2.3', environment: 'development' })
    });

    render(<Footer />);

    // Initially shows loading
    expect(screen.getByText(/Backend: v\.\.\./i)).toBeInTheDocument();

    // Wait for backend version to load
    await waitFor(() => {
      expect(screen.getByText(/Backend: v1\.2\.3/i)).toBeInTheDocument();
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/health');
  });

  it('shows backend environment', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ version: '1.0.0', environment: 'production' })
    });

    render(<Footer />);

    await waitFor(() => {
      expect(screen.getByText(/\(production\)/i)).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Footer />);

    await waitFor(() => {
      expect(screen.getByText(/Backend: verror/i)).toBeInTheDocument();
      expect(screen.getByText(/\(error\)/i)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch backend version:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
