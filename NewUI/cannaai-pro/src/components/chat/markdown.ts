import React from 'react';

export type MarkdownToken =
  | { type: 'text'; value: string }
  | { type: 'strong' | 'emphasis' | 'code'; value: string }
  | { type: 'link'; value: string; href: string };

export function tokenizeMarkdown(input: string): MarkdownToken[][] {
  return input.split('\n').map((line) => {
    const tokens: MarkdownToken[] = [];
    const pattern = /(\*\*(.+?)\*\*|\*([^*]+?)\*|`([^`]+?)`|\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\))/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line))) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', value: line.slice(lastIndex, match.index) });
      }

      if (match[2]) tokens.push({ type: 'strong', value: match[2] });
      else if (match[3]) tokens.push({ type: 'emphasis', value: match[3] });
      else if (match[4]) tokens.push({ type: 'code', value: match[4] });
      else if (match[5]) {
        tokens.push({ type: 'link', value: match[5], href: match[6] });
      } else {
        tokens.push({ type: 'text', value: match[0] });
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) tokens.push({ type: 'text', value: line.slice(lastIndex) });
    return tokens;
  });
}

export function SafeMarkdown({ content }: { content: string }) {
  const lines = tokenizeMarkdown(content);
  return lines.map((line, lineIndex) => React.createElement(
    React.Fragment,
    { key: `line-${lineIndex}` },
    ...line.map((token, tokenIndex) => {
      const key = `${lineIndex}-${tokenIndex}`;
      if (token.type === 'strong') return React.createElement('strong', { key }, token.value);
      if (token.type === 'emphasis') return React.createElement('em', { key }, token.value);
      if (token.type === 'code') return React.createElement('code', { key, className: 'bg-gray-800 px-1 py-0.5 rounded text-sm' }, token.value);
      if (token.type === 'link') return React.createElement('a', { key, href: token.href, target: '_blank', rel: 'noopener noreferrer', className: 'text-emerald-400 underline' }, token.value);
      return React.createElement(React.Fragment, { key }, token.value);
    }),
    lineIndex < lines.length - 1 ? React.createElement('br', { key: `break-${lineIndex}` }) : null,
  ));
}
