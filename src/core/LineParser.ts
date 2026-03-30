import type { LogLevel, LogLine } from '../types';
import { parseAnsi } from './AnsiParser';

/**
 * Timestamp detection patterns (covers ISO 8601, syslog, common log formats).
 */
const TIMESTAMP_RE =
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s/;
const SYSLOG_TS_RE =
  /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s/;

/**
 * Log level detection patterns.
 */
const LEVEL_RE = /\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRIT(?:ICAL)?)\b/i;

const LEVEL_MAP: Record<string, LogLevel> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  WARNING: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
  CRIT: 'fatal',
  CRITICAL: 'fatal',
};

export interface ParseOptions {
  parseAnsiCodes?: boolean;
  detectTimestamps?: boolean;
  detectLevels?: boolean;
}

/**
 * Parse a raw line string into a structured LogLine.
 */
export function parseLine(
  raw: string,
  lineNumber: number,
  options: ParseOptions = {},
): LogLine {
  const {
    parseAnsiCodes = true,
    detectTimestamps = true,
    detectLevels = true,
  } = options;

  const line: LogLine = {
    number: lineNumber,
    raw,
    segments: parseAnsiCodes ? parseAnsi(raw) : [{ text: raw }],
  };

  if (detectTimestamps) {
    const isoMatch = raw.match(TIMESTAMP_RE);
    if (isoMatch) {
      const d = new Date(isoMatch[1]);
      if (!isNaN(d.getTime())) line.timestamp = d;
    } else {
      const sysMatch = raw.match(SYSLOG_TS_RE);
      if (sysMatch) {
        const d = new Date(sysMatch[1]);
        if (!isNaN(d.getTime())) line.timestamp = d;
      }
    }
  }

  if (detectLevels) {
    const m = raw.match(LEVEL_RE);
    if (m) {
      line.level = LEVEL_MAP[m[1].toUpperCase()] ?? 'info';
    }
  }

  return line;
}

/**
 * Parse text blob into lines.
 */
export function parseText(
  text: string,
  options?: ParseOptions,
): LogLine[] {
  const rawLines = text.split('\n');
  return rawLines.map((raw, i) => parseLine(raw, i + 1, options));
}
