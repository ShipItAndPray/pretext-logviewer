import { useCallback, useEffect, useRef, useState } from 'react';
import { LogViewerCore } from '../../core/LogViewerCore';
import type { LogViewerCoreOptions, SearchOptions, SearchResult } from '../../types';

/**
 * React hook for controlling a LogViewerCore instance.
 */
export function useLogViewer(options: LogViewerCoreOptions = {}) {
  const coreRef = useRef<LogViewerCore | null>(null);
  const [lineCount, setLineCount] = useState(0);

  if (!coreRef.current) {
    coreRef.current = new LogViewerCore(options);
  }

  const core = coreRef.current;

  const loadText = useCallback(
    (text: string) => {
      core.loadText(text);
      setLineCount(core.getLineCount());
    },
    [core],
  );

  const loadLines = useCallback(
    (lines: string[]) => {
      core.loadLines(lines);
      setLineCount(core.getLineCount());
    },
    [core],
  );

  const search = useCallback(
    (query: string, opts?: SearchOptions): SearchResult[] => {
      return core.search(query, opts);
    },
    [core],
  );

  useEffect(() => {
    return () => {
      core.destroy();
    };
  }, [core]);

  return { core, loadText, loadLines, search, lineCount };
}
