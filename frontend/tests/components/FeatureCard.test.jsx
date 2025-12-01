import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureCard from '../../src/components/landing/FeatureCard';

describe('FeatureCard', () => {
  const defaultProps = {
    image: '/screenshots/test.png',
    title: 'Test Title',
    description: 'Test description text'
  };

  it('renders image with correct src', () => {
    render(<FeatureCard {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/screenshots/test.png');
  });

  it('renders title', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('has hover animation class', () => {
    const { container } = render(<FeatureCard {...defaultProps} />);
    const card = container.firstChild;
    expect(card).toHaveClass('hover:-translate-y-1');
  });
});
