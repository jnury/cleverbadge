import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroSection from '../../src/components/landing/HeroSection';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('HeroSection', () => {
  it('renders logo', () => {
    renderWithRouter(<HeroSection />);
    const logo = screen.getByAltText('Clever Badge');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logo.png');
  });

  it('renders headline', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText('Create tests. Share links. Get results.')).toBeInTheDocument();
  });

  it('renders subheadline', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/simple platform to assess skills/i)).toBeInTheDocument();
  });

  it('renders Try Demo button with link to demo test', () => {
    renderWithRouter(<HeroSection />);
    const button = screen.getByRole('link', { name: /try a sample test/i });
    expect(button).toHaveAttribute('href', '/t/demo');
  });

  it('renders features link', () => {
    renderWithRouter(<HeroSection />);
    const link = screen.getByRole('link', { name: /learn more about features/i });
    expect(link).toHaveAttribute('href', '#features');
  });
});
