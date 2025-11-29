import React from 'react';

/**
 * Reusable sortable table header component.
 *
 * @param {string} label - Display text for the column header
 * @param {string} sortKey - Unique key for this column (e.g., 'title', 'score')
 * @param {string|null} currentSort - Current sort value (e.g., 'title-asc', 'score-desc', or null)
 * @param {function} onSort - Callback with new sort value (e.g., 'title-asc') or null to clear
 * @param {string} className - Additional CSS classes
 */
const SortableHeader = ({ label, sortKey, currentSort, onSort, className = '' }) => {
  // Parse current sort to check if this column is active
  const [activeKey, activeDir] = currentSort ? currentSort.split('-') : [null, null];
  const isActive = activeKey === sortKey;
  const direction = isActive ? activeDir : null;

  const handleClick = () => {
    // Cycle: null → asc → desc → null
    let nextSort;
    if (!isActive) {
      nextSort = `${sortKey}-asc`;
    } else if (direction === 'asc') {
      nextSort = `${sortKey}-desc`;
    } else {
      nextSort = null;
    }
    onSort(nextSort);
  };

  // Sort indicator
  const indicator = direction === 'asc' ? ' ▲' : direction === 'desc' ? ' ▼' : '';

  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={handleClick}
    >
      {label}{indicator}
    </th>
  );
};

export default SortableHeader;
