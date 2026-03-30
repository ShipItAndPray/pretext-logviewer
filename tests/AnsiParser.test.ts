import { describe, it, expect } from 'vitest';
import { parseAnsi, stripAnsi } from '../src/core/AnsiParser';

describe('AnsiParser', () => {
  it('parses plain text with no escapes', () => {
    const segments = parseAnsi('hello world');
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('hello world');
    expect(segments[0].color).toBeUndefined();
  });

  it('parses bold text', () => {
    const segments = parseAnsi('\x1b[1mBOLD\x1b[0m normal');
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0].bold).toBe(true);
    expect(segments[0].text).toBe('BOLD');
    expect(segments[1].text).toBe(' normal');
    expect(segments[1].bold).toBeUndefined();
  });

  it('parses standard foreground colors (30-37)', () => {
    const segments = parseAnsi('\x1b[31mred\x1b[0m');
    expect(segments[0].color).toBe('#cc0000');
    expect(segments[0].text).toBe('red');
  });

  it('parses bright foreground colors (90-97)', () => {
    const segments = parseAnsi('\x1b[92mbright green\x1b[0m');
    expect(segments[0].color).toBe('#55ff55');
  });

  it('parses background colors (40-47)', () => {
    const segments = parseAnsi('\x1b[44mblue bg\x1b[0m');
    expect(segments[0].bgColor).toBe('#0000cc');
  });

  it('parses 256-color foreground', () => {
    const segments = parseAnsi('\x1b[38;5;196mred256\x1b[0m');
    expect(segments[0].color).toBeDefined();
    expect(segments[0].text).toBe('red256');
  });

  it('parses 24-bit RGB foreground', () => {
    const segments = parseAnsi('\x1b[38;2;255;128;0morange\x1b[0m');
    expect(segments[0].color).toBe('rgb(255,128,0)');
    expect(segments[0].text).toBe('orange');
  });

  it('parses 24-bit RGB background', () => {
    const segments = parseAnsi('\x1b[48;2;0;100;200mbg\x1b[0m');
    expect(segments[0].bgColor).toBe('rgb(0,100,200)');
  });

  it('handles nested styles (bold + color)', () => {
    const segments = parseAnsi('\x1b[1;31mbold red\x1b[0m');
    expect(segments[0].bold).toBe(true);
    expect(segments[0].color).toBe('#cc0000');
  });

  it('handles italic, underline, dim, strikethrough', () => {
    const segments = parseAnsi('\x1b[3;4;2;9mstyled\x1b[0m');
    expect(segments[0].italic).toBe(true);
    expect(segments[0].underline).toBe(true);
    expect(segments[0].dim).toBe(true);
    expect(segments[0].strikethrough).toBe(true);
  });

  it('handles inverse video', () => {
    const segments = parseAnsi('\x1b[7;31minverse\x1b[0m');
    // With inverse, fg red becomes bg red
    expect(segments[0].bgColor).toBe('#cc0000');
  });

  it('handles reset in the middle', () => {
    const segments = parseAnsi('\x1b[1mbold\x1b[0m\x1b[4munderline\x1b[0m');
    expect(segments[0].bold).toBe(true);
    expect(segments[0].text).toBe('bold');
    expect(segments[1].underline).toBe(true);
    expect(segments[1].bold).toBeUndefined();
  });

  it('strips non-SGR escape codes', () => {
    const segments = parseAnsi('\x1b[2Jhello\x1b[1;1H');
    // Non-SGR codes should be stripped
    expect(segments.some((s) => s.text.includes('hello'))).toBe(true);
  });

  it('handles empty input', () => {
    const segments = parseAnsi('');
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('');
  });

  it('handles malformed sequences gracefully', () => {
    const segments = parseAnsi('\x1b[mhello');
    // \x1b[m is same as \x1b[0m (reset)
    expect(segments.some((s) => s.text.includes('hello'))).toBe(true);
  });

  it('parses 256-color grayscale', () => {
    const segments = parseAnsi('\x1b[38;5;240mgray\x1b[0m');
    expect(segments[0].color).toBeDefined();
    // Grayscale 240 = (240-232)*10 + 8 = 88
    expect(segments[0].color).toBe('rgb(88,88,88)');
  });
});

describe('stripAnsi', () => {
  it('removes all escape codes', () => {
    expect(stripAnsi('\x1b[1;31mhello\x1b[0m world')).toBe('hello world');
  });

  it('handles plain text', () => {
    expect(stripAnsi('no escapes')).toBe('no escapes');
  });

  it('handles multiple escape sequences', () => {
    expect(
      stripAnsi('\x1b[32m[\x1b[0m\x1b[1mINFO\x1b[0m\x1b[32m]\x1b[0m msg'),
    ).toBe('[INFO] msg');
  });
});
