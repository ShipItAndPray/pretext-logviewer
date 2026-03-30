// ---- Styled segments (ANSI-parsed) ----

export interface StyledSegment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

// ---- Parsed log line ----

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogLine {
  number: number;
  raw: string;
  segments: StyledSegment[];
  timestamp?: Date;
  level?: LogLevel;
}

// ---- Configuration ----

export interface FontConfig {
  family: string;
  size: number;
  lineHeight: number;
}

export interface LogViewerCoreOptions {
  font?: FontConfig;
  containerWidth?: number;
  wordWrap?: boolean;
  parseAnsi?: boolean;
  detectTimestamps?: boolean;
  detectLevels?: boolean;
  maxLines?: number; // circular buffer for streaming
  overscan?: number; // lines to render above/below viewport
}

export interface SearchOptions {
  caseSensitive?: boolean;
  regex?: boolean;
  maxResults?: number;
}

export interface SearchResult {
  lineIndex: number;
  charStart: number;
  charEnd: number;
  matchText: string;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  lines: LogLine[];
  offsets: number[];
}

// ---- Theme ----

export interface LogViewerTheme {
  background: string;
  foreground: string;
  lineNumberColor: string;
  lineNumberBackground: string;
  selectionBackground: string;
  searchHighlight: string;
  searchActiveHighlight: string;
  levelColors: Record<LogLevel, string>;
  scrollbarThumb: string;
  scrollbarTrack: string;
}

// ---- React component props ----

export interface LogViewerProps {
  lines?: string[];
  text?: string;
  url?: string;
  stream?: ReadableStream<string>;
  height?: number | string;
  width?: number | string;
  fontSize?: number;
  fontFamily?: string;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  showTimestamps?: boolean;
  showLevelBadges?: boolean;
  searchable?: boolean;
  follow?: boolean;
  highlightLines?: number[];
  onLineClick?: (line: LogLine, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
  theme?: 'dark' | 'light' | LogViewerTheme;
}
