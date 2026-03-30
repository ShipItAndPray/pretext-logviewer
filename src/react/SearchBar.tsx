import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchResult } from '../types';

interface SearchBarProps {
  onSearch: (query: string, options: { regex: boolean; caseSensitive: boolean }) => void;
  resultCount: number;
  activeIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onClose: () => void;
}

export function SearchBar({
  onSearch,
  resultCount,
  activeIndex,
  onNavigate,
  onClose,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    onSearch(query, { regex, caseSensitive });
  }, [query, regex, caseSensitive, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNavigate(e.shiftKey ? 'prev' : 'next');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onNavigate, onClose],
  );

  return (
    <div
      className="plv-search-bar"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: '#1e1e1e',
        border: '1px solid #444',
        borderRadius: 4,
        zIndex: 10,
        fontSize: 13,
        color: '#ccc',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        style={{
          background: '#2d2d2d',
          border: '1px solid #555',
          color: '#eee',
          padding: '2px 6px',
          borderRadius: 3,
          outline: 'none',
          width: 200,
        }}
      />
      <button
        onClick={() => setCaseSensitive(!caseSensitive)}
        style={{
          background: caseSensitive ? '#555' : 'transparent',
          border: '1px solid #555',
          color: '#ccc',
          borderRadius: 3,
          padding: '1px 4px',
          cursor: 'pointer',
          fontSize: 12,
        }}
        title="Case Sensitive"
      >
        Aa
      </button>
      <button
        onClick={() => setRegex(!regex)}
        style={{
          background: regex ? '#555' : 'transparent',
          border: '1px solid #555',
          color: '#ccc',
          borderRadius: 3,
          padding: '1px 4px',
          cursor: 'pointer',
          fontSize: 12,
        }}
        title="Regex"
      >
        .*
      </button>
      <span style={{ minWidth: 60, textAlign: 'center' }}>
        {resultCount > 0 ? `${activeIndex + 1}/${resultCount}` : 'No results'}
      </span>
      <button onClick={() => onNavigate('prev')} style={navBtnStyle}>
        &#9650;
      </button>
      <button onClick={() => onNavigate('next')} style={navBtnStyle}>
        &#9660;
      </button>
      <button onClick={onClose} style={navBtnStyle}>
        &#10005;
      </button>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#ccc',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: 12,
};
