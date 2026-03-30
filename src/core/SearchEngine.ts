import type { SearchOptions, SearchResult } from '../types';
import { stripAnsi } from './AnsiParser';

/**
 * Full-text search engine for log lines.
 * Supports plain text and regex search with cancellation.
 */
export class SearchEngine {
  private cancelled = false;
  private lines: string[] = [];

  setLines(lines: string[]): void {
    this.lines = lines;
  }

  /**
   * Cancel any in-progress search.
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Search all lines synchronously. For very large files (>1M lines),
   * call searchAsync() instead for non-blocking search.
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
      caseSensitive = false,
      regex = false,
      maxResults = 10000,
    } = options;

    if (!query) return [];

    this.cancelled = false;
    const results: SearchResult[] = [];

    let re: RegExp | null = null;
    if (regex) {
      try {
        re = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } catch {
        return []; // Invalid regex
      }
    }

    const lowerQuery = caseSensitive ? query : query.toLowerCase();

    for (let i = 0; i < this.lines.length; i++) {
      if (this.cancelled) break;
      if (results.length >= maxResults) break;

      const plain = stripAnsi(this.lines[i]);

      if (re) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(plain)) !== null) {
          results.push({
            lineIndex: i,
            charStart: m.index,
            charEnd: m.index + m[0].length,
            matchText: m[0],
          });
          if (results.length >= maxResults) break;
          // Prevent infinite loop on zero-width matches
          if (m[0].length === 0) re.lastIndex++;
        }
      } else {
        const haystack = caseSensitive ? plain : plain.toLowerCase();
        let pos = 0;
        while (pos < haystack.length) {
          const idx = haystack.indexOf(lowerQuery, pos);
          if (idx === -1) break;
          results.push({
            lineIndex: i,
            charStart: idx,
            charEnd: idx + query.length,
            matchText: plain.slice(idx, idx + query.length),
          });
          if (results.length >= maxResults) break;
          pos = idx + 1;
        }
      }
    }

    return results;
  }

  /**
   * Async chunked search that yields to the event loop every chunkSize lines.
   * Returns a promise that resolves with results.
   */
  async searchAsync(
    query: string,
    options: SearchOptions = {},
    chunkSize = 50000,
  ): Promise<SearchResult[]> {
    const {
      caseSensitive = false,
      regex = false,
      maxResults = 10000,
    } = options;

    if (!query) return [];

    this.cancelled = false;
    const results: SearchResult[] = [];

    let re: RegExp | null = null;
    if (regex) {
      try {
        re = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } catch {
        return [];
      }
    }

    const lowerQuery = caseSensitive ? query : query.toLowerCase();

    for (let start = 0; start < this.lines.length; start += chunkSize) {
      if (this.cancelled) break;

      const end = Math.min(start + chunkSize, this.lines.length);

      for (let i = start; i < end; i++) {
        if (this.cancelled) break;
        if (results.length >= maxResults) break;

        const plain = stripAnsi(this.lines[i]);

        if (re) {
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(plain)) !== null) {
            results.push({
              lineIndex: i,
              charStart: m.index,
              charEnd: m.index + m[0].length,
              matchText: m[0],
            });
            if (results.length >= maxResults) break;
            if (m[0].length === 0) re.lastIndex++;
          }
        } else {
          const haystack = caseSensitive ? plain : plain.toLowerCase();
          let pos = 0;
          while (pos < haystack.length) {
            const idx = haystack.indexOf(lowerQuery, pos);
            if (idx === -1) break;
            results.push({
              lineIndex: i,
              charStart: idx,
              charEnd: idx + query.length,
              matchText: plain.slice(idx, idx + query.length),
            });
            if (results.length >= maxResults) break;
            pos = idx + 1;
          }
        }
      }

      if (results.length >= maxResults) break;

      // Yield to event loop
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    return results;
  }

  /**
   * Build a highlight index: Map<lineIndex, ranges[]> for efficient rendering.
   */
  static buildHighlightIndex(results: SearchResult[]): Map<number, { start: number; end: number }[]> {
    const map = new Map<number, { start: number; end: number }[]>();
    for (const r of results) {
      let arr = map.get(r.lineIndex);
      if (!arr) {
        arr = [];
        map.set(r.lineIndex, arr);
      }
      arr.push({ start: r.charStart, end: r.charEnd });
    }
    return map;
  }
}
