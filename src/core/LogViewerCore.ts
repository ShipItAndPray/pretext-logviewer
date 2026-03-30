import type {
  FontConfig,
  LogLine,
  LogViewerCoreOptions,
  SearchOptions,
  SearchResult,
  VisibleRange,
} from '../types';
import { parseLine, type ParseOptions } from './LineParser';
import { SearchEngine } from './SearchEngine';
import { VirtualScroller } from './VirtualScroller';
import { stripAnsi } from './AnsiParser';

/**
 * Framework-agnostic log viewer core engine.
 *
 * Manages line storage, ANSI parsing, height prediction,
 * virtual scrolling, and search across potentially millions of lines.
 */
export class LogViewerCore {
  private rawLines: string[] = [];
  private parsedLines: LogLine[] = [];
  private scroller: VirtualScroller;
  private searchEngine: SearchEngine;
  private parseOpts: ParseOptions;
  private maxLines: number;
  private circularStart = 0; // start index for circular buffer
  private containerWidth: number;
  private wordWrap: boolean;
  private font: FontConfig;
  private charWidth = 8; // estimated monospace character width
  private destroyed = false;

  constructor(options: LogViewerCoreOptions = {}) {
    const defaultLineHeight = options.font?.lineHeight ?? 20;
    this.scroller = new VirtualScroller({
      defaultHeight: defaultLineHeight,
      overscan: options.overscan ?? 20,
    });
    this.searchEngine = new SearchEngine();
    this.parseOpts = {
      parseAnsiCodes: options.parseAnsi ?? true,
      detectTimestamps: options.detectTimestamps ?? false,
      detectLevels: options.detectLevels ?? true,
    };
    this.maxLines = options.maxLines ?? Infinity;
    this.containerWidth = options.containerWidth ?? 800;
    this.wordWrap = options.wordWrap ?? false;
    this.font = options.font ?? { family: 'monospace', size: 14, lineHeight: 20 };
    this.charWidth = this.font.size * 0.6; // rough monospace estimate
  }

  /**
   * Load a full text blob (splits by newline).
   */
  loadText(text: string): void {
    this.rawLines = text.split('\n');
    this.rebuild();
  }

  /**
   * Load an array of lines directly.
   */
  loadLines(lines: string[]): void {
    this.rawLines = [...lines];
    this.rebuild();
  }

  /**
   * Append a single line (streaming mode).
   */
  appendLine(line: string): void {
    if (this.rawLines.length >= this.maxLines && this.maxLines !== Infinity) {
      // Circular buffer: overwrite oldest
      const idx = this.circularStart % this.maxLines;
      this.rawLines[idx] = line;
      this.parsedLines[idx] = parseLine(line, this.circularStart + 1, this.parseOpts);
      this.circularStart++;
      this.updateLineHeight(idx);
    } else {
      this.rawLines.push(line);
      const parsed = parseLine(line, this.rawLines.length, this.parseOpts);
      this.parsedLines.push(parsed);
      this.scroller.setCount(this.rawLines.length);
      this.updateLineHeight(this.rawLines.length - 1);
    }
    this.searchEngine.setLines(this.rawLines);
  }

  /**
   * Append multiple lines at once.
   */
  appendLines(lines: string[]): void {
    for (const line of lines) {
      this.appendLine(line);
    }
  }

  /**
   * Get the visible range of lines for rendering.
   */
  getVisibleRange(scrollTop: number, viewportHeight: number): VisibleRange {
    const range = this.scroller.getVisibleRange(scrollTop, viewportHeight);
    const lines: LogLine[] = [];
    for (let i = range.startIndex; i <= range.endIndex && i < this.parsedLines.length; i++) {
      lines.push(this.parsedLines[i]);
    }
    return {
      startIndex: range.startIndex,
      endIndex: range.endIndex,
      lines,
      offsets: range.offsets,
    };
  }

  /**
   * Search all lines.
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    this.searchEngine.cancel();
    return this.searchEngine.search(query, options);
  }

  /**
   * Async search for very large files.
   */
  async searchAsync(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    this.searchEngine.cancel();
    return this.searchEngine.searchAsync(query, options);
  }

  /**
   * Total scrollable content height in pixels.
   */
  getTotalHeight(): number {
    return this.scroller.getTotalHeight();
  }

  /**
   * Pixel offset of a specific line.
   */
  getLineOffset(index: number): number {
    return this.scroller.getOffset(index);
  }

  /**
   * Scroll to a line. Returns the scrollTop value.
   */
  scrollToLine(index: number): number {
    return this.scroller.scrollToLine(index);
  }

  /**
   * Update container width (recalculates word-wrap heights).
   */
  setContainerWidth(width: number): void {
    this.containerWidth = width;
    if (this.wordWrap) {
      this.recalcAllHeights();
    }
  }

  /**
   * Update font config.
   */
  setFont(font: FontConfig): void {
    this.font = font;
    this.charWidth = font.size * 0.6;
    this.scroller = new VirtualScroller({
      defaultHeight: font.lineHeight,
      overscan: 20,
    });
    this.scroller.setCount(this.rawLines.length);
    this.recalcAllHeights();
  }

  /**
   * Toggle word wrap.
   */
  setWordWrap(enabled: boolean): void {
    this.wordWrap = enabled;
    this.recalcAllHeights();
  }

  /**
   * Total line count.
   */
  getLineCount(): number {
    return this.rawLines.length;
  }

  /**
   * Get a specific parsed line.
   */
  getLine(index: number): LogLine | undefined {
    return this.parsedLines[index];
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.rawLines = [];
    this.parsedLines = [];
    this.searchEngine.cancel();
  }

  // ---- Internal ----

  private rebuild(): void {
    this.parsedLines = this.rawLines.map((raw, i) =>
      parseLine(raw, i + 1, this.parseOpts),
    );
    this.scroller.setCount(this.rawLines.length);
    this.searchEngine.setLines(this.rawLines);
    this.recalcAllHeights();
  }

  /**
   * Estimate the pixel height of a single line, considering word wrap.
   *
   * When @pretext/core is available, it would be used here for accurate
   * height prediction. For now we use a character-width estimation.
   */
  private estimateLineHeight(index: number): number {
    if (!this.wordWrap) return this.font.lineHeight;

    const plain = stripAnsi(this.rawLines[index]);
    const charsPerLine = Math.max(1, Math.floor(this.containerWidth / this.charWidth));
    const wrappedLines = Math.max(1, Math.ceil(plain.length / charsPerLine));
    return wrappedLines * this.font.lineHeight;
  }

  private updateLineHeight(index: number): void {
    const h = this.estimateLineHeight(index);
    this.scroller.setHeight(index, h);
  }

  private recalcAllHeights(): void {
    for (let i = 0; i < this.rawLines.length; i++) {
      this.updateLineHeight(i);
    }
  }
}
