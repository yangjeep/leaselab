/**
 * InternalNotes - Display and manage internal notes on applications
 * Supports categorization, priority, and tagging
 */

import type { ApplicationInternalNote } from '~/shared/types';
import { useState } from 'react';

type NoteCategory = NonNullable<ApplicationInternalNote['noteCategory']>;
type NotePriority = NonNullable<ApplicationInternalNote['priority']>;

type InternalNotesProps = {
  notes: ApplicationInternalNote[];
  applicationId: string;
  currentUserId: string;
  onAddNote?: (data: { noteText: string; noteCategory: string; priority: string; isSensitive: boolean }) => void;
  onUpdateNote?: (noteId: string, updates: Partial<ApplicationInternalNote>) => void;
  onDeleteNote?: (noteId: string) => void;
  isReadOnly?: boolean;
};

export function InternalNotes({
  notes,
  applicationId,
  currentUserId,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isReadOnly = false,
}: InternalNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>('general');
  const [newNotePriority, setNewNotePriority] = useState<NotePriority>('low');
  const [newNoteIsSensitive, setNewNoteIsSensitive] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | NoteCategory>('all');

  const categories: { value: NoteCategory; label: string; color: string }[] = [
    { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
    { value: 'documents', label: 'Documents', color: 'bg-blue-100 text-blue-800' },
    { value: 'ai_screening', label: 'AI Screening', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'background_check', label: 'Background Check', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'decision', label: 'Decision', color: 'bg-green-100 text-green-800' },
    { value: 'lease_prep', label: 'Lease Prep', color: 'bg-purple-100 text-purple-800' },
  ];

  const priorities: { value: NotePriority; label: string; icon: string }[] = [
    { value: 'low', label: 'Low', icon: '○' },
    { value: 'medium', label: 'Medium', icon: '◐' },
    { value: 'high', label: 'High', icon: '◉' },
    { value: 'urgent', label: 'Urgent', icon: '⚠' },
  ];

  const filteredNotes = filterCategory === 'all'
    ? notes
    : notes.filter(note => note.noteCategory === filterCategory);

  const handleAddNote = () => {
    if (onAddNote && newNoteText.trim()) {
      onAddNote({
        noteText: newNoteText,
        noteCategory: newNoteCategory,
        priority: newNotePriority,
        isSensitive: newNoteIsSensitive,
      });
      setNewNoteText('');
      setNewNoteCategory('general');
      setNewNotePriority('low');
      setNewNoteIsSensitive(false);
      setIsAdding(false);
    }
  };

  const getCategoryColor = (category: ApplicationInternalNote['noteCategory']) => {
    return categories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority: ApplicationInternalNote['priority']) => {
    return priorities.find(p => p.value === priority)?.icon || '○';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Internal Notes</h3>
          <span className="text-sm text-gray-500">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
          >
            {isAdding ? 'Cancel' : '+ Add Note'}
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({notes.length})
        </button>
        {categories.map(cat => {
          const count = notes.filter(n => n.noteCategory === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterCategory === cat.value
                  ? cat.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Write your note here..."
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={newNoteCategory}
                onChange={(e) => setNewNoteCategory(e.target.value as NoteCategory)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newNotePriority}
                onChange={(e) => setNewNotePriority(e.target.value as NotePriority)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newNoteIsSensitive}
                onChange={(e) => setNewNoteIsSensitive(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700">
                Mark as sensitive (restricted visibility)
              </span>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewNoteText('');
                setNewNoteCategory('general');
                setNewNotePriority('low');
                setNewNoteIsSensitive(false);
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">
            {filterCategory === 'all' ? 'No notes yet' : `No ${filterCategory} notes`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`bg-white border rounded-lg p-4 ${
                note.priority === 'urgent' ? 'border-red-300 bg-red-50' :
                note.priority === 'high' ? 'border-yellow-300 bg-yellow-50' :
                'border-gray-200'
              }`}
            >
              {/* Note Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getPriorityIcon(note.priority)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(note.noteCategory)}`}>
                    {categories.find(c => c.value === note.noteCategory)?.label}
                  </span>
                  {note.isSensitive && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                      🔒 Sensitive
                    </span>
                  )}
                </div>

                {!isReadOnly && note.createdBy === currentUserId && onDeleteNote && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this note?')) {
                        onDeleteNote(note.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Note Content */}
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.noteText}</p>

              {/* Note Footer */}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>By {note.createdBy}</span>
                <span>•</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
                {note.updatedAt !== note.createdAt && (
                  <>
                    <span>•</span>
                    <span>Edited {new Date(note.updatedAt).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
