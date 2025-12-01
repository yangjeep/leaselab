import { useSearchParams } from '@remix-run/react';

interface SortableTableHeaderProps {
  column: string;
  label: string;
  className?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export function SortableTableHeader({
  column,
  label,
  className = '',
  defaultSortOrder = 'asc'
}: SortableTableHeaderProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSortBy = searchParams.get('sortBy');
  const currentSortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

  const isActive = currentSortBy === column;
  const nextSortOrder = isActive
    ? (currentSortOrder === 'asc' ? 'desc' : 'asc')
    : defaultSortOrder;

  const handleSort = () => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', column);
    params.set('sortOrder', nextSortOrder);
    setSearchParams(params);
  };

  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={handleSort}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="text-gray-400">
          {isActive ? (
            currentSortOrder === 'asc' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )
          ) : (
            <svg className="w-4 h-4 opacity-0 group-hover:opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </span>
      </div>
    </th>
  );
}

interface NonSortableTableHeaderProps {
  label: string;
  className?: string;
}

export function NonSortableTableHeader({ label, className = '' }: NonSortableTableHeaderProps) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      {label}
    </th>
  );
}
