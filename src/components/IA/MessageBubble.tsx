'use client';

import React from 'react';
import type { IAChatMessage } from '@/types/ia';

interface Props {
  message: IAChatMessage;
  isStreaming?: boolean;
}

function processInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-gray-100 text-pink-600 px-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3);
      const nl = code.indexOf('\n');
      const content = nl > 0 ? code.slice(nl + 1) : code;
      return (
        <pre key={i} className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          <code>{content}</code>
        </pre>
      );
    }
    return part.split('\n').map((line, j) => {
      if (line.startsWith('### ')) return <h4 key={`${i}-${j}`} className="font-semibold text-sm mt-2 mb-1">{processInline(line.slice(4))}</h4>;
      if (line.startsWith('## ')) return <h3 key={`${i}-${j}`} className="font-bold mt-2 mb-1">{processInline(line.slice(3))}</h3>;
      if (line.match(/^[\-\*]\s/)) return <li key={`${i}-${j}`} className="ml-4 list-disc">{processInline(line.slice(2))}</li>;
      if (!line.trim()) return <br key={`${i}-${j}`} />;
      return <p key={`${i}-${j}`} className="mb-1">{processInline(line)}</p>;
    });
  });
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';
  if (message.role === 'system') return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">IA</span>
          </div>
        </div>
      )}
      <div className="max-w-[80%]">
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md shadow-md'
            : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
        }`}>
          <div className="text-sm leading-relaxed">
            {isUser ? message.content : renderContent(message.content)}
            {isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />}
          </div>
        </div>
        <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-gray-400">
            {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.response_time_ms && !isUser && (
            <span className="text-[10px] text-gray-300">{(message.response_time_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">EU</span>
          </div>
        </div>
      )}
    </div>
  );
}
