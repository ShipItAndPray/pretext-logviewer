import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/core/AnsiParser.ts
var ANSI_COLORS = [
  "#000000",
  "#cc0000",
  "#00cc00",
  "#cccc00",
  "#0000cc",
  "#cc00cc",
  "#00cccc",
  "#cccccc",
  // 0-7
  "#555555",
  "#ff5555",
  "#55ff55",
  "#ffff55",
  "#5555ff",
  "#ff55ff",
  "#55ffff",
  "#ffffff"
  // 8-15
];
var SGR_RE = /\x1b\[([0-9;]*)m/g;
var ALL_ESC_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function parse256Color(params, idx) {
  if (params[idx] !== 5 || idx + 1 >= params.length) return null;
  const n = params[idx + 1];
  if (n < 16) {
    return { color: ANSI_COLORS[n], next: idx + 2 };
  }
  if (n < 232) {
    const v = n - 16;
    const r = Math.floor(v / 36) * 51;
    const g = Math.floor(v / 6) % 6 * 51;
    const b = v % 6 * 51;
    return { color: `rgb(${r},${g},${b})`, next: idx + 2 };
  }
  const gray = (n - 232) * 10 + 8;
  return { color: `rgb(${gray},${gray},${gray})`, next: idx + 2 };
}
function parse24BitColor(params, idx) {
  if (params[idx] !== 2 || idx + 3 >= params.length) return null;
  const r = params[idx + 1];
  const g = params[idx + 2];
  const b = params[idx + 3];
  return { color: `rgb(${r},${g},${b})`, next: idx + 4 };
}
function applyParams(state, params) {
  let i = 0;
  while (i < params.length) {
    const p = params[i];
    switch (p) {
      case 0:
        state.color = void 0;
        state.bgColor = void 0;
        state.bold = void 0;
        state.italic = void 0;
        state.underline = void 0;
        state.dim = void 0;
        state.strikethrough = void 0;
        state.inverse = void 0;
        i++;
        break;
      case 1:
        state.bold = true;
        i++;
        break;
      case 2:
        state.dim = true;
        i++;
        break;
      case 3:
        state.italic = true;
        i++;
        break;
      case 4:
        state.underline = true;
        i++;
        break;
      case 7:
        state.inverse = true;
        i++;
        break;
      case 9:
        state.strikethrough = true;
        i++;
        break;
      case 22:
        state.bold = void 0;
        state.dim = void 0;
        i++;
        break;
      case 23:
        state.italic = void 0;
        i++;
        break;
      case 24:
        state.underline = void 0;
        i++;
        break;
      case 27:
        state.inverse = void 0;
        i++;
        break;
      case 29:
        state.strikethrough = void 0;
        i++;
        break;
      case 39:
        state.color = void 0;
        i++;
        break;
      case 49:
        state.bgColor = void 0;
        i++;
        break;
      default:
        if (p >= 30 && p <= 37) {
          state.color = ANSI_COLORS[p - 30];
          i++;
        } else if (p >= 90 && p <= 97) {
          state.color = ANSI_COLORS[p - 90 + 8];
          i++;
        } else if (p >= 40 && p <= 47) {
          state.bgColor = ANSI_COLORS[p - 40];
          i++;
        } else if (p >= 100 && p <= 107) {
          state.bgColor = ANSI_COLORS[p - 100 + 8];
          i++;
        } else if (p === 38) {
          i++;
          const c256 = parse256Color(params, i);
          if (c256) {
            state.color = c256.color;
            i = c256.next;
            break;
          }
          const c24 = parse24BitColor(params, i);
          if (c24) {
            state.color = c24.color;
            i = c24.next;
            break;
          }
          i++;
        } else if (p === 48) {
          i++;
          const c256 = parse256Color(params, i);
          if (c256) {
            state.bgColor = c256.color;
            i = c256.next;
            break;
          }
          const c24 = parse24BitColor(params, i);
          if (c24) {
            state.bgColor = c24.color;
            i = c24.next;
            break;
          }
          i++;
        } else {
          i++;
        }
        break;
    }
  }
}
function stateToSegmentProps(state) {
  const props = {};
  if (state.inverse) {
    if (state.color) props.bgColor = state.color;
    if (state.bgColor) props.color = state.bgColor;
    if (!state.color) props.bgColor = "#cccccc";
    if (!state.bgColor) props.color = "#000000";
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
function parseAnsi(input) {
  const segments = [];
  const state = {};
  let lastIndex = 0;
  SGR_RE.lastIndex = 0;
  let match;
  while ((match = SGR_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const text = input.slice(lastIndex, match.index);
      if (text) {
        segments.push({ text, ...stateToSegmentProps(state) });
      }
    }
    const paramStr = match[1] || "0";
    const params = paramStr.split(";").map(Number);
    applyParams(state, params);
    lastIndex = match.index + match[0].length;
  }
  const remaining = input.slice(lastIndex);
  const cleaned = remaining.replace(ALL_ESC_RE, "");
  if (cleaned) {
    segments.push({ text: cleaned, ...stateToSegmentProps(state) });
  }
  if (segments.length === 0) {
    return [{ text: input.replace(ALL_ESC_RE, "") }];
  }
  return segments;
}
function stripAnsi(input) {
  return input.replace(ALL_ESC_RE, "");
}

// src/core/LineParser.ts
var TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s/;
var SYSLOG_TS_RE = /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s/;
var LEVEL_RE = /\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|CRIT(?:ICAL)?)\b/i;
var LEVEL_MAP = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  WARNING: "warn",
  ERROR: "error",
  FATAL: "fatal",
  CRIT: "fatal",
  CRITICAL: "fatal"
};
function parseLine(raw, lineNumber, options = {}) {
  const {
    parseAnsiCodes = true,
    detectTimestamps = true,
    detectLevels = true
  } = options;
  const line = {
    number: lineNumber,
    raw,
    segments: parseAnsiCodes ? parseAnsi(raw) : [{ text: raw }]
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
      line.level = LEVEL_MAP[m[1].toUpperCase()] ?? "info";
    }
  }
  return line;
}
function parseText(text, options) {
  const rawLines = text.split("\n");
  return rawLines.map((raw, i) => parseLine(raw, i + 1, options));
}

