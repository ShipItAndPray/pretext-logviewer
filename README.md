# @shipitandpray/pretext-logviewer

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://shipitandpray.github.io/pretext-logviewer/) [![GitHub](https://img.shields.io/github/stars/ShipItAndPray/pretext-logviewer?style=social)](https://github.com/ShipItAndPray/pretext-logviewer)

> **[View Live Demo](https://shipitandpray.github.io/pretext-logviewer/)**

Log viewer that handles 10M+ lines. ANSI colors. Instant search. Virtualized scroll that actually works with word-wrap.

[![npm](https://img.shields.io/npm/v/@shipitandpray/pretext-logviewer)](https://www.npmjs.com/package/@shipitandpray/pretext-logviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

`react-lazylog` is abandoned. `xterm.js` is a terminal emulator, not a log viewer. Neither handles word-wrap with virtualized scrolling correctly, because variable-height rows break traditional virtualization.

**pretext-logviewer** solves this by predicting line heights before rendering using character-width estimation (with optional `@pretext/core` integration for sub-pixel accuracy). The result: smooth 60fps scrolling through millions of lines with word-wrap enabled.

## Install

```bash
npm install @shipitandpray/pretext-logviewer
```

Optional (for accurate height prediction with word-wrap):
```bash
npm install @pretext/core
```

## Quick Start

```tsx
import { LogViewer } from '@shipitandpray/pretext-logviewer';

<LogViewer text={logContent} height={600} searchable wordWrap />
```

### From URL (streams large files)

```tsx
<LogViewer url="/api/logs/app.log" follow height="100vh" theme="dark" />
```

### Framework-agnostic (Svelte, Vue, vanilla JS)

```ts
import { LogViewerCore } from '@shipitandpray/pretext-logviewer';

const core = new LogViewerCore({ containerWidth: 800, wordWrap: true });
core.loadText(hugeLogString);

const { startIndex, endIndex, lines, offsets } = core.getVisibleRange(scrollTop, 600);
// Render `lines` however you want
```

## Features

### ANSI Color Support

Full SGR support: 16-color, 256-color, 24-bit RGB, bold, italic, underline, dim, strikethrough, inverse.

### Virtualized Scrolling

Only renders visible lines + overscan buffer. Uses binary search on prefix-sum height arrays for O(log n) lookups.

### Search

Regex and plain-text search across all lines. Search runs in chunks with `setTimeout(0)` yields for files over 1M lines.

Press `Ctrl+F` to open the search bar. Navigate results with Enter/Shift+Enter.

### Streaming / Follow Mode

```tsx
<LogViewer url="/api/logs/live" follow />
```

Auto-scrolls to bottom on new lines. Pauses when user scrolls up. Shows "Jump to bottom" button.

### Word-Wrap with Accurate Heights

The hard problem: when lines wrap, row heights vary, and traditional virtualized scrolling breaks. This library predicts wrapped heights using character-width estimation, enabling smooth scrolling even with word-wrap enabled on 10M+ lines.

## Architecture

```
                     +-------------------+
                     |   LogViewerCore   |  Framework-agnostic engine
                     +-------------------+
                     |  rawLines[]       |  Flat string array
                     |  parsedLines[]    |  ANSI-parsed LogLine[]
                     |  VirtualScroller  |  Height map + prefix sums
                     |  SearchEngine     |  Full-text search
                     +-------------------+
                              |
              +---------------+---------------+
              |                               |
      +-------v--------+            +--------v--------+
      | React LogViewer |            |  Your Framework  |
      | (LogViewer.tsx) |            |  (use Core API)  |
      +----------------+            +-----------------+
```

**Height prediction flow:**
1. Line loaded -> strip ANSI codes -> measure plain text length
2. Calculate `charsPerLine = containerWidth / charWidth`
3. Calculate `wrappedLines = ceil(textLength / charsPerLine)`
4. Height = `wrappedLines * lineHeight`
5. Store in `Float32Array` height map
6. Prefix sums enable O(log n) binary search for scroll position

## Comparison

| Feature | pretext-logviewer | react-lazylog | xterm.js |
|---------|------------------|--------------|----------|
| Max lines tested | 10M+ | ~100K | ~1M |
| Word-wrap + virtualization | Yes | No | No |
| ANSI color support | Full (24-bit) | Partial | Full |
| Search | Yes (regex) | No | Find plugin |
| Streaming/follow | Yes | Yes | Yes |
| Framework-agnostic | Yes (Core class) | React only | Yes |
| Maintained | Yes | No (abandoned) | Yes |
| Bundle size | ~20KB gzipped | ~40KB | 600KB+ |

## Performance Targets

| Metric | Target |
|--------|--------|
| Load 1M lines | < 2s |
| Load 10M lines | < 15s |
| Scroll FPS (10M lines) | 60fps |
| Search 1M lines | < 500ms |
| Search 10M lines | < 5s |
| Memory (1M lines) | < 200MB |
| Initial render | < 100ms |
| Bundle size | < 25KB gzipped |

## API Reference

### `<LogViewer>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | - | Raw log text |
| `lines` | `string[]` | - | Array of log lines |
| `url` | `string` | - | URL to fetch log from (streamed) |
| `stream` | `ReadableStream` | - | Stream source |
| `height` | `number \| string` | `600` | Container height |
| `width` | `number \| string` | `'100%'` | Container width |
| `fontSize` | `number` | `14` | Font size in px |
| `fontFamily` | `string` | `monospace` | Font family |
| `wordWrap` | `boolean` | `false` | Enable word wrapping |
| `showLineNumbers` | `boolean` | `true` | Show line numbers |
| `showLevelBadges` | `boolean` | `true` | Show log level badges |
| `searchable` | `boolean` | `true` | Enable Ctrl+F search |
| `follow` | `boolean` | `false` | Auto-scroll to bottom |
| `theme` | `'dark' \| 'light' \| LogViewerTheme` | `'dark'` | Color theme |
| `highlightLines` | `number[]` | - | Line indices to highlight |
| `onLineClick` | `(line, index) => void` | - | Line click handler |

### `LogViewerCore` (Framework-agnostic)

```ts
const core = new LogViewerCore(options);
core.loadText(text);
core.loadLines(lines);
core.appendLine(line);
core.appendLines(lines);
core.getVisibleRange(scrollTop, viewportHeight);
core.search(query, options);
core.getTotalHeight();
core.getLineOffset(index);
core.scrollToLine(index);
core.setContainerWidth(width);
core.setFont(font);
core.setWordWrap(enabled);
core.getLineCount();
core.destroy();
```

### Hooks

```ts
import { useLogViewer, useLogStream } from '@shipitandpray/pretext-logviewer';

const { core, loadText, loadLines, search, lineCount } = useLogViewer(options);
const { lines, lineCount, isStreaming, stop } = useLogStream(source, options);
```

## Demo

```bash
npm run demo:dev
```

Open `http://localhost:5173/demo/` to see the interactive demo with 100K lines, search, word-wrap toggle, and file upload.

## Development

```bash
npm install
npm run build        # tsup -> dist/ (ESM + CJS)
npm test             # vitest
npm run demo:dev     # vite dev server for demo
```

## License

MIT
