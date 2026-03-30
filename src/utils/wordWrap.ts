/**
 * Word-wrap calculation utilities.
 *
 * Given a line of text, container width, and character width,
 * compute how many visual lines the text occupies when wrapped.
 */

/**
 * Calculate the number of wrapped visual lines for a given text string.
 */
export function countWrappedLines(
  text: string,
  containerWidth: number,
  charWidth: number,
): number {
  if (text.length === 0) return 1;
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  return Math.ceil(text.length / charsPerLine);
}

/**
 * Split a line into wrapped segments at word boundaries when possible.
 * Falls back to character-level splitting if a single word exceeds the width.
 */
export function wrapLine(
  text: string,
  containerWidth: number,
  charWidth: number,
): string[] {
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  if (text.length <= charsPerLine) return [text];

  const lines: string[] = [];
  const words = text.split(/(\s+)/); // preserve whitespace
  let current = '';

  for (const word of words) {
    if (current.length + word.length <= charsPerLine) {
      current += word;
    } else if (current.length === 0) {
      // Word is longer than a line -- split at char boundary
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
      // Start new line with this word (which may itself need splitting)
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
