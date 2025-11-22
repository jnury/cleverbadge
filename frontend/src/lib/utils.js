import { clsx } from 'clsx';

/**
 * Utility function to combine class names
 * Uses clsx for conditional class names
 */
export function cn(...inputs) {
  return clsx(inputs);
}
