/**
 * StageChecker - Checklist component for stage gating
 * Displays required items that must be completed before advancing to next stage
 */

import { useState } from 'react';

export type ChecklistItem = {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  checked: boolean;
  link?: {
    label: string;
    href: string;
  };
};

type StageCheckerProps = {
  title: string;
  description?: string;
  items: ChecklistItem[];
  onItemToggle: (itemId: string, checked: boolean) => void;
  showProgress?: boolean;
};

export function StageChecker({
  title,
  description,
  items,
  onItemToggle,
  showProgress = true,
}: StageCheckerProps) {
  const requiredItems = items.filter((item) => item.required);
  const completedRequired = requiredItems.filter((item) => item.checked).length;
  const totalRequired = requiredItems.length;
  const allRequiredComplete = completedRequired === totalRequired;

  const optionalItems = items.filter((item) => !item.required);
  const completedOptional = optionalItems.filter((item) => item.checked).length;

  const progressPercent = totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {allRequiredComplete ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Complete
            </span>
          ) : (
            <span className="text-sm text-gray-600">
              {completedRequired} / {totalRequired} required
            </span>
          )}
        </div>

        {description && <p className="text-sm text-gray-600">{description}</p>}

        {/* Progress Bar */}
        {showProgress && totalRequired > 0 && (
          <div className="mt-3">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${progressPercent}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${
                  allRequiredComplete ? 'bg-green-500' : 'bg-indigo-600'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Checklist Items */}
      <div className="p-4">
        {/* Required Items */}
        {requiredItems.length > 0 && (
          <div className="space-y-3">
            {requiredItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={(checked) => onItemToggle(item.id, checked)}
              />
            ))}
          </div>
        )}

        {/* Optional Items */}
        {optionalItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Optional ({completedOptional} / {optionalItems.length})
            </h4>
            <div className="space-y-3">
              {optionalItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={(checked) => onItemToggle(item.id, checked)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Checkbox */}
      <input
        type="checkbox"
        id={`checklist-${item.id}`}
        checked={item.checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`checklist-${item.id}`}
          className={`block text-sm font-medium cursor-pointer ${
            item.checked ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}
        >
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {item.description && (
          <p className={`mt-1 text-xs ${item.checked ? 'text-gray-400' : 'text-gray-600'}`}>
            {item.description}
          </p>
        )}

        {item.link && (
          <a
            href={item.link.href}
            className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {item.link.label} →
          </a>
        )}
      </div>
    </div>
  );
}
