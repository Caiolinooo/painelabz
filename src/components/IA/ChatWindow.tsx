'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { IAChatMessage, IAChatSession } from '@/types/ia';
import MessageBubble from './MessageBubble';
import ChatSidebar from './ChatSidebar';
import ExchangeIntegrationModal from './ExchangeIntegrationModal';

interface Props {
  token: string;
}

export default function ChatWindow({ token }: Props) {
  const [sessions, setSessions] = useState<IAChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null); // ref para acesso imediato
  const [messages, setMessages] = useState<IAChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [hasExchange, setHasExchange] = useState(true); // default true to prevent flicker

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hdrs = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  // Sincronizar ref com estado
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/ia/sessions', { headers: hdrs() });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) { console.error('Erro sessões:', err); }
    finally { setSessionsLoading(false); }
  }, [hdrs]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Load Integrations
  useEffect(() => {
    async function loadIntegrations() {
      try {
        const res = await fetch('/api/user/integrations', { headers: hdrs() });
        const data = await res.json();
        const hasExch = data.integrations?.some((i: any) => i.provider === 'microsoft_exchange');
        setHasExchange(!!hasExch);
        if (!hasExch) {
          // Show popup after a small delay for better UX
          setTimeout(() => setShowExchangeModal(true), 1500);
        }
      } catch (err) {
        console.error('Erro ao carregar integrações:', err);
      }
    }
    loadIntegrations();
  }, [hdrs]);

  // Load messages
  const loadMessages = useCallback(async (sid: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ia/chat?session_id=${sid}`, { headers: hdrs() });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) { console.error('Erro msgs:', err); }
    finally { setIsLoading(false); }
  }, [hdrs]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    loadMessages(id);
  }, [loadMessages]);

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await fetch(`/api/ia/sessions?id=${id}`, { method: 'DELETE', headers: hdrs() });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) { setActiveSessionId(null); setMessages([]); }
  }, [activeSessionId, hdrs]);

  // Send message
  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isSending) return;
    setIsSending(true);
    setInput('');

    const currentSessionId = activeSessionIdRef.current; // usar ref para evitar latência

    const tempMsg: IAChatMessage = {
      id: `temp-${Date.now()}`, session_id: currentSessionId || '',
      role: 'user', content: msg, tokens_used: null, response_time_ms: null,
      metadata: {}, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST', headers: hdrs(),
        body: ***REMOVED*** session_id: currentSessionId, message: msg, stream: true }),
      });

      const newSid = res.headers.get('X-Session-Id');

      if (res.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('Sem stream');
        const decoder = new TextDecoder();
        let content = '';
        let buffer = '';
        setStreamingContent('');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const p = JSON.parse(line.slice(6));
              if (p.meta) { if (p.session_id && !currentSessionId) setActiveSessionId(p.session_id); loadSessions(); continue; }
              if (p.content) { content += p.content; setStreamingContent(content); }
              if (p.done && p.fullContent) {
                content = p.fullContent;
                if (!currentSessionId && newSid) setActiveSessionId(newSid);
              }
            } catch { /* skip */ }
          }
        }

        if (content) {
          setMessages(prev => [...prev, {
            id: `a-${Date.now()}`, session_id: currentSessionId || newSid || '',
            role: 'assistant', content, tokens_used: null, response_time_ms: null,
            metadata: {}, created_at: new Date().toISOString(),
          }]);
        }
        setStreamingContent('');
      } else {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.session_id && !currentSessionId) setActiveSessionId(data.session_id);
        if (data.message) setMessages(prev => [...prev, data.message]);
        loadSessions();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, session_id: activeSessionId || '', role: 'assistant',
        content: `❌ ${err instanceof Error ? err.message : 'Erro ao conectar'}`,
        tokens_used: null, response_time_ms: null, metadata: {}, created_at: new Date().toISOString(),
      }]);
    } finally { setIsSending(false); inputRef.current?.focus(); }
  }, [input, isSending, activeSessionId, hdrs, loadSessions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const suggestions = [
    { icon: '📊', text: 'Como estão minhas avaliações?' },
    { icon: '🏖️', text: 'Tenho férias pendentes?' },
    { icon: '💰', text: 'Status dos meus reembolsos' },
    { icon: '📋', text: 'Quais são minhas pendências?' },
  ];

  return (
    <div className="flex h-full bg-gray-50">
      {/* Mobile toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-2 z-50 p-2 bg-white text-gray-800 border border-gray-200 rounded-lg shadow-md hover:bg-gray-50 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block absolute lg:relative z-40 h-full`}>
        <ChatSidebar sessions={sessions} activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession} onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession} isLoading={sessionsLoading} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ExchangeIntegrationModal 
          isOpen={showExchangeModal} 
          onClose={() => setShowExchangeModal(false)} 
          token={token} 
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl">
                <span className="text-3xl text-white font-bold">IA</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">ABZ Assistant</h2>
              <p className="text-gray-500 max-w-md mb-8">
                Seu assistente inteligente para o Portal ABZ. Pergunte sobre avaliações, férias, reembolsos e mais.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm text-gray-700 text-left shadow-sm hover:shadow-md">
                    <span className="text-lg">{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {messages.map(m => <MessageBubble key={m.id} message={m} />)}
              {streamingContent && (
                <MessageBubble isStreaming message={{
                  id: 'streaming', session_id: '', role: 'assistant', content: streamingContent,
                  tokens_used: null, response_time_ms: null, metadata: {}, created_at: new Date().toISOString(),
                }} />
              )}
              {isSending && !streamingContent && (
                <div className="flex justify-start mb-4">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">IA</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Pergunte algo ao ABZ Assistant..." rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-4 py-3 text-sm transition-all outline-none max-h-32"
              style={{ minHeight: '44px' }} disabled={isSending} />
            <button onClick={handleSend} disabled={!input.trim() || isSending}
              className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all shadow-md hover:shadow-lg disabled:shadow-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
