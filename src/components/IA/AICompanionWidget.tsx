'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiMic,
  FiMicOff,
  FiX,
  FiSend,
  FiVolume2,
  FiVolumeX,
  FiZap
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import AnimatedABZLogo, { AICompanionStatus } from './AnimatedABZLogo';
import { portalActionBus, AICommandPayload } from '@/lib/ia/portal-action-bus';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';

export default function AICompanionWidget() {
  const { user, getToken } = useSupabaseAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AICompanionStatus>('idle');
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Olá! Sou o Assistente ABZ. Como posso te ajudar ou controlar o portal hoje?' }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Registra o Next.js router no barramento de ações para navegação SPA
  useEffect(() => {
    portalActionBus.setRouter(router);
  }, [router]);

  // Escuta comandos disparados pela IA via Barramento de Ações
  useEffect(() => {
    const unsubscribe = portalActionBus.subscribe((cmd: AICommandPayload) => {
      if (cmd.label) {
        setActionLabel(cmd.label);
        setStatus('executing');

        // Limpa timeout anterior para evitar race condition
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }

        // Retorna ao estado idle após execução da ação
        statusTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
          setActionLabel(null);
          statusTimeoutRef.current = null;
        }, 3500);
      }
    });

    return () => {
      unsubscribe();
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Rola automaticamente para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Manipulador de envio de comandos/perguntas
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const userQuery = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setStatus('speaking');

    try {
      const token = getToken();
      if (!token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const res = await fetch('/api/ia/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: userQuery })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no assistente');

      setMessages(prev => [...prev, { sender: 'ai', text: data.reply || 'Comando processado com sucesso.' }]);

      // Se a resposta contiver comandos para a UI
      if (data.commands && Array.isArray(data.commands)) {
        data.commands.forEach((cmd: AICommandPayload) => {
          portalActionBus.dispatch(cmd);
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao comunicar com o assistente';
      console.error('[AI Companion Widget] Erro:', err);
      toast.error(message);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
    } finally {
      setStatus('idle');
    }
  }, [inputText, getToken]);

  // Alternar gravação de voz (simulação / pré-requisito Moshi)
  const toggleVoiceMode = useCallback(() => {
    if (status === 'listening') {
      setStatus('idle');
      toast.success('Gravação encerrada');
    } else {
      setStatus('listening');
      toast('Ouvindo... Fale o seu comando', { icon: '🎙️' });
    }
  }, [status]);

  return (
    <>
      {/* 1. Indicador Flutuante de Ação em Execução */}
      {actionLabel && (
        <div className="fixed bottom-24 right-24 z-[70] bg-gray-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-blue-500/40 flex items-center gap-2.5 animate-bounce">
          <FiZap className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>{actionLabel}</span>
        </div>
      )}

      {/* 2. Botão Flutuante do Pet / Companion (ao lado do HelpWidget) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-24 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          status === 'executing'
            ? 'bg-emerald-600 scale-110 ring-4 ring-emerald-300'
            : status === 'listening'
            ? 'bg-purple-600 animate-pulse ring-4 ring-purple-300'
            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:scale-105'
        }`}
        style={{ boxShadow: '0 4px 25px rgba(0, 91, 150, 0.45)' }}
        title="Assistente Virtual ABZ"
      >
        {isOpen ? (
          <FiX className="w-6 h-6 text-white" />
        ) : (
          <div className="relative flex items-center justify-center">
            <AnimatedABZLogo status={status} size={32} />
          </div>
        )}
      </button>

      {/* 3. Painel Expandido de Interação e Voz da IA */}
      {isOpen && (
        <div className="fixed bottom-24 right-24 z-[70] w-[390px] h-[520px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 font-plus-jakarta">
          {/* Header do Painel */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <AnimatedABZLogo status={status} size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  ABZ Companion
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                </h3>
                <p className="text-[11px] text-blue-100/90">Assistente de Controle do Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/80 hover:text-white"
                title={isAudioMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
              >
                {isAudioMuted ? <FiVolumeX className="w-4 h-4" /> : <FiVolume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área de Visualização do Pet Animado e Status de Voz */}
          <div className="bg-gradient-to-b from-blue-50/50 to-white p-4 border-b flex flex-col items-center justify-center relative">
            <div className="py-2">
              <AnimatedABZLogo status={status} size={64} />
            </div>
            <p className="text-xs font-medium text-gray-600 mt-1 capitalize">
              {status === 'idle' && 'Pronto para ajudar'}
              {status === 'listening' && '🎙️ Ouvindo seu comando...'}
              {status === 'speaking' && '🗣️ Processando resposta...'}
              {status === 'executing' && '⚡ Executando ação no portal...'}
            </p>
          </div>

          {/* Histórico de Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm min-h-0 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Entrada e Ativação de Voz */}
          <div className="p-3 bg-white border-t flex items-center gap-2">
            <button
              onClick={toggleVoiceMode}
              className={`p-2.5 rounded-xl transition-all ${
                status === 'listening'
                  ? 'bg-red-500 text-white animate-bounce'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Ativar Microfone"
            >
              {status === 'listening' ? <FiMicOff className="w-4 h-4" /> : <FiMic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder="Digite um comando..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-gray-100 border-0 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
