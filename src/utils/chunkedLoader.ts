/**
 * Chunked file loader for streaming large log files from URLs.
 * Reads in 1MB chunks, splits into lines, and calls back with each batch.
 */

export interface ChunkedLoaderOptions {
  chunkSize?: number; // bytes per chunk, default 1MB
  onLines?: (lines: string[]) => void;
  onProgress?: (loaded: number, total: number | null) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export class ChunkedLoader {
  private abortController: AbortController | null = null;

  async load(url: string, options: ChunkedLoaderOptions = {}): Promise<void> {
    const {
      onLines,
      onProgress,
      onDone,
      onError,
    } = options;

    this.abortController = new AbortController();

    try {
      const response = await fetch(url, { signal: this.abortController.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : null;

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Detect gzip and decompress if needed
      let stream: ReadableStream<Uint8Array> = response.body;
      const contentEncoding = response.headers.get('content-encoding');
      const isGzip =
        contentEncoding === 'gzip' ||
        url.endsWith('.gz') ||
        url.endsWith('.gzip');

      if (isGzip && typeof DecompressionStream !== 'undefined') {
        stream = stream.pipeThrough(new DecompressionStream('gzip') as any);
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let loaded = 0;
      let partialLine = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        loaded += value.byteLength;
        const text = decoder.decode(value, { stream: true });
        const combined = partialLine + text;
        const lines = combined.split('\n');

        // Last element is a partial line (or empty if text ended with \n)
        partialLine = lines.pop() ?? '';

        if (lines.length > 0 && onLines) {
          onLines(lines);
        }

        if (onProgress) {
          onProgress(loaded, total);
        }
      }

      // Flush remaining partial line
      if (partialLine && onLines) {
        onLines([partialLine]);
      }

      onDone?.();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      onError?.(err);
    }
  }

  abort(): void {
    this.abortController?.abort();
  }
}
