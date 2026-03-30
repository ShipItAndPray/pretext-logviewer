import type { StyledSegment } from '../types';

/**
 * ANSI SGR (Select Graphic Rendition) parser.
 * Converts raw text with ANSI escape codes into styled segments.
 *
 * Handles: reset, bold, dim, italic, underline, strikethrough, inverse,
 * 16-color, 256-color, and 24-bit RGB foreground/background.
 */

interface AnsiState {
  color?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

// Standard 16 ANSI colors (normal + bright)
const ANSI_COLORS: string[] = [
  '#000000', '#cc0000', '#00cc00', '#cccc00', '#0000cc', '#cc00cc', '#00cccc', '#cccccc', // 0-7
  '#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff', // 8-15
];

// ESC[ ... m  pattern — matches SGR sequences
const SGR_RE = /\x1b\[([0-9;]*)m/g;

// Strips all escape sequences (SGR + non-SGR like cursor movement)
const ALL_ESC_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

function parse256Color(params: number[], idx: number): { color: string; next: number } | null {
  if (params[idx] !== 5 || idx + 1 >= params.length) return null;
  const n = params[idx + 1];
  if (n < 16) {
    return { color: ANSI_COLORS[n], next: idx + 2 };
  }
  if (n < 232) {
    const v = n - 16;
    const r = Math.floor(v / 36) * 51;
    const g = (Math.floor(v / 6) % 6) * 51;
    const b = (v % 6) * 51;
    return { color: `rgb(${r},${g},${b})`, next: idx + 2 };
  }
  // Grayscale 232-255
  const gray = (n - 232) * 10 + 8;
  return { color: `rgb(${gray},${gray},${gray})`, next: idx + 2 };
}

function parse24BitColor(params: number[], idx: number): { color: string; next: number } | null {
  if (params[idx] !== 2 || idx + 3 >= params.length) return null;
  const r = params[idx + 1];
  const g = params[idx + 2];
  const b = params[idx + 3];
  return { color: `rgb(${r},${g},${b})`, next: idx + 4 };
}

function applyParams(state: AnsiState, params: number[]): void {
  let i = 0;
  while (i < params.length) {
    const p = params[i];
    switch (p) {
      case 0: // Reset
        state.color = undefined;
        state.bgColor = undefined;
        state.bold = undefined;
        state.italic = undefined;
        state.underline = undefined;
        state.dim = undefined;
        state.strikethrough = undefined;
        state.inverse = undefined;
        i++;
        break;
      case 1: state.bold = true; i++; break;
      case 2: state.dim = true; i++; break;
      case 3: state.italic = true; i++; break;
      case 4: state.underline = true; i++; break;
      case 7: state.inverse = true; i++; break;
      case 9: state.strikethrough = true; i++; break;
      case 22: state.bold = undefined; state.dim = undefined; i++; break;
      case 23: state.italic = undefined; i++; break;
      case 24: state.underline = undefined; i++; break;
      case 27: state.inverse = undefined; i++; break;
      case 29: state.strikethrough = undefined; i++; break;
      case 39: state.color = undefined; i++; break;
      case 49: state.bgColor = undefined; i++; break;
      default:
        // Foreground 30-37
        if (p >= 30 && p <= 37) {
          state.color = ANSI_COLORS[p - 30];
          i++;
        }
        // Bright foreground 90-97
        else if (p >= 90 && p <= 97) {
          state.color = ANSI_COLORS[p - 90 + 8];
          i++;
        }
        // Background 40-47
        else if (p >= 40 && p <= 47) {
          state.bgColor = ANSI_COLORS[p - 40];
          i++;
        }
        // Bright background 100-107
        else if (p >= 100 && p <= 107) {
          state.bgColor = ANSI_COLORS[p - 100 + 8];
          i++;
        }
        // 256-color / 24-bit foreground
        else if (p === 38) {
          i++;
          const c256 = parse256Color(params, i);
          if (c256) { state.color = c256.color; i = c256.next; break; }
          const c24 = parse24BitColor(params, i);
          if (c24) { state.color = c24.color; i = c24.next; break; }
          i++;
        }
        // 256-color / 24-bit background
        else if (p === 48) {
          i++;
          const c256 = parse256Color(params, i);
          if (c256) { state.bgColor = c256.color; i = c256.next; break; }
          const c24 = parse24BitColor(params, i);
          if (c24) { state.bgColor = c24.color; i = c24.next; break; }
          i++;
        }
        else {
          i++;
        }
        break;
    }
  }
}

function stateToSegmentProps(state: AnsiState): Partial<StyledSegment> {
  const props: Partial<StyledSegment> = {};
  if (state.inverse) {
    if (state.color) props.bgColor = state.color;
    if (state.bgColor) props.color = state.bgColor;
    if (!state.color) props.bgColor = '#cccccc';
    if (!state.bgColor) props.color = '#000000';
  } else {
    if (state.color) props.color = state.color;
    if (state.bgColor) props.bgColor = state.bgColor;
  }
  if (state.bold) props.bold = true;
  if (state.italic) props.italic = true;
  if (state.underline) props.underline = true;
  if (state.dim) props.dim = true;
  if (state.strikethrough) props.strikethrough = true;
  return props;
}

/**
 * Parse a single line of text with ANSI escape codes into styled segments.
 */
export function parseAnsi(input: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  const state: AnsiState = {};
  let lastIndex = 0;

  SGR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SGR_RE.exec(input)) !== null) {
    // Text before this escape sequence
    if (match.index > lastIndex) {
      const text = input.slice(lastIndex, match.index);
      if (text) {
        segments.push({ text, ...stateToSegmentProps(state) });
      }
    }
    // Parse SGR parameters
    const paramStr = match[1] || '0';
    const params = paramStr.split(';').map(Number);
    applyParams(state, params);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last escape sequence
  const remaining = input.slice(lastIndex);
  // Strip any non-SGR escape codes from the remaining text
  const cleaned = remaining.replace(ALL_ESC_RE, '');
  if (cleaned) {
    segments.push({ text: cleaned, ...stateToSegmentProps(state) });
  }

  // If no segments, return a single plain segment
  if (segments.length === 0) {
    return [{ text: input.replace(ALL_ESC_RE, '') }];
  }

  return segments;
}

/**
 * Strip all ANSI escape codes from text. Returns plain text.
 */
export function stripAnsi(input: string): string {
  return input.replace(ALL_ESC_RE, '');
}
