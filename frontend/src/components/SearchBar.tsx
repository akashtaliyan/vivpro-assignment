import React, { useState } from 'react';
import { Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Song } from '../types';

interface SearchBarProps {
  onSearch: (title: string) => void;
  onClear: () => void;
  searchResults: Song[] | null;
  searchQuery: string;
  isSearching: boolean;
}

export default function SearchBar({
  onSearch,
  onClear,
  searchResults,
  searchQuery,
  isSearching
}: SearchBarProps) {
  const [inputVal, setInputVal] = useState<string>(searchQuery || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const handleReset = () => {
    setInputVal('');
    onClear();
  };

  return (
    <div style={{ width: '100%', marginBottom: '1.5rem' }}>
      <form onSubmit={handleSubmit} className="search-box" style={{ maxWidth: '100%' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-primary"
            style={{ paddingLeft: '2.5rem', paddingRight: '2rem' }}
            placeholder="Search by title (e.g. 'Perfect', '3AM', 'yesterday')..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSearching || !inputVal.trim()}>
          {isSearching ? 'Searching...' : 'Get Song'}
        </button>
        {searchResults !== null && (
          <button type="button" onClick={handleReset} className="btn btn-secondary">
            Reset
          </button>
        )}
      </form>

      {/* Feedback Alert for Search State */}
      {searchResults !== null && (
        <div style={{ marginTop: '0.75rem' }}>
          {searchResults.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.5rem',
                color: '#f87171',
                fontSize: '0.875rem'
              }}
            >
              <AlertCircle size={18} />
              <span>
                <strong>No match found:</strong> No song matched "<em>{searchQuery}</em>". Please check spelling or casing.
              </span>
            </div>
          ) : searchResults.length > 1 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '0.5rem',
                color: '#fbbf24',
                fontSize: '0.875rem'
              }}
            >
              <CheckCircle2 size={18} />
              <span>
                <strong>Multiple matches found ({searchResults.length}):</strong> Found {searchResults.length} distinct songs for "<em>{searchQuery}</em>" (demonstrating proper handling of non-unique titles).
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '0.5rem',
                color: '#34d399',
                fontSize: '0.875rem'
              }}
            >
              <CheckCircle2 size={18} />
              <span>
                Found exact match for "<em>{searchResults[0].title}</em>" (ID: <code>{searchResults[0].id}</code>).
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
