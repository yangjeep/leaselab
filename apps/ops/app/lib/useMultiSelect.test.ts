/**
 * Unit tests for useMultiSelect hook
 * Tests multi-select state management with unit-scoping validation
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from './useMultiSelect';

describe('useMultiSelect', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useMultiSelect());

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedUnitId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('should toggle selection on', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    expect(result.current.selectedIds).toEqual(['app_1']);
    expect(result.current.selectedUnitId).toBe('unit_101');
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected('app_1')).toBe(true);
  });

  it('should toggle selection off', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedUnitId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected('app_1')).toBe(false);
  });

  it('should allow multiple selections from same unit', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    act(() => {
      result.current.toggleSelection('app_2', 'unit_101');
    });

    expect(result.current.selectedIds).toEqual(['app_1', 'app_2']);
    expect(result.current.selectedUnitId).toBe('unit_101');
    expect(result.current.count).toBe(2);
  });

  it('should clear previous selections when selecting from different unit', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    act(() => {
      result.current.toggleSelection('app_2', 'unit_101');
    });

    // Select from different unit - should clear previous selections
    act(() => {
      result.current.toggleSelection('app_3', 'unit_102');
    });

    expect(result.current.selectedIds).toEqual(['app_3']);
    expect(result.current.selectedUnitId).toBe('unit_102');
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected('app_1')).toBe(false);
    expect(result.current.isSelected('app_2')).toBe(false);
    expect(result.current.isSelected('app_3')).toBe(true);
  });

  it('should handle undefined unit ID', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', undefined);
    });

    expect(result.current.selectedIds).toEqual(['app_1']);
    expect(result.current.selectedUnitId).toBeNull();
    expect(result.current.count).toBe(1);
  });

  it('should selectAll with unit ID', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.selectAll(['app_1', 'app_2', 'app_3'], 'unit_101');
    });

    expect(result.current.selectedIds).toEqual(['app_1', 'app_2', 'app_3']);
    expect(result.current.selectedUnitId).toBe('unit_101');
    expect(result.current.count).toBe(3);
  });

  it('should clearSelection', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.selectAll(['app_1', 'app_2'], 'unit_101');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedUnitId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('should clear unit restriction when last item is deselected', () => {
    const { result } = renderHook(() => useMultiSelect());

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    expect(result.current.selectedUnitId).toBe('unit_101');

    act(() => {
      result.current.toggleSelection('app_1', 'unit_101');
    });

    expect(result.current.selectedUnitId).toBeNull();
  });
});