// src/core/SearchEngine.ts
var SearchEngine = class {
  constructor() {
    this.cancelled = false;
    this.lines = [];
  }
  setLines(lines) {
    this.lines = lines;
  }
  /**
   * Cancel any in-progress search.
   */
  cancel() {
    this.cancelled = true;
  }
  /**
   * Search all lines synchronously. For very large files (>1M lines),
   * call searchAsync() instead for non-blocking search.
   */
  search(query, options = {}) {
    const {
      caseSensitive = false,
      regex = false,
      maxResults = 1e4
    } = options;
    if (!query) return [];
    this.cancelled = false;
    const results = [];
    let re = null;
    if (regex) {
      try {
        re = new RegExp(query, caseSensitive ? "g" : "gi");
      } catch {
        return [];
      }
    }
    const lowerQuery = caseSensitive ? query : query.toLowerCase();
    for (let i = 0; i < this.lines.length; i++) {
      if (this.cancelled) break;
      if (results.length >= maxResults) break;
      const plain = stripAnsi(this.lines[i]);
      if (re) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(plain)) !== null) {
          results.push({
            lineIndex: i,
            charStart: m.index,
            charEnd: m.index + m[0].length,
            matchText: m[0]
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
            matchText: plain.slice(idx, idx + query.length)
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
  async searchAsync(query, options = {}, chunkSize = 5e4) {
    const {
      caseSensitive = false,
      regex = false,
      maxResults = 1e4
    } = options;
    if (!query) return [];
    this.cancelled = false;
    const results = [];
    let re = null;
    if (regex) {
      try {
        re = new RegExp(query, caseSensitive ? "g" : "gi");
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
          let m;
          while ((m = re.exec(plain)) !== null) {
            results.push({
              lineIndex: i,
              charStart: m.index,
              charEnd: m.index + m[0].length,
              matchText: m[0]
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
              matchText: plain.slice(idx, idx + query.length)
            });
            if (results.length >= maxResults) break;
            pos = idx + 1;
          }
        }
      }
      if (results.length >= maxResults) break;
      await new Promise((r) => setTimeout(r, 0));
    }
    return results;
  }
  /**
   * Build a highlight index: Map<lineIndex, ranges[]> for efficient rendering.
   */
  static buildHighlightIndex(results) {
    const map = /* @__PURE__ */ new Map();
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
};

// src/core/VirtualScroller.ts
var VirtualScroller = class {
  constructor(options) {
    // cumulative heights; index i = sum of heights[0..i-1]
    this.prefixDirty = true;
    this.count = 0;
    this.defaultHeight = options?.defaultHeight ?? 20;
    this.overscan = options?.overscan ?? 20;
    this.heights = new Float32Array(1024);
    this.prefixSums = new Float64Array(1025);
  }
  /**
   * Set the total number of lines. Heights default to defaultHeight.
   */
  setCount(count) {
    if (count > this.heights.length) {
      const newLen = Math.max(count, this.heights.length * 2);
      const newH = new Float32Array(newLen);
      newH.set(this.heights);
      for (let i = this.count; i < newLen; i++) {
        newH[i] = this.defaultHeight;
      }
      this.heights = newH;
      this.prefixSums = new Float64Array(newLen + 1);
    } else {
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
  setHeight(index, height) {
    if (index < this.count && this.heights[index] !== height) {
      this.heights[index] = height;
      this.prefixDirty = true;
    }
  }
  /**
   * Batch-update heights for a range.
   */
  setHeights(startIndex, heights) {
    for (let i = 0; i < heights.length && startIndex + i < this.count; i++) {
      this.heights[startIndex + i] = heights[i];
    }
    this.prefixDirty = true;
  }
  getHeight(index) {
    return index < this.count ? this.heights[index] : this.defaultHeight;
  }
  /**
   * Rebuild prefix sums if dirty.
   */
  ensurePrefixSums() {
    if (!this.prefixDirty) return;
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
  getTotalHeight() {
    this.ensurePrefixSums();
    return this.prefixSums[this.count];
  }
  /**
   * Get the pixel offset of a line from the top.
   */
  getOffset(index) {
    this.ensurePrefixSums();
    if (index >= this.count) return this.prefixSums[this.count];
    return this.prefixSums[index];
  }
  /**
   * Binary search: find the line index at a given scrollTop.
   */
  findIndexAtOffset(offset) {
    this.ensurePrefixSums();
    let lo = 0;
    let hi = this.count;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
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
  getVisibleRange(scrollTop, viewportHeight) {
    if (this.count === 0) {
      return { startIndex: 0, endIndex: 0, offsetTop: 0, offsets: [] };
    }
    this.ensurePrefixSums();
    let startIndex = this.findIndexAtOffset(scrollTop);
    let endIndex = this.findIndexAtOffset(scrollTop + viewportHeight);
    if (endIndex < this.count - 1) endIndex++;
    startIndex = Math.max(0, startIndex - this.overscan);
    endIndex = Math.min(this.count - 1, endIndex + this.overscan);
    const offsetTop = this.prefixSums[startIndex];
    const offsets = [];
    for (let i = startIndex; i <= endIndex; i++) {
      offsets.push(this.prefixSums[i]);
    }
    return { startIndex, endIndex, offsetTop, offsets };
  }
  /**
   * Returns the scrollTop value to bring a line into view.
   */
  scrollToLine(index) {
    this.ensurePrefixSums();
    if (index < 0) return 0;
    if (index >= this.count) return this.prefixSums[this.count];
    return this.prefixSums[index];
  }
};

// src/core/LogViewerCore.ts
var LogViewerCore = class {
  constructor(options = {}) {
    this.rawLines = [];
    this.parsedLines = [];
    this.circularStart = 0;
    this.charWidth = 8;
    // estimated monospace character width
    this.destroyed = false;
    const defaultLineHeight = options.font?.lineHeight ?? 20;
    this.scroller = new VirtualScroller({
      defaultHeight: defaultLineHeight,
      overscan: options.overscan ?? 20
    });
    this.searchEngine = new SearchEngine();
    this.parseOpts = {
      parseAnsiCodes: options.parseAnsi ?? true,
      detectTimestamps: options.detectTimestamps ?? false,
      detectLevels: options.detectLevels ?? true
    };
    this.maxLines = options.maxLines ?? Infinity;
    this.containerWidth = options.containerWidth ?? 800;
    this.wordWrap = options.wordWrap ?? false;
    this.font = options.font ?? { family: "monospace", size: 14, lineHeight: 20 };
    this.charWidth = this.font.size * 0.6;
  }
  /**
   * Load a full text blob (splits by newline).
   */
  loadText(text) {
    this.rawLines = text.split("\n");
    this.rebuild();
  }
  /**
   * Load an array of lines directly.
   */
  loadLines(lines) {
    this.rawLines = [...lines];
    this.rebuild();
  }
  /**
   * Append a single line (streaming mode).
   */
  appendLine(line) {
    if (this.rawLines.length >= this.maxLines && this.maxLines !== Infinity) {
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
  appendLines(lines) {
    for (const line of lines) {
      this.appendLine(line);
    }
  }
  /**
   * Get the visible range of lines for rendering.
   */
  getVisibleRange(scrollTop, viewportHeight) {
    const range = this.scroller.getVisibleRange(scrollTop, viewportHeight);
    const lines = [];
    for (let i = range.startIndex; i <= range.endIndex && i < this.parsedLines.length; i++) {
      lines.push(this.parsedLines[i]);
    }
    return {
      startIndex: range.startIndex,
      endIndex: range.endIndex,
      lines,
      offsets: range.offsets
    };
  }
  /**
   * Search all lines.
   */
  search(query, options) {
    this.searchEngine.cancel();
    return this.searchEngine.search(query, options);
  }
  /**
   * Async search for very large files.
   */
  async searchAsync(query, options) {
    this.searchEngine.cancel();
    return this.searchEngine.searchAsync(query, options);
  }
  /**
   * Total scrollable content height in pixels.
   */
  getTotalHeight() {
    return this.scroller.getTotalHeight();
  }
  /**
   * Pixel offset of a specific line.
   */
  getLineOffset(index) {
    return this.scroller.getOffset(index);
  }
  /**
   * Scroll to a line. Returns the scrollTop value.
   */
  scrollToLine(index) {
    return this.scroller.scrollToLine(index);
  }
  /**
   * Update container width (recalculates word-wrap heights).
   */
  setContainerWidth(width) {
    this.containerWidth = width;
    if (this.wordWrap) {
      this.recalcAllHeights();
    }
  }
  /**
   * Update font config.
   */
  setFont(font) {
    this.font = font;
    this.charWidth = font.size * 0.6;
    this.scroller = new VirtualScroller({
      defaultHeight: font.lineHeight,
      overscan: 20
    });
    this.scroller.setCount(this.rawLines.length);
    this.recalcAllHeights();
  }
  /**
   * Toggle word wrap.
   */
  setWordWrap(enabled) {
    this.wordWrap = enabled;
    this.recalcAllHeights();
  }
  /**
   * Total line count.
   */
  getLineCount() {
    return this.rawLines.length;
  }
  /**
   * Get a specific parsed line.
   */
  getLine(index) {
    return this.parsedLines[index];
  }
  /**
   * Clean up resources.
   */
  destroy() {
    this.destroyed = true;
    this.rawLines = [];
    this.parsedLines = [];
    this.searchEngine.cancel();
  }
  // ---- Internal ----
  rebuild() {
    this.parsedLines = this.rawLines.map(
      (raw, i) => parseLine(raw, i + 1, this.parseOpts)
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
  estimateLineHeight(index) {
    if (!this.wordWrap) return this.font.lineHeight;
    const plain = stripAnsi(this.rawLines[index]);
    const charsPerLine = Math.max(1, Math.floor(this.containerWidth / this.charWidth));
    const wrappedLines = Math.max(1, Math.ceil(plain.length / charsPerLine));
    return wrappedLines * this.font.lineHeight;
  }
  updateLineHeight(index) {
    const h = this.estimateLineHeight(index);
    this.scroller.setHeight(index, h);
  }
  recalcAllHeights() {
    for (let i = 0; i < this.rawLines.length; i++) {
      this.updateLineHeight(i);
    }
  }
};

// src/utils/heightPredictor.ts
var pretextMeasure = null;
var pretextLoaded = false;
function loadPretext() {
  if (pretextLoaded) return;
  pretextLoaded = true;
  try {
    const pretext = __require("@pretext/core");
    if (pretext?.measureText) {
      pretextMeasure = (text, font, maxWidth) => {
        const result = pretext.measureText(text, { font, maxWidth });
        return result.height ?? result.lines * 20;
      };
    }
  } catch {
  }
}
function predictLineHeight(rawLine, containerWidth, font, wordWrap) {
  if (!wordWrap) return font.lineHeight;
  const plain = stripAnsi(rawLine);
  loadPretext();
  if (pretextMeasure) {
    const fontStr = `${font.size}px ${font.family}`;
    return pretextMeasure(plain, fontStr, containerWidth);
  }
  const charWidth = font.size * 0.6;
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  const wrappedLines = plain.length === 0 ? 1 : Math.ceil(plain.length / charsPerLine);
  return Math.max(1, wrappedLines) * font.lineHeight;
}
function predictHeightsBatch(rawLines, startIndex, count, containerWidth, font, wordWrap) {
  const heights = new Array(count);
  const end = Math.min(startIndex + count, rawLines.length);
  for (let i = startIndex; i < end; i++) {
    heights[i - startIndex] = predictLineHeight(
      rawLines[i],
      containerWidth,
      font,
      wordWrap
    );
  }
  return heights;
}

// src/utils/chunkedLoader.ts
var ChunkedLoader = class {
  constructor() {
    this.abortController = null;
  }
  async load(url, options = {}) {
    const {
      onLines,
      onProgress,
      onDone,
      onError
    } = options;
    this.abortController = new AbortController();
    try {
      const response = await fetch(url, { signal: this.abortController.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : null;
      if (!response.body) {
        throw new Error("Response body is null");
      }
      let stream = response.body;
      const contentEncoding = response.headers.get("content-encoding");
      const isGzip = contentEncoding === "gzip" || url.endsWith(".gz") || url.endsWith(".gzip");
      if (isGzip && typeof DecompressionStream !== "undefined") {
        stream = stream.pipeThrough(new DecompressionStream("gzip"));
      }
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let loaded = 0;
      let partialLine = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        const text = decoder.decode(value, { stream: true });
        const combined = partialLine + text;
        const lines = combined.split("\n");
        partialLine = lines.pop() ?? "";
        if (lines.length > 0 && onLines) {
          onLines(lines);
        }
        if (onProgress) {
          onProgress(loaded, total);
        }
      }
      if (partialLine && onLines) {
        onLines([partialLine]);
      }
      onDone?.();
    } catch (err) {
      if (err.name === "AbortError") return;
      onError?.(err);
    }
  }
  abort() {
    this.abortController?.abort();
  }
};

// src/utils/lineIndex.ts
var LineIndex = class {
  constructor(text) {
    const offsets = [0];
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) {
        offsets.push(i + 1);
      }
    }
    this.offsets = new Uint32Array(offsets);
    this.count = offsets.length;
  }
  /**
   * Total number of lines.
   */
  lineCount() {
    return this.count;
  }
  /**
   * Get the character offset where line `n` starts (0-based).
   */
  getLineStart(n) {
    if (n < 0 || n >= this.count) return -1;
    return this.offsets[n];
  }
  /**
   * Get the character offset where line `n` ends (exclusive).
   */
  getLineEnd(n, text) {
    if (n < 0 || n >= this.count) return -1;
    if (n + 1 < this.count) return this.offsets[n + 1] - 1;
    return text.length;
  }
  /**
   * Extract line `n` from the text (0-based).
   */
  getLine(n, text) {
    const start = this.getLineStart(n);
    const end = this.getLineEnd(n, text);
    if (start === -1 || end === -1) return "";
    return text.slice(start, end);
  }
  /**
   * Find which line a character offset falls on (binary search).
   */
  findLine(charOffset) {
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >>> 1;
      if (this.offsets[mid] <= charOffset) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }
};

// src/utils/wordWrap.ts
function countWrappedLines(text, containerWidth, charWidth) {
  if (text.length === 0) return 1;
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  return Math.ceil(text.length / charsPerLine);
}
function wrapLine(text, containerWidth, charWidth) {
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  if (text.length <= charsPerLine) return [text];
  const lines = [];
  const words = text.split(/(\s+)/);
  let current = "";
  for (const word of words) {
    if (current.length + word.length <= charsPerLine) {
      current += word;
    } else if (current.length === 0) {
      for (let i = 0; i < word.length; i += charsPerLine) {
        const chunk = word.slice(i, i + charsPerLine);
        if (i + charsPerLine < word.length) {
          lines.push(chunk);
        } else {
          current = chunk;
        }
      }
    } else {
      lines.push(current);
      if (word.length > charsPerLine) {
        for (let i = 0; i < word.length; i += charsPerLine) {
          const chunk = word.slice(i, i + charsPerLine);
          if (i + charsPerLine < word.length) {
            lines.push(chunk);
          } else {
            current = chunk;
          }
        }
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}
var LEVEL_COLORS = {
  debug: "#6b7280",
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
  fatal: "#dc2626"
};
function segmentStyle(seg) {
  const s = {};
  if (seg.color) s.color = seg.color;
  if (seg.bgColor) s.backgroundColor = seg.bgColor;
  if (seg.bold) s.fontWeight = "bold";
  if (seg.italic) s.fontStyle = "italic";
  if (seg.underline) s.textDecoration = "underline";
  if (seg.dim) s.opacity = 0.5;
  if (seg.strikethrough) {
    s.textDecoration = s.textDecoration ? `${s.textDecoration} line-through` : "line-through";
  }
  return s;
}
var LogLineComponent = React.memo(function LogLineComponent2({
  line,
  offsetTop,
  showLineNumbers,
  showLevelBadge,
  highlighted,
  onClick
}) {
  const handleClick = onClick ? () => onClick(line, line.number - 1) : void 0;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "plv-line",
      style: {
        position: "absolute",
        top: offsetTop,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "flex-start",
        padding: "0 8px",
        backgroundColor: highlighted ? "rgba(255,255,0,0.1)" : void 0,
        cursor: onClick ? "pointer" : void 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all"
      },
      onClick: handleClick,
      children: [
        showLineNumbers && /* @__PURE__ */ jsx(
          "span",
          {
            className: "plv-line-number",
            style: {
              display: "inline-block",
              minWidth: 50,
              textAlign: "right",
              paddingRight: 12,
              color: "#6b7280",
              userSelect: "none",
              flexShrink: 0
            },
            children: line.number
          }
        ),
        showLevelBadge && line.level && /* @__PURE__ */ jsx(
          "span",
          {
            className: "plv-level-badge",
            style: {
              display: "inline-block",
              width: 48,
              textAlign: "center",
              fontSize: "0.75em",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: LEVEL_COLORS[line.level],
              borderRadius: 3,
              marginRight: 8,
              flexShrink: 0,
              lineHeight: "1.5em"
            },
            children: line.level.toUpperCase()
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "plv-line-content", style: { flex: 1 }, children: line.segments.map((seg, i) => /* @__PURE__ */ jsx("span", { style: segmentStyle(seg), children: seg.text }, i)) })
      ]
    }
  );
});
function SearchBar({
  onSearch,
  resultCount,
  activeIndex,
  onNavigate,
  onClose
}) {
  const [query, setQuery] = useState("");
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    onSearch(query, { regex, caseSensitive });
  }, [query, regex, caseSensitive, onSearch]);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onNavigate(e.shiftKey ? "prev" : "next");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onNavigate, onClose]
  );
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "plv-search-bar",
      style: {
        position: "absolute",
        top: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        background: "#1e1e1e",
        border: "1px solid #444",
        borderRadius: 4,
        zIndex: 10,
        fontSize: 13,
        color: "#ccc"
      },
      children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: inputRef,
            type: "text",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            onKeyDown: handleKeyDown,
            placeholder: "Search...",
            style: {
              background: "#2d2d2d",
              border: "1px solid #555",
              color: "#eee",
              padding: "2px 6px",
              borderRadius: 3,
              outline: "none",
              width: 200
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setCaseSensitive(!caseSensitive),
            style: {
              background: caseSensitive ? "#555" : "transparent",
              border: "1px solid #555",
              color: "#ccc",
              borderRadius: 3,
              padding: "1px 4px",
              cursor: "pointer",
              fontSize: 12
            },
            title: "Case Sensitive",
            children: "Aa"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setRegex(!regex),
            style: {
              background: regex ? "#555" : "transparent",
              border: "1px solid #555",
              color: "#ccc",
              borderRadius: 3,
              padding: "1px 4px",
              cursor: "pointer",
              fontSize: 12
            },
            title: "Regex",
            children: ".*"
          }
        ),
        /* @__PURE__ */ jsx("span", { style: { minWidth: 60, textAlign: "center" }, children: resultCount > 0 ? `${activeIndex + 1}/${resultCount}` : "No results" }),
        /* @__PURE__ */ jsx("button", { onClick: () => onNavigate("prev"), style: navBtnStyle, children: "\u25B2" }),
        /* @__PURE__ */ jsx("button", { onClick: () => onNavigate("next"), style: navBtnStyle, children: "\u25BC" }),
        /* @__PURE__ */ jsx("button", { onClick: onClose, style: navBtnStyle, children: "\u2715" })
      ]
    }
  );
}
var navBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#ccc",
  cursor: "pointer",
  padding: "2px 4px",
  fontSize: 12
};
var DARK_THEME = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  lineNumberColor: "#6b7280",
  lineNumberBackground: "#1e1e1e",
  selectionBackground: "#264f78",
  searchHighlight: "#613214",
  searchActiveHighlight: "#9e6a03",
  levelColors: {
    debug: "#6b7280",
    info: "#3b82f6",
    warn: "#f59e0b",
    error: "#ef4444",
    fatal: "#dc2626"
  },
  scrollbarThumb: "#555",
  scrollbarTrack: "#1e1e1e"
};
var LIGHT_THEME = {
  background: "#ffffff",
  foreground: "#1e1e1e",
  lineNumberColor: "#999",
  lineNumberBackground: "#f5f5f5",
  selectionBackground: "#add6ff",
  searchHighlight: "#fde68a",
  searchActiveHighlight: "#fbbf24",
  levelColors: {
    debug: "#6b7280",
    info: "#2563eb",
    warn: "#d97706",
    error: "#dc2626",
    fatal: "#b91c1c"
  },
  scrollbarThumb: "#ccc",
  scrollbarTrack: "#f5f5f5"
};
function resolveTheme(theme) {
  if (!theme || theme === "dark") return DARK_THEME;
  if (theme === "light") return LIGHT_THEME;
  return theme;
}
var LogViewer = React.memo(function LogViewer2(props) {
  const {
    lines: propLines,
    text,
    url,
    stream,
    height = 600,
    width = "100%",
    fontSize = 14,
    fontFamily = "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    wordWrap = false,
    showLineNumbers = true,
    showTimestamps = false,
    showLevelBadges = true,
    searchable = true,
    follow = false,
    highlightLines,
    onLineClick,
    className,
    style,
    theme
  } = props;
  const resolvedTheme = resolveTheme(theme);
  const containerRef = useRef(null);
  const coreRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState(null);
  const [totalHeight, setTotalHeight] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(follow);
  const highlightSet = new Set(highlightLines ?? []);
  const searchHighlightMap = useRef(/* @__PURE__ */ new Map());
  if (!coreRef.current) {
    coreRef.current = new LogViewerCore({
      font: { family: fontFamily, size: fontSize, lineHeight: Math.round(fontSize * 1.5) },
      wordWrap,
      parseAnsi: true,
      detectLevels: showLevelBadges,
      detectTimestamps: showTimestamps
    });
  }
  const core = coreRef.current;
  useEffect(() => {
    if (text != null) {
      core.loadText(text);
    } else if (propLines) {
      core.loadLines(propLines);
    }
    setTotalHeight(core.getTotalHeight());
    updateVisible();
  }, [text, propLines]);
  useEffect(() => {
    if (!url) return;
    const loader = new ChunkedLoader();
    loader.load(url, {
      onLines: (newLines) => {
        core.appendLines(newLines);
        setTotalHeight(core.getTotalHeight());
        if (isFollowing) {
          scrollToBottom();
        }
        updateVisible();
      }
    });
    return () => loader.abort();
  }, [url]);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        core.setContainerWidth(entry.contentRect.width);
        setTotalHeight(core.getTotalHeight());
        updateVisible();
      }
    });
    ro.observe(el);
    core.setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    core.setWordWrap(wordWrap);
    setTotalHeight(core.getTotalHeight());
    updateVisible();
  }, [wordWrap]);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && searchable) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchable]);
  const updateVisible = useCallback(() => {
    const el = containerRef.current;
    if (!el || !core) return;
    const range = core.getVisibleRange(el.scrollTop, el.clientHeight);
    setVisibleRange(range);
  }, [core]);
  const handleScroll = useCallback(() => {
    updateVisible();
    const el = containerRef.current;
    if (el && follow) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setIsFollowing(atBottom);
    }
  }, [updateVisible, follow]);
  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);
  useEffect(() => {
    if (isFollowing) {
      scrollToBottom();
    }
  }, [totalHeight, isFollowing]);
  const handleSearch = useCallback(
    (query, opts) => {
      const results = core.search(query, {
        regex: opts.regex,
        caseSensitive: opts.caseSensitive
      });
      setSearchResults(results);
      setActiveSearchIndex(0);
      searchHighlightMap.current = SearchEngine.buildHighlightIndex(results);
      updateVisible();
      if (results.length > 0) {
        const el = containerRef.current;
        if (el) {
          el.scrollTop = core.scrollToLine(results[0].lineIndex);
          updateVisible();
        }
      }
    },
    [core, updateVisible]
  );
  const handleSearchNavigate = useCallback(
    (dir) => {
      if (searchResults.length === 0) return;
      let next = activeSearchIndex + (dir === "next" ? 1 : -1);
      if (next >= searchResults.length) next = 0;
      if (next < 0) next = searchResults.length - 1;
      setActiveSearchIndex(next);
      const el = containerRef.current;
      if (el) {
        el.scrollTop = core.scrollToLine(searchResults[next].lineIndex);
        updateVisible();
      }
    },
    [searchResults, activeSearchIndex, core, updateVisible]
  );
  const handleSearchClose = useCallback(() => {
    setShowSearch(false);
    setSearchResults([]);
    searchHighlightMap.current.clear();
    updateVisible();
  }, [updateVisible]);
  const lineHeight = Math.round(fontSize * 1.5);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `plv-container ${className ?? ""}`,
      style: {
        position: "relative",
        height,
        width,
        fontFamily,
        fontSize,
        lineHeight: `${lineHeight}px`,
        background: resolvedTheme.background,
        color: resolvedTheme.foreground,
        overflow: "hidden",
        ...style
      },
      children: [
        showSearch && /* @__PURE__ */ jsx(
          SearchBar,
          {
            onSearch: handleSearch,
            resultCount: searchResults.length,
            activeIndex: activeSearchIndex,
            onNavigate: handleSearchNavigate,
            onClose: handleSearchClose
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            ref: containerRef,
            className: "plv-scroll-container",
            onScroll: handleScroll,
            style: {
              height: "100%",
              overflow: "auto",
              position: "relative"
            },
            children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "plv-content",
                style: {
                  height: totalHeight,
                  position: "relative"
                },
                children: visibleRange?.lines.map((line, i) => /* @__PURE__ */ jsx(
                  LogLineComponent,
                  {
                    line,
                    offsetTop: visibleRange.offsets[i],
                    showLineNumbers,
                    showLevelBadge: showLevelBadges,
                    highlighted: highlightSet.has(visibleRange.startIndex + i),
                    searchHighlights: searchHighlightMap.current.get(visibleRange.startIndex + i),
                    onClick: onLineClick
                  },
                  visibleRange.startIndex + i
                ))
              }
            )
          }
        ),
        follow && !isFollowing && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setIsFollowing(true);
              scrollToBottom();
            },
            style: {
              position: "absolute",
              bottom: 16,
              right: 16,
              padding: "6px 12px",
              background: "#333",
              color: "#eee",
              border: "1px solid #555",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              zIndex: 10
            },
            children: "Jump to bottom"
          }
        )
      ]
    }
  );
});
function useLogViewer(options = {}) {
  const coreRef = useRef(null);
  const [lineCount, setLineCount] = useState(0);
  if (!coreRef.current) {
    coreRef.current = new LogViewerCore(options);
  }
  const core = coreRef.current;
  const loadText = useCallback(
    (text) => {
      core.loadText(text);
      setLineCount(core.getLineCount());
    },
    [core]
  );
  const loadLines = useCallback(
    (lines) => {
      core.loadLines(lines);
      setLineCount(core.getLineCount());
    },
    [core]
  );
  const search = useCallback(
    (query, opts) => {
      return core.search(query, opts);
    },
    [core]
  );
  useEffect(() => {
    return () => {
      core.destroy();
    };
  }, [core]);
  return { core, loadText, loadLines, search, lineCount };
}
function useLogStream(source, options = {}) {
  const { maxLines = Infinity } = options;
  const [lines, setLines] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const cancelRef = useRef(false);
  const stop = useCallback(() => {
    cancelRef.current = true;
    setIsStreaming(false);
  }, []);
  useEffect(() => {
    if (!source) return;
    cancelRef.current = false;
    setIsStreaming(true);
    const appendLines = (newLines) => {
      setLines((prev) => {
        const combined = [...prev, ...newLines];
        if (combined.length > maxLines) {
          return combined.slice(combined.length - maxLines);
        }
        return combined;
      });
    };
    if (source instanceof ReadableStream) {
      const reader = source.getReader();
      const read = async () => {
        try {
          while (!cancelRef.current) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              const parts = value.split("\n");
              appendLines(parts);
            }
          }
        } finally {
          setIsStreaming(false);
          reader.releaseLock();
        }
      };
      read();
      return () => {
        cancelRef.current = true;
        reader.cancel();
      };
    }
    if (source instanceof WebSocket) {
      const handler = (event) => {
        if (cancelRef.current) return;
        const parts = String(event.data).split("\n");
        appendLines(parts);
      };
      source.addEventListener("message", handler);
      source.addEventListener("close", () => setIsStreaming(false));
      return () => {
        cancelRef.current = true;
        source.removeEventListener("message", handler);
      };
    }
    if (source instanceof EventSource) {
      const handler = (event) => {
        if (cancelRef.current) return;
        const parts = String(event.data).split("\n");
        appendLines(parts);
      };
      source.addEventListener("message", handler);
      source.addEventListener("error", () => setIsStreaming(false));
      return () => {
        cancelRef.current = true;
        source.removeEventListener("message", handler);
      };
    }
  }, [source, maxLines]);
  return { lines, lineCount: lines.length, isStreaming, stop };
}

export { ChunkedLoader, LineIndex, LogLineComponent, LogViewer, LogViewerCore, SearchBar, SearchEngine, VirtualScroller, countWrappedLines, parseAnsi, parseLine, parseText, predictHeightsBatch, predictLineHeight, stripAnsi, useLogStream, useLogViewer, wrapLine };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map