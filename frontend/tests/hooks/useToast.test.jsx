import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../../src/hooks/useToast';

describe('useToast Hook', () => {
  it('should start with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add toast with addToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Test message', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should default to success type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Message without type');
    });

    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should remove toast with removeToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Toast 1');
      result.current.addToast('Toast 2');
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Toast 2');
  });

  it('should add success toast with showSuccess', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success message');
    });

    expect(result.current.toasts[0].message).toBe('Success message');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should add error toast with showError', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showError('Error message');
    });

    expect(result.current.toasts[0].message).toBe('Error message');
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('should add info toast with showInfo', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showInfo('Info message');
    });

    expect(result.current.toasts[0].message).toBe('Info message');
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should add warning toast with showWarning', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showWarning('Warning message');
    });

    expect(result.current.toasts[0].message).toBe('Warning message');
    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('should assign unique IDs to toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Toast 1');
      result.current.addToast('Toast 2');
      result.current.addToast('Toast 3');
    });

    const ids = result.current.toasts.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should handle removing non-existent toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Toast 1');
    });

    act(() => {
      result.current.removeToast(99999);
    });

    // Should not throw and should keep existing toast
    expect(result.current.toasts).toHaveLength(1);
  });
});
