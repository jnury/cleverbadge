import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../src/pages/Home';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
  it('renders navigation', () => {
    renderWithRouter(<Home />);
    const navLogo = screen.getAllByAltText('Clever Badge')[0];
    expect(navLogo).toBeInTheDocument();
  });

  it('renders hero section with headline', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Create tests. Share links. Get results.')).toBeInTheDocument();
  });

  it('renders features section', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Everything you need to assess skills')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('has smooth scroll behavior', () => {
    const { container } = renderWithRouter(<Home />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('scroll-smooth');
  });
});
