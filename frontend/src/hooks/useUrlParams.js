import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook to sync state with URL query parameters.
 *
 * @param {Object} defaults - Object with param names as keys and default values.
 *                            Use null for params that should be removed when empty.
 * @returns {[Object, Function, Function]} - [params, setParam, clearParams]
 *
 * @example
 * const [params, setParam, clearParams] = useUrlParams({
 *   tab: 'questions',  // default value
 *   type: null,        // no default, removed when null
 * });
 *
 * // Read: params.tab, params.type
 * // Write: setParam('type', 'SINGLE')
 * // Clear: setParam('type', null) or clearParams(['type', 'visibility'])
 */
export const useUrlParams = (defaults) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Build current params object from URL + defaults
  const params = useMemo(() => {
    const result = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const urlValue = searchParams.get(key);
      result[key] = urlValue !== null ? urlValue : defaultValue;
    }
    return result;
  }, [searchParams, defaults]);

  // Set a single param
  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      // Remove if null or matches default
      if (value === null || value === '' || value === defaults[key]) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      return next;
    }, { replace: true });
  }, [setSearchParams, defaults]);

  // Clear multiple params at once
  const clearParams = useCallback((keys) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return [params, setParam, clearParams];
};
