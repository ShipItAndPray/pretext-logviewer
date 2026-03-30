import React from 'react';
import type { LogLine as LogLineType, StyledSegment, LogLevel } from '../types';

interface LogLineProps {
  line: LogLineType;
  offsetTop: number;
  showLineNumbers: boolean;
  showLevelBadge: boolean;
  highlighted: boolean;
  searchHighlights?: { start: number; end: number }[];
  onClick?: (line: LogLineType, index: number) => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#6b7280',
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
  fatal: '#dc2626',
};

function segmentStyle(seg: StyledSegment): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (seg.color) s.color = seg.color;
  if (seg.bgColor) s.backgroundColor = seg.bgColor;
  if (seg.bold) s.fontWeight = 'bold';
  if (seg.italic) s.fontStyle = 'italic';
  if (seg.underline) s.textDecoration = 'underline';
  if (seg.dim) s.opacity = 0.5;
  if (seg.strikethrough) {
    s.textDecoration = s.textDecoration
      ? `${s.textDecoration} line-through`
      : 'line-through';
  }
  return s;
}

export const LogLineComponent = React.memo(function LogLineComponent({
  line,
  offsetTop,
  showLineNumbers,
  showLevelBadge,
  highlighted,
  onClick,
}: LogLineProps) {
  const handleClick = onClick
    ? () => onClick(line, line.number - 1)
    : undefined;

  return (
    <div
      className="plv-line"
      style={{
        position: 'absolute',
        top: offsetTop,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'flex-start',
        padding: '0 8px',
        backgroundColor: highlighted ? 'rgba(255,255,0,0.1)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
      onClick={handleClick}
    >
      {showLineNumbers && (
        <span
          className="plv-line-number"
          style={{
            display: 'inline-block',
            minWidth: 50,
            textAlign: 'right',
            paddingRight: 12,
            color: '#6b7280',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {line.number}
        </span>
      )}
      {showLevelBadge && line.level && (
        <span
          className="plv-level-badge"
          style={{
            display: 'inline-block',
            width: 48,
            textAlign: 'center',
            fontSize: '0.75em',
            fontWeight: 600,
            color: '#fff',
            backgroundColor: LEVEL_COLORS[line.level],
            borderRadius: 3,
            marginRight: 8,
            flexShrink: 0,
            lineHeight: '1.5em',
          }}
        >
          {line.level.toUpperCase()}
        </span>
      )}
      <span className="plv-line-content" style={{ flex: 1 }}>
        {line.segments.map((seg, i) => (
          <span key={i} style={segmentStyle(seg)}>
            {seg.text}
          </span>
        ))}
      </span>
    </div>
  );
});
