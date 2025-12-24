/**
 * ViewToggle Component
 * Allows switching between different view modes (e.g., unit view vs property view)
 * Persists selection in localStorage and URL params
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from '@remix-run/react';

export type ViewMode = 'unit' | 'property';

interface ViewToggleProps {
  /**
   * Current view mode
   */
  currentView: ViewMode;
  /**
   * Callback when view changes
   */
  onViewChange: (view: ViewMode) => void;
  /**
   * Storage key for localStorage persistence
   * @default 'application_view_mode'
   */
  storageKey?: string;
  /**
   * Labels for each view mode
   */
  labels?: {
    unit: string;
    property: string;
  };
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Toggle component for switching between unit and property views
 * Features:
 * - Persists selection in localStorage
 * - Updates URL parameters
 * - Accessible keyboard navigation
 * - Clear visual feedback
 */
export function ViewToggle({
  currentView,
  onViewChange,
  storageKey = 'application_view_mode',
  labels = {
    unit: 'By Unit',
    property: 'By Property',
  },
  className = '',
}: ViewToggleProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, currentView);
    }
  }, [currentView, storageKey]);

  const handleViewChange = (newView: ViewMode) => {
    // Update parent state
    onViewChange(newView);

    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (newView === 'unit') {
      params.set('view', 'unit');
    } else {
      params.delete('view'); // Default to property view
    }
    setSearchParams(params);
  };

  return (
    <div className={`inline-flex rounded-lg bg-gray-100 p-1 ${className}`}>
      <button
        type="button"
        onClick={() => handleViewChange('unit')}
        className={[
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          currentView === 'unit'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        ].join(' ')}
        aria-pressed={currentView === 'unit'}
        aria-label="View applications grouped by unit"
      >
        {labels.unit}
      </button>
      <button
        type="button"
        onClick={() => handleViewChange('property')}
        className={[
          'px-4 py-2 text-sm font-medium rounded-md transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          currentView === 'property'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        ].join(' ')}
        aria-pressed={currentView === 'property'}
        aria-label="View all applications in flat list"
      >
        {labels.property}
      </button>
    </div>
  );
}

/**
 * Hook to manage view toggle state with localStorage persistence
 * @param storageKey - Key for localStorage
 * @param defaultView - Default view if no saved preference
 * @returns Current view and setter function
 */
export function useViewToggle(
  storageKey: string = 'application_view_mode',
  defaultView: ViewMode = 'unit'
): [ViewMode, (view: ViewMode) => void] {
  const [searchParams] = useSearchParams();

  // Initialize from URL param or localStorage or default
  const getInitialView = (): ViewMode => {
    // Check URL first
    const urlView = searchParams.get('view');
    if (urlView === 'unit' || urlView === 'property') {
      return urlView;
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'unit' || saved === 'property') {
        return saved;
      }
    }

    return defaultView;
  };

  const [currentView, setCurrentView] = useState<ViewMode>(getInitialView);

  return [currentView, setCurrentView];
}
