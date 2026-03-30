import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  LogLine,
  LogViewerProps,
  LogViewerTheme,
  SearchResult,
  VisibleRange,
} from '../types';
import { LogViewerCore } from '../core/LogViewerCore';
import { SearchEngine } from '../core/SearchEngine';
import { LogLineComponent } from './LogLine';
import { SearchBar } from './SearchBar';
import { ChunkedLoader } from '../utils/chunkedLoader';

const DARK_THEME: LogViewerTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  lineNumberColor: '#6b7280',
  lineNumberBackground: '#1e1e1e',
  selectionBackground: '#264f78',
  searchHighlight: '#613214',
  searchActiveHighlight: '#9e6a03',
  levelColors: {
    debug: '#6b7280',
    info: '#3b82f6',
    warn: '#f59e0b',
    error: '#ef4444',
    fatal: '#dc2626',
  },
  scrollbarThumb: '#555',
  scrollbarTrack: '#1e1e1e',
};

const LIGHT_THEME: LogViewerTheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  lineNumberColor: '#999',
  lineNumberBackground: '#f5f5f5',
  selectionBackground: '#add6ff',
  searchHighlight: '#fde68a',
  searchActiveHighlight: '#fbbf24',
  levelColors: {
    debug: '#6b7280',
    info: '#2563eb',
    warn: '#d97706',
    error: '#dc2626',
    fatal: '#b91c1c',
  },
  scrollbarThumb: '#ccc',
  scrollbarTrack: '#f5f5f5',
};

function resolveTheme(
  theme: 'dark' | 'light' | LogViewerTheme | undefined,
): LogViewerTheme {
  if (!theme || theme === 'dark') return DARK_THEME;
  if (theme === 'light') return LIGHT_THEME;
  return theme;
}

/**
 * React component for rendering large log files with virtualized scrolling.
 */
export const LogViewer = React.memo(function LogViewer(props: LogViewerProps) {
  const {
    lines: propLines,
    text,
    url,
    stream,
    height = 600,
    width = '100%',
    fontSize = 14,
    fontFamily = "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    wordWrap = false,
    showLineNumbers = true,
    showTimestamps = false,
    showLevelBadges = true,
    searchable = true,
    follow = false,
    highlightLines,
    onLineClick,
    className,
    style,
    theme,
  } = props;

  const resolvedTheme = resolveTheme(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<LogViewerCore | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(follow);
  const highlightSet = new Set(highlightLines ?? []);
  const searchHighlightMap = useRef(new Map<number, { start: number; end: number }[]>());

  // Initialize core
  if (!coreRef.current) {
    coreRef.current = new LogViewerCore({
      font: { family: fontFamily, size: fontSize, lineHeight: Math.round(fontSize * 1.5) },
      wordWrap,
      parseAnsi: true,
      detectLevels: showLevelBadges,
      detectTimestamps: showTimestamps,
    });
  }

  const core = coreRef.current;

  // Load data
  useEffect(() => {
    if (text != null) {
      core.loadText(text);
    } else if (propLines) {
      core.loadLines(propLines);
    }
    setTotalHeight(core.getTotalHeight());
    updateVisible();
  }, [text, propLines]);

  // URL loading
  useEffect(() => {
    if (!url) return;
    const loader = new ChunkedLoader();
    loader.load(url, {
      onLines: (newLines) => {
        core.appendLines(newLines);
        setTotalHeight(core.getTotalHeight());
        if (isFollowing) {
          scrollToBottom();
        }
        updateVisible();
      },
    });
    return () => loader.abort();
  }, [url]);

  // Container width tracking
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        core.setContainerWidth(entry.contentRect.width);
        setTotalHeight(core.getTotalHeight());
        updateVisible();
      }
    });
    ro.observe(el);
    core.setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Word wrap changes
  useEffect(() => {
    core.setWordWrap(wordWrap);
    setTotalHeight(core.getTotalHeight());
    updateVisible();
  }, [wordWrap]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && searchable) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchable]);

  const updateVisible = useCallback(() => {
    const el = containerRef.current;
    if (!el || !core) return;
    const range = core.getVisibleRange(el.scrollTop, el.clientHeight);
    setVisibleRange(range);
  }, [core]);

  const handleScroll = useCallback(() => {
    updateVisible();
    // Detect if user scrolled away from bottom
    const el = containerRef.current;
    if (el && follow) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setIsFollowing(atBottom);
    }
  }, [updateVisible, follow]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Follow mode: auto-scroll on new lines
  useEffect(() => {
    if (isFollowing) {
      scrollToBottom();
    }
  }, [totalHeight, isFollowing]);

  // Search handlers
  const handleSearch = useCallback(
    (query: string, opts: { regex: boolean; caseSensitive: boolean }) => {
      const results = core.search(query, {
        regex: opts.regex,
        caseSensitive: opts.caseSensitive,
      });
      setSearchResults(results);
      setActiveSearchIndex(0);
      searchHighlightMap.current = SearchEngine.buildHighlightIndex(results);
      updateVisible();
      // Scroll to first result
      if (results.length > 0) {
        const el = containerRef.current;
        if (el) {
          el.scrollTop = core.scrollToLine(results[0].lineIndex);
          updateVisible();
        }
      }
    },
    [core, updateVisible],
  );

  const handleSearchNavigate = useCallback(
    (dir: 'next' | 'prev') => {
      if (searchResults.length === 0) return;
      let next = activeSearchIndex + (dir === 'next' ? 1 : -1);
      if (next >= searchResults.length) next = 0;
      if (next < 0) next = searchResults.length - 1;
      setActiveSearchIndex(next);
      const el = containerRef.current;
      if (el) {
        el.scrollTop = core.scrollToLine(searchResults[next].lineIndex);
        updateVisible();
      }
    },
    [searchResults, activeSearchIndex, core, updateVisible],
  );

  const handleSearchClose = useCallback(() => {
    setShowSearch(false);
    setSearchResults([]);
    searchHighlightMap.current.clear();
    updateVisible();
  }, [updateVisible]);

  const lineHeight = Math.round(fontSize * 1.5);

  return (
    <div
      className={`plv-container ${className ?? ''}`}
      style={{
        position: 'relative',
        height,
        width,
        fontFamily,
        fontSize,
        lineHeight: `${lineHeight}px`,
        background: resolvedTheme.background,
        color: resolvedTheme.foreground,
        overflow: 'hidden',
        ...style,
      }}
    >
      {showSearch && (
        <SearchBar
          onSearch={handleSearch}
          resultCount={searchResults.length}
          activeIndex={activeSearchIndex}
          onNavigate={handleSearchNavigate}
          onClose={handleSearchClose}
        />
      )}
      <div
        ref={containerRef}
        className="plv-scroll-container"
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div
          className="plv-content"
          style={{
            height: totalHeight,
            position: 'relative',
          }}
        >
          {visibleRange?.lines.map((line, i) => (
            <LogLineComponent
              key={visibleRange.startIndex + i}
              line={line}
              offsetTop={visibleRange.offsets[i]}
              showLineNumbers={showLineNumbers}
              showLevelBadge={showLevelBadges}
              highlighted={highlightSet.has(visibleRange.startIndex + i)}
              searchHighlights={searchHighlightMap.current.get(visibleRange.startIndex + i)}
              onClick={onLineClick}
            />
          ))}
        </div>
      </div>
      {follow && !isFollowing && (
        <button
          onClick={() => {
            setIsFollowing(true);
            scrollToBottom();
          }}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '6px 12px',
            background: '#333',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            zIndex: 10,
          }}
        >
          Jump to bottom
        </button>
      )}
    </div>
  );
});
