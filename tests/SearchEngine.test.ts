import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../src/core/SearchEngine';

describe('SearchEngine', () => {
  const engine = new SearchEngine();

  beforeEach(() => {
    engine.setLines([
      '2024-01-01 INFO Application started',
      '2024-01-01 DEBUG Loading config from /etc/app.conf',
      '2024-01-01 WARN Disk usage at 85%',
      '2024-01-01 ERROR Failed to connect to database',
      '2024-01-01 INFO Request processed in 42ms',
      '2024-01-01 ERROR Timeout waiting for response',
    ]);
  });

  it('finds plain text matches (case insensitive)', () => {
    const results = engine.search('error');
    expect(results).toHaveLength(2);
    expect(results[0].lineIndex).toBe(3);
    expect(results[1].lineIndex).toBe(5);
    expect(results[0].matchText).toBe('ERROR');
  });

  it('finds plain text matches (case sensitive)', () => {
    const results = engine.search('error', { caseSensitive: true });
    expect(results).toHaveLength(0);

    const results2 = engine.search('ERROR', { caseSensitive: true });
    expect(results2).toHaveLength(2);
  });

  it('supports regex search', () => {
    const results = engine.search('\\d+ms', { regex: true });
    expect(results).toHaveLength(1);
    expect(results[0].matchText).toBe('42ms');
    expect(results[0].lineIndex).toBe(4);
  });

  it('handles invalid regex gracefully', () => {
    const results = engine.search('[invalid', { regex: true });
    expect(results).toHaveLength(0);
  });

  it('respects maxResults', () => {
    const results = engine.search('2024', { maxResults: 3 });
    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty query', () => {
    expect(engine.search('')).toHaveLength(0);
  });

  it('finds multiple matches within a single line', () => {
    engine.setLines(['aaa bbb aaa ccc aaa']);
    const results = engine.search('aaa');
    expect(results).toHaveLength(3);
    expect(results[0].charStart).toBe(0);
    expect(results[1].charStart).toBe(8);
    expect(results[2].charStart).toBe(16);
  });

  it('builds highlight index correctly', () => {
    const results = engine.search('error');
    const map = SearchEngine.buildHighlightIndex(results);
    expect(map.has(3)).toBe(true);
    expect(map.has(5)).toBe(true);
    expect(map.get(3)![0].start).toBe(results[0].charStart);
  });

  it('can cancel search', () => {
    engine.setLines(Array.from({ length: 100000 }, (_, i) => `line ${i} data`));
    engine.cancel();
    // After cancel, a new search should still work
    const results = engine.search('line 50000');
    expect(results.length).toBeGreaterThan(0);
  });

  it('strips ANSI codes before searching', () => {
    engine.setLines(['\x1b[31mERROR\x1b[0m something broke']);
    const results = engine.search('error');
    expect(results).toHaveLength(1);
    expect(results[0].matchText).toBe('ERROR');
  });
});
