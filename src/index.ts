// Core (framework-agnostic)
export { LogViewerCore } from './core/LogViewerCore';
export { parseAnsi, stripAnsi } from './core/AnsiParser';
export { SearchEngine } from './core/SearchEngine';
export { VirtualScroller } from './core/VirtualScroller';
export { parseLine, parseText } from './core/LineParser';

// Utils
export { predictLineHeight, predictHeightsBatch } from './utils/heightPredictor';
export { ChunkedLoader } from './utils/chunkedLoader';
export { LineIndex } from './utils/lineIndex';
export { countWrappedLines, wrapLine } from './utils/wordWrap';

// React
export { LogViewer } from './react/LogViewer';
export { LogLineComponent } from './react/LogLine';
export { SearchBar } from './react/SearchBar';
export { useLogViewer } from './react/hooks/useLogViewer';
export { useLogStream } from './react/hooks/useLogStream';

// Types
export type {
  StyledSegment,
  LogLine,
  LogLevel,
  FontConfig,
  LogViewerCoreOptions,
  SearchOptions,
  SearchResult,
  VisibleRange,
  LogViewerTheme,
  LogViewerProps,
} from './types';
