import { describe, it, expect } from 'vitest';
import { VirtualScroller } from '../src/core/VirtualScroller';

describe('VirtualScroller', () => {
  it('computes total height with uniform heights', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(100);
    expect(vs.getTotalHeight()).toBe(2000);
  });

  it('computes total height with variable heights', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(5);
    vs.setHeight(0, 30);
    vs.setHeight(1, 20);
    vs.setHeight(2, 40);
    vs.setHeight(3, 20);
    vs.setHeight(4, 10);
    expect(vs.getTotalHeight()).toBe(120);
  });

  it('returns correct visible range at top', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(1000);
    const range = vs.getVisibleRange(0, 200); // viewport shows 10 lines
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(11); // 0..10 visible + 1 partially visible
  });

  it('returns correct visible range in the middle', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(1000);
    const range = vs.getVisibleRange(500, 200); // scrolled 500px down
    // Line at 500px = line 25, viewport = 200px = 10 lines
    expect(range.startIndex).toBe(25);
    expect(range.endIndex).toBe(36); // includes partially visible line
  });

  it('applies overscan correctly', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 5 });
    vs.setCount(1000);
    const range = vs.getVisibleRange(500, 200);
    expect(range.startIndex).toBe(20); // 25 - 5 overscan
    expect(range.endIndex).toBe(41); // 36 + 5 overscan
  });

  it('clamps range to bounds', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 50 });
    vs.setCount(10);
    const range = vs.getVisibleRange(0, 200);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(9); // clamped to last line
  });

  it('handles empty line count', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(0);
    const range = vs.getVisibleRange(0, 200);
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(0);
    expect(range.offsets).toHaveLength(0);
  });

  it('returns correct line offsets', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(100);
    expect(vs.getOffset(0)).toBe(0);
    expect(vs.getOffset(1)).toBe(20);
    expect(vs.getOffset(10)).toBe(200);
  });

  it('scrollToLine returns correct offset', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(100);
    expect(vs.scrollToLine(50)).toBe(1000);
  });

  it('handles variable heights in visible range', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(10);
    vs.setHeight(0, 40);
    vs.setHeight(1, 60);
    vs.setHeight(2, 20);
    // offsets: 0, 40, 100, 120, ...
    const range = vs.getVisibleRange(40, 80); // starts at line 1
    expect(range.startIndex).toBe(1);
    // Line 1 at 40px (h=60), line 2 at 100px (h=20) -> endIndex
    expect(range.offsets[0]).toBe(40);
  });

  it('handles batch height updates', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(5);
    vs.setHeights(0, [10, 20, 30, 40, 50]);
    expect(vs.getTotalHeight()).toBe(150);
    expect(vs.getOffset(3)).toBe(60); // 10+20+30
  });

  it('grows capacity when setCount exceeds initial buffer', () => {
    const vs = new VirtualScroller({ defaultHeight: 20, overscan: 0 });
    vs.setCount(10);
    vs.setCount(100000);
    expect(vs.getTotalHeight()).toBe(100000 * 20);
  });
});
