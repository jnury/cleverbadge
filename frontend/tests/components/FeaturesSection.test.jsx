import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '../../src/components/landing/FeaturesSection';

describe('FeaturesSection', () => {
  it('has features id for anchor navigation', () => {
    const { container } = render(<FeaturesSection />);
    const section = container.querySelector('#features');
    expect(section).toBeInTheDocument();
  });

  it('renders section title', () => {
    render(<FeaturesSection />);
    expect(screen.getByText('Everything you need to assess skills')).toBeInTheDocument();
  });

  it('renders all six feature cards', () => {
    render(<FeaturesSection />);
    expect(screen.getByText('Rich Question Types')).toBeInTheDocument();
    expect(screen.getByText('Easy Test Management')).toBeInTheDocument();
    expect(screen.getByText('Track Assessments')).toBeInTheDocument();
    expect(screen.getByText('Built-in Analytics')).toBeInTheDocument();
    expect(screen.getByText('Detailed Explanations')).toBeInTheDocument();
    expect(screen.getByText('Instant Results')).toBeInTheDocument();
  });

  it('renders six images', () => {
    render(<FeaturesSection />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(6);
  });
});
