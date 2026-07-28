import React from 'react';

/** Safe URL for markdown links — http(s), mailto, or same-origin relative path. */
function isSafeHref(href: string): boolean {
  const t = href.trim();
  if (!t) return false;
  if (t.startsWith('/') && !t.startsWith('//')) return true;
  if (/^mailto:[^\s]+$/i.test(t)) return true;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function processInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="bg-gray-100 text-pink-600 px-1 rounded text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (isSafeHref(href)) {
        const external = /^https?:\/\//i.test(href.trim());
        return (
          <a
            key={i}
            href={href.trim()}
            className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {label}
          </a>
        );
      }
      return <span key={i}>{label}</span>;
    }
    return part;
  });
}

/**
 * Lightweight markdown for IA chat bubbles (same approach as MessageBubble).
 * No raw HTML — only React text nodes + allowlisted tags. Safe from XSS.
 */
export function renderChatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3);
      const nl = code.indexOf('\n');
      const content = nl > 0 ? code.slice(nl + 1) : code;
      return (
        <pre
          key={i}
          className="bg-gray-900 text-gray-100 rounded-lg p-2.5 my-1.5 overflow-x-auto text-[0.85em]"
        >
          <code>{content}</code>
        </pre>
      );
    }
    return part.split('\n').map((line, j) => {
      if (line.startsWith('### '))
        return (
          <h4 key={`${i}-${j}`} className="font-semibold text-[0.95em] mt-1.5 mb-0.5">
            {processInline(line.slice(4))}
          </h4>
        );
      if (line.startsWith('## '))
        return (
          <h3 key={`${i}-${j}`} className="font-bold mt-1.5 mb-0.5">
            {processInline(line.slice(3))}
          </h3>
        );
      if (line.match(/^[\-\*]\s/))
        return (
          <li key={`${i}-${j}`} className="ml-4 list-disc">
            {processInline(line.slice(2))}
          </li>
        );
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        return (
          <li key={`${i}-${j}`} className="ml-4 list-decimal">
            {processInline(content)}
          </li>
        );
      }
      if (!line.trim()) return <br key={`${i}-${j}`} />;
      return (
        <p key={`${i}-${j}`} className="mb-1 last:mb-0">
          {processInline(line)}
        </p>
      );
    });
  });
}

export function stripReasoningBlocks(text: string): string {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
  cleaned = cleaned.replace(/<thought>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/<reasoning>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/<\/?thought>/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  cleaned = cleaned.replace(/<\/?reasoning>/gi, '');
  return cleaned.trim();
}
