import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlParams } from '../../src/hooks/useUrlParams';

// Wrapper with router
const createWrapper = (initialEntries = ['/']) => {
  return ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

describe('useUrlParams Hook', () => {
  it('returns default values when URL has no params', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper() }
    );

    expect(result.current[0].tab).toBe('questions');
    expect(result.current[0].type).toBe(null);
  });

  it('reads initial values from URL', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?tab=tests&type=SINGLE']) }
    );

    expect(result.current[0].tab).toBe('tests');
    expect(result.current[0].type).toBe('SINGLE');
  });

  it('updates URL when setParam is called', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current[1]('type', 'MULTIPLE');
    });

    expect(result.current[0].type).toBe('MULTIPLE');
  });

  it('removes param from URL when set to null', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?type=SINGLE']) }
    );

    expect(result.current[0].type).toBe('SINGLE');

    act(() => {
      result.current[1]('type', null);
    });

    expect(result.current[0].type).toBe(null);
  });

  it('removes param when set to default value', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null }),
      { wrapper: createWrapper(['/?tab=tests']) }
    );

    act(() => {
      result.current[1]('tab', 'questions');
    });

    // Should use default, not in URL
    expect(result.current[0].tab).toBe('questions');
  });

  it('clearParams removes specified params', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null, visibility: null }),
      { wrapper: createWrapper(['/?tab=tests&type=SINGLE&visibility=public']) }
    );

    act(() => {
      result.current[2](['type', 'visibility']);
    });

    expect(result.current[0].tab).toBe('tests');
    expect(result.current[0].type).toBe(null);
    expect(result.current[0].visibility).toBe(null);
  });

  it('clearParams can set new params while clearing others', () => {
    const { result } = renderHook(
      () => useUrlParams({ tab: 'questions', type: null, visibility: null, tag: null }),
      { wrapper: createWrapper(['/?tab=questions&type=SINGLE&visibility=public&tag=math']) }
    );

    // Clear filters and switch tab atomically
    act(() => {
      result.current[2](['type', 'visibility', 'tag'], { tab: 'tests' });
    });

    expect(result.current[0].tab).toBe('tests');
    expect(result.current[0].type).toBe(null);
    expect(result.current[0].visibility).toBe(null);
    expect(result.current[0].tag).toBe(null);
  });
});
