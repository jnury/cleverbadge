import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SortableHeader from '../../src/components/ui/SortableHeader';

// Helper to render SortableHeader within a table
const renderHeader = (props) => {
  return render(
    <table>
      <thead>
        <tr>
          <SortableHeader {...props} />
        </tr>
      </thead>
    </table>
  );
};

describe('SortableHeader', () => {
  it('should render label text', () => {
    renderHeader({
      label: 'Column Name',
      sortKey: 'column',
      currentSort: null,
      onSort: vi.fn()
    });

    expect(screen.getByText('Column Name')).toBeInTheDocument();
  });

  it('should show no indicator when not sorted', () => {
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: null,
      onSort: vi.fn()
    });

    const th = screen.getByRole('columnheader');
    expect(th.textContent).toBe('Title');
    expect(th.textContent).not.toContain('▲');
    expect(th.textContent).not.toContain('▼');
  });

  it('should show ascending indicator when sorted asc', () => {
    renderHeader({
      label: 'Score',
      sortKey: 'score',
      currentSort: 'score-asc',
      onSort: vi.fn()
    });

    expect(screen.getByText('Score ▲')).toBeInTheDocument();
  });

  it('should show descending indicator when sorted desc', () => {
    renderHeader({
      label: 'Score',
      sortKey: 'score',
      currentSort: 'score-desc',
      onSort: vi.fn()
    });

    expect(screen.getByText('Score ▼')).toBeInTheDocument();
  });

  it('should not show indicator when different column is sorted', () => {
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: 'score-asc',
      onSort: vi.fn()
    });

    const th = screen.getByRole('columnheader');
    expect(th.textContent).toBe('Title');
  });

  it('should cycle null -> asc on first click', () => {
    const onSort = vi.fn();
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: null,
      onSort
    });

    fireEvent.click(screen.getByRole('columnheader'));

    expect(onSort).toHaveBeenCalledWith('title-asc');
  });

  it('should cycle asc -> desc on click', () => {
    const onSort = vi.fn();
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: 'title-asc',
      onSort
    });

    fireEvent.click(screen.getByRole('columnheader'));

    expect(onSort).toHaveBeenCalledWith('title-desc');
  });

  it('should cycle desc -> null on click', () => {
    const onSort = vi.fn();
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: 'title-desc',
      onSort
    });

    fireEvent.click(screen.getByRole('columnheader'));

    expect(onSort).toHaveBeenCalledWith(null);
  });

  it('should start sort cycle when clicking different column', () => {
    const onSort = vi.fn();
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: 'score-asc', // Different column is sorted
      onSort
    });

    fireEvent.click(screen.getByRole('columnheader'));

    expect(onSort).toHaveBeenCalledWith('title-asc');
  });

  it('should apply additional className', () => {
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: null,
      onSort: vi.fn(),
      className: 'custom-class'
    });

    const th = screen.getByRole('columnheader');
    expect(th).toHaveClass('custom-class');
  });

  it('should have cursor-pointer class', () => {
    renderHeader({
      label: 'Title',
      sortKey: 'title',
      currentSort: null,
      onSort: vi.fn()
    });

    const th = screen.getByRole('columnheader');
    expect(th).toHaveClass('cursor-pointer');
  });
});
