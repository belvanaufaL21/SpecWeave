/**
 * Optimized Base Table Component
 * High-performance table with virtual scrolling, sorting, and filtering
 */

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useComponentPerformance } from '../../utils/performance/componentProfiler';

const BaseTable = memo(({
  data = [],
  columns = [],
  loading = false,
  error = null,
  sortable = true,
  filterable = false,
  virtualScrolling = false,
  rowHeight = 60,
  maxHeight = 400,
  className = '',
  headerClassName = '',
  rowClassName = '',
  emptyMessage = 'No data available',
  loadingMessage = 'Loading...',
  onRowClick,
  onSort,
  onFilter,
  initialSort = null,
  stickyHeader = true,
  ...props
}) => {
  const { measureOperation } = useComponentPerformance('BaseTable');
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [filterConfig, setFilterConfig] = useState({});
  const tableRef = useRef(null);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    return measureOperation('data-processing', () => {
      let result = [...data];

      // Apply filters
      if (filterable && Object.keys(filterConfig).length > 0) {
        result = result.filter(row => {
          return Object.entries(filterConfig).every(([key, value]) => {
            if (!value) return true;
            const cellValue = row[key];
            return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          });
        });
      }

      // Apply sorting
      if (sortConfig) {
        result.sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          
          if (aValue === bValue) return 0;
          
          let comparison = 0;
          if (aValue > bValue) comparison = 1;
          if (aValue < bValue) comparison = -1;
          
          return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
        });
      }

      return result;
    });
  }, [data, filterConfig, sortConfig, filterable, measureOperation]);

  // Handle sort
  const handleSort = useCallback((columnKey) => {
    if (!sortable) return;

    measureOperation('sort-operation', () => {
      const newSortConfig = {
        key: columnKey,
        direction: sortConfig?.key === columnKey && sortConfig?.direction === 'asc' ? 'desc' : 'asc'
      };
      
      setSortConfig(newSortConfig);
      onSort?.(newSortConfig);
    });
  }, [sortable, sortConfig, onSort, measureOperation]);

  // Handle filter
  const handleFilter = useCallback((columnKey, value) => {
    if (!filterable) return;

    measureOperation('filter-operation', () => {
      const newFilterConfig = {
        ...filterConfig,
        [columnKey]: value
      };
      
      setFilterConfig(newFilterConfig);
      onFilter?.(newFilterConfig);
    });
  }, [filterable, filterConfig, onFilter, measureOperation]);

  // Handle row click
  const handleRowClick = useCallback((row, index) => {
    if (onRowClick) {
      measureOperation('row-click', () => onRowClick(row, index));
    }
  }, [onRowClick, measureOperation]);

  // Render table header
  const renderHeader = () => (
    <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''} ${headerClassName}`}>
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
              sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
            } ${column.headerClassName || ''}`}
            onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
            style={{ width: column.width }}
          >
            <div className="flex items-center gap-2">
              {column.title}
              {sortable && column.sortable !== false && (
                <div className="flex flex-col">
                  <svg
                    className={`w-3 h-3 ${
                      sortConfig?.key === column.key && sortConfig?.direction === 'asc'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <svg
                    className={`w-3 h-3 -mt-1 ${
                      sortConfig?.key === column.key && sortConfig?.direction === 'desc'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </th>
        ))}
      </tr>
      {filterable && (
        <tr>
          {columns.map((column) => (
            <th key={`filter-${column.key}`} className="px-6 py-2">
              {column.filterable !== false && (
                <input
                  type="text"
                  placeholder={`Filter ${column.title}...`}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterConfig[column.key] || ''}
                  onChange={(e) => handleFilter(column.key, e.target.value)}
                />
              )}
            </th>
          ))}
        </tr>
      )}
    </thead>
  );

  // Render table row
  const renderRow = useCallback(({ index, style }) => {
    const row = processedData[index];
    
    return (
      <div
        style={style}
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 ${
          onRowClick ? 'cursor-pointer' : ''
        } ${rowClassName}`}
        onClick={() => handleRowClick(row, index)}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={`px-6 py-4 text-sm text-gray-900 ${column.cellClassName || ''}`}
            style={{ width: column.width, minWidth: column.minWidth }}
          >
            {column.render ? column.render(row[column.key], row, index) : row[column.key]}
          </div>
        ))}
      </div>
    );
  }, [processedData, columns, handleRowClick, rowClassName]);

  // Render regular table body
  const renderBody = () => (
    <tbody className="bg-white divide-y divide-gray-200">
      {processedData.map((row, index) => (
        <tr
          key={row.id || index}
          className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
          onClick={() => handleRowClick(row, index)}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.cellClassName || ''}`}
              style={{ width: column.width }}
            >
              {column.render ? column.render(row[column.key], row, index) : row[column.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">{loadingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (processedData.length === 0) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`} {...props}>
      {virtualScrolling ? (
        <div>
          {renderHeader()}
          <List
            ref={tableRef}
            height={Math.min(maxHeight, processedData.length * rowHeight)}
            itemCount={processedData.length}
            itemSize={rowHeight}
            itemData={processedData}
          >
            {renderRow}
          </List>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {renderHeader()}
            {renderBody()}
          </table>
        </div>
      )}
    </div>
  );
});

BaseTable.displayName = 'BaseTable';

export default BaseTable;