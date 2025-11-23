import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnvironmentBanner from '../../src/components/EnvironmentBanner';

describe('EnvironmentBanner', () => {
  const originalEnv = import.meta.env.VITE_ENV;

  afterEach(() => {
    // Restore original environment
    import.meta.env.VITE_ENV = originalEnv;
  });

  it('does not render in production', () => {
    import.meta.env.VITE_ENV = 'production';
    const { container } = render(<EnvironmentBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders yellow banner in development', () => {
    import.meta.env.VITE_ENV = 'development';
    render(<EnvironmentBanner />);
    const banner = screen.getByText('DEVELOPMENT ENVIRONMENT');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('bg-yellow-400', 'text-yellow-900');
  });

  it('renders purple banner in staging', () => {
    import.meta.env.VITE_ENV = 'staging';
    render(<EnvironmentBanner />);
    const banner = screen.getByText('STAGING ENVIRONMENT');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('bg-purple-400', 'text-purple-900');
  });

  it('shows correct text for each environment', () => {
    // Test development
    import.meta.env.VITE_ENV = 'development';
    render(<EnvironmentBanner />);
    expect(screen.getByText('DEVELOPMENT ENVIRONMENT')).toBeInTheDocument();
  });
});
