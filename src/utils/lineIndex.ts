/**
 * Efficient line offset index for large text blobs.
 *
 * Builds a byte-offset array for O(1) line start lookups
 * within a large string.
 */

export class LineIndex {
  private offsets: Uint32Array;
  private count: number;

  constructor(text: string) {
    const offsets: number[] = [0]; // line 0 starts at offset 0
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) {
        // newline
        offsets.push(i + 1);
      }
    }
    this.offsets = new Uint32Array(offsets);
    this.count = offsets.length;
  }

  /**
   * Total number of lines.
   */
  lineCount(): number {
    return this.count;
  }

  /**
   * Get the character offset where line `n` starts (0-based).
   */
  getLineStart(n: number): number {
    if (n < 0 || n >= this.count) return -1;
    return this.offsets[n];
  }

  /**
   * Get the character offset where line `n` ends (exclusive).
   */
  getLineEnd(n: number, text: string): number {
    if (n < 0 || n >= this.count) return -1;
    if (n + 1 < this.count) return this.offsets[n + 1] - 1; // exclude \n
    return text.length;
  }

  /**
   * Extract line `n` from the text (0-based).
   */
  getLine(n: number, text: string): string {
    const start = this.getLineStart(n);
    const end = this.getLineEnd(n, text);
    if (start === -1 || end === -1) return '';
    return text.slice(start, end);
  }

  /**
   * Find which line a character offset falls on (binary search).
   */
  findLine(charOffset: number): number {
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (this.offsets[mid] <= charOffset) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }
}
