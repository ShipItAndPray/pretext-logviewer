import type { FontConfig } from '../types';
import { stripAnsi } from '../core/AnsiParser';

/**
 * Height predictor for log lines with word-wrap support.
 *
 * When @pretext/core is installed, this uses Pretext's measureText() for
 * accurate pre-render height calculation. Otherwise falls back to
 * character-width estimation.
 *
 * The key insight: with monospace fonts and known container width, we can
 * predict wrapped line heights without DOM measurement.
 */

let pretextMeasure: ((text: string, font: string, maxWidth: number) => number) | null = null;
let pretextLoaded = false;

/**
 * Attempt to load @pretext/core lazily on first use.
 */
function loadPretext(): void {
  if (pretextLoaded) return;
  pretextLoaded = true;
  try {
    // Synchronous require for optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pretext = require('@pretext/core');
    if (pretext?.measureText) {
      pretextMeasure = (text: string, font: string, maxWidth: number): number => {
        const result = pretext.measureText(text, { font, maxWidth });
        return result.height ?? result.lines * 20;
      };
    }
  } catch {
    // @pretext/core not installed, use fallback
  }
}

/**
 * Predict the rendered height of a single line of text,
 * considering word wrap at the given container width.
 */
export function predictLineHeight(
  rawLine: string,
  containerWidth: number,
  font: FontConfig,
  wordWrap: boolean,
): number {
  if (!wordWrap) return font.lineHeight;

  const plain = stripAnsi(rawLine);

  // Lazy-load pretext on first call
  loadPretext();

  // If pretext is available, use accurate measurement
  if (pretextMeasure) {
    const fontStr = `${font.size}px ${font.family}`;
    return pretextMeasure(plain, fontStr, containerWidth);
  }

  // Fallback: estimate using character width
  const charWidth = font.size * 0.6; // monospace approximation
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  const wrappedLines = plain.length === 0 ? 1 : Math.ceil(plain.length / charsPerLine);
  return Math.max(1, wrappedLines) * font.lineHeight;
}

/**
 * Batch-predict heights for a range of lines.
 * Optimized to minimize overhead when computing heights for hundreds of lines.
 */
export function predictHeightsBatch(
  rawLines: string[],
  startIndex: number,
  count: number,
  containerWidth: number,
  font: FontConfig,
  wordWrap: boolean,
): number[] {
  const heights: number[] = new Array(count);
  const end = Math.min(startIndex + count, rawLines.length);

  for (let i = startIndex; i < end; i++) {
    heights[i - startIndex] = predictLineHeight(
      rawLines[i],
      containerWidth,
      font,
      wordWrap,
    );
  }

  return heights;
}
