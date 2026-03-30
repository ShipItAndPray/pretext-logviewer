import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseLogStreamOptions {
  maxLines?: number;
  follow?: boolean;
}

/**
 * React hook for streaming log lines from a ReadableStream, WebSocket, or EventSource.
 */
export function useLogStream(
  source: ReadableStream<string> | WebSocket | EventSource | null,
  options: UseLogStreamOptions = {},
) {
  const { maxLines = Infinity } = options;
  const [lines, setLines] = useState<string[]>([]);
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

    const appendLines = (newLines: string[]) => {
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
              const parts = value.split('\n');
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
      const handler = (event: MessageEvent) => {
        if (cancelRef.current) return;
        const parts = String(event.data).split('\n');
        appendLines(parts);
      };
      source.addEventListener('message', handler);
      source.addEventListener('close', () => setIsStreaming(false));
      return () => {
        cancelRef.current = true;
        source.removeEventListener('message', handler);
      };
    }

    if (source instanceof EventSource) {
      const handler = (event: MessageEvent) => {
        if (cancelRef.current) return;
        const parts = String(event.data).split('\n');
        appendLines(parts);
      };
      source.addEventListener('message', handler);
      source.addEventListener('error', () => setIsStreaming(false));
      return () => {
        cancelRef.current = true;
        source.removeEventListener('message', handler);
      };
    }
  }, [source, maxLines]);

  return { lines, lineCount: lines.length, isStreaming, stop };
}
