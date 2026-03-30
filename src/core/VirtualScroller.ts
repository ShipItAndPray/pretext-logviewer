/**
 * Virtual scroller with variable-height rows.
 *
 * Uses a Float32Array height map and a lazily-computed prefix-sum array
 * for O(log n) visible-range lookups via binary search.
 */

export interface ScrollRange {
  startIndex: number;
  endIndex: number;
  offsetTop: number; // px offset of startIndex from top
  offsets: number[]; // px offset for each visible line
}

export class VirtualScroller {
  private heights: Float32Array;
  private prefixSums: Float64Array; // cumulative heights; index i = sum of heights[0..i-1]
  private prefixDirty = true;
  private count = 0;
  private defaultHeight: number;
  private overscan: number;

  constructor(options?: { defaultHeight?: number; overscan?: number }) {
    this.defaultHeight = options?.defaultHeight ?? 20;
    this.overscan = options?.overscan ?? 20;
    this.heights = new Float32Array(1024);
    this.prefixSums = new Float64Array(1025);
  }

  /**
   * Set the total number of lines. Heights default to defaultHeight.
   */
  setCount(count: number): void {
    if (count > this.heights.length) {
      const newLen = Math.max(count, this.heights.length * 2);
      const newH = new Float32Array(newLen);
      newH.set(this.heights);
      // Fill new entries with default height
      for (let i = this.count; i < newLen; i++) {
        newH[i] = this.defaultHeight;
      }
      this.heights = newH;
      this.prefixSums = new Float64Array(newLen + 1);
    } else {
      // Fill any new entries
      for (let i = this.count; i < count; i++) {
        this.heights[i] = this.defaultHeight;
      }
    }
    this.count = count;
    this.prefixDirty = true;
  }

  /**
   * Update height for a specific line index.
   */
  setHeight(index: number, height: number): void {
    if (index < this.count && this.heights[index] !== height) {
      this.heights[index] = height;
      this.prefixDirty = true;
    }
  }

  /**
   * Batch-update heights for a range.
   */
  setHeights(startIndex: number, heights: number[]): void {
    for (let i = 0; i < heights.length && startIndex + i < this.count; i++) {
      this.heights[startIndex + i] = heights[i];
    }
    this.prefixDirty = true;
  }

  getHeight(index: number): number {
    return index < this.count ? this.heights[index] : this.defaultHeight;
  }

  /**
   * Rebuild prefix sums if dirty.
   */
  private ensurePrefixSums(): void {
    if (!this.prefixDirty) return;
    // Ensure prefixSums array is large enough
    if (this.prefixSums.length < this.count + 1) {
      this.prefixSums = new Float64Array(this.count + 1);
    }
    this.prefixSums[0] = 0;
    for (let i = 0; i < this.count; i++) {
      this.prefixSums[i + 1] = this.prefixSums[i] + this.heights[i];
    }
    this.prefixDirty = false;
  }

  /**
   * Total scrollable height in pixels.
   */
  getTotalHeight(): number {
    this.ensurePrefixSums();
    return this.prefixSums[this.count];
  }

  /**
   * Get the pixel offset of a line from the top.
   */
  getOffset(index: number): number {
    this.ensurePrefixSums();
    if (index >= this.count) return this.prefixSums[this.count];
    return this.prefixSums[index];
  }

  /**
   * Binary search: find the line index at a given scrollTop.
   */
  private findIndexAtOffset(offset: number): number {
    this.ensurePrefixSums();
    let lo = 0;
    let hi = this.count;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.prefixSums[mid + 1] <= offset) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return Math.min(lo, this.count - 1);
  }

  /**
   * Compute the visible range for the given scroll position and viewport.
   */
  getVisibleRange(scrollTop: number, viewportHeight: number): ScrollRange {
    if (this.count === 0) {
      return { startIndex: 0, endIndex: 0, offsetTop: 0, offsets: [] };
    }

    this.ensurePrefixSums();

    let startIndex = this.findIndexAtOffset(scrollTop);
    let endIndex = this.findIndexAtOffset(scrollTop + viewportHeight);

    // Include the partially visible last line
    if (endIndex < this.count - 1) endIndex++;

    // Apply overscan
    startIndex = Math.max(0, startIndex - this.overscan);
    endIndex = Math.min(this.count - 1, endIndex + this.overscan);

    const offsetTop = this.prefixSums[startIndex];
    const offsets: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      offsets.push(this.prefixSums[i]);
    }

    return { startIndex, endIndex, offsetTop, offsets };
  }

  /**
   * Returns the scrollTop value to bring a line into view.
   */
  scrollToLine(index: number): number {
    this.ensurePrefixSums();
    if (index < 0) return 0;
    if (index >= this.count) return this.prefixSums[this.count];
    return this.prefixSums[index];
  }
}
