/**
 * useMultiSelect Hook
 * Manages multi-select state for applications with unit-scoping validation
 */

import { useState, useCallback } from 'react';

export interface MultiSelectState {
  selectedIds: string[];
  selectedUnitId: string | null;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string, unitId: string | undefined) => void;
  selectAll: (ids: string[], unitId: string | undefined) => void;
  clearSelection: () => void;
  hasSelection: boolean;
  count: number;
}

export function useMultiSelect(): MultiSelectState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.includes(id);
    },
    [selectedIds]
  );

  const toggleSelection = useCallback(
    (id: string, unitId: string | undefined) => {
      setSelectedIds((current) => {
        const isCurrentlySelected = current.includes(id);

        if (isCurrentlySelected) {
          // Deselecting - remove from list
          const newSelection = current.filter((selectedId) => selectedId !== id);

          // If no more selections, clear unit restriction
          if (newSelection.length === 0) {
            setSelectedUnitId(null);
          }

          return newSelection;
        } else {
          // Selecting - check unit scoping
          if (selectedUnitId === null) {
            // First selection - set the unit restriction
            setSelectedUnitId(unitId || null);
            return [...current, id];
          } else if (selectedUnitId === unitId) {
            // Same unit - allow selection
            return [...current, id];
          } else {
            // Different unit - clear previous selections and start new
            setSelectedUnitId(unitId || null);
            return [id];
          }
        }
      });
    },
    [selectedUnitId]
  );

  const selectAll = useCallback((ids: string[], unitId: string | undefined) => {
    setSelectedIds(ids);
    setSelectedUnitId(unitId || null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedUnitId(null);
  }, []);

  return {
    selectedIds,
    selectedUnitId,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    hasSelection: selectedIds.length > 0,
    count: selectedIds.length,
  };
}
