'use strict';

/**
 * cli-format.js
 *
 * Terminal formatting helpers for the interactive CLI.
 * No ANSI colors yet — color/typography decision deferred until
 * we settle on the interaction surface (terminal vs web vs both).
 *
 * The current style is austere and archival: heavy use of section
 * breaks, consistent indentation, monospace-friendly line widths.
 */

function section(title) {
  const bar = '─'.repeat(72);
  return `\n${bar}\n  ${title}\n${bar}\n`;
}

function subsection(title) {
  return `\n  ${title}\n  ${'─'.repeat(Math.max(8, 68 - title.length))}\n`;
}

function indent(text, spaces = 2) {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map((line) => prefix + line).join('\n');
}

function wrap(text, width = 70) {
  // Simple word-wrap
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

function numberedChoice(prompt, choices) {
  // choices: [{ key: '1', label: 'Write your own policy' }, ...]
  const lines = [prompt];
  for (const c of choices) {
    lines.push(`  [${c.key}] ${c.label}`);
  }
  return lines.join('\n') + '\n> ';
}

function pause(prompt = 'Press Enter to continue...') {
  return prompt;
}

module.exports = {
  section,
  subsection,
  indent,
  wrap,
  numberedChoice,
  pause,
};