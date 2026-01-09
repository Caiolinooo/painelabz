'use client';

import React, { useState } from 'react';
import { FiMessageSquare, FiAlertCircle, FiHelpCircle, FiSend, FiX, FiCheck } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { fetchWithToken } from '@/lib/tokenStorage';

type FeedbackType = 'doubt' | 'bug' | 'suggestion';

export default function GlobalFeedbackWidget() {
    const { user } = useSupabaseAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>('doubt');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setSending(true);
            const payload = {
                type,
                message,
                url: window.location.href,
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`
            };

            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccess(true);
                setMessage('');
                setTimeout(() => {
                    setSuccess(false);
                    setIsOpen(false);
                }, 2000);
            } else {
                alert('Erro ao enviar feedback. Tente novamente.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão.');
        } finally {
            setSending(false);
        }
    };

    // Only show for logged in users? Assuming yes based on context
    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] print:hidden">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-abz-blue hover:bg-abz-blue-dark text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 flex items-center justify-center group"
                    title="Ajuda e Feedback"
                >
                    <FiMessageSquare className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out group-hover:pl-2 whitespace-nowrap text-sm font-medium">
                        Ajuda / Reportar
                    </span>
                </button>
            )}

            {isOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-80 sm:w-96 overflow-hidden border border-gray-100 animate-slide-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-abz-blue to-abz-blue-dark p-4 flex justify-between items-center text-white">
                        <h3 className="font-semibold flex items-center">
                            <FiMessageSquare className="mr-2" /> Central de Ajuda
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1 transition">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {success ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <FiCheck className="w-8 h-8" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800">Obrigado!</h4>
                            <p className="text-gray-600 text-sm">Seu feedback foi recebido e será analisado pela equipe.</p>
                        </div>
                    ) : (
                        <div className="p-4">
                            {/* Type Selection */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button
                                    onClick={() => setType('doubt')}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${type === 'doubt' ? 'bg-white text-abz-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FiHelpCircle className="mr-1" /> Dúvida
                                </button>
                                <button
                                    onClick={() => setType('bug')}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${type === 'bug' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FiAlertCircle className="mr-1" /> Erro
                                </button>
                                <button
                                    onClick={() => setType('suggestion')}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${type === 'suggestion' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FiMessageSquare className="mr-1" /> Sugestão
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {type === 'doubt' && 'Qual sua dúvida?'}
                                        {type === 'bug' && 'O que aconteceu de errado?'}
                                        {type === 'suggestion' && 'Qual sua ideia?'}
                                    </label>
                                    <textarea
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-abz-blue focus:border-abz-blue text-sm p-3 min-h-[100px]"
                                        placeholder={
                                            type === 'doubt' ? 'Não estou conseguindo encontrar...' :
                                                type === 'bug' ? 'Ao clicar no botão X, a página travou...' :
                                                    'Seria legal se...'
                                        }
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                    />
                                </div>

                                {type === 'bug' && (
                                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                                        Anexaremos automaticamente a URL atual e dados do navegador para ajudar na análise.
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-abz-blue hover:bg-abz-blue-dark'} transition-colors`}
                                >
                                    {sending ? 'Enviando...' : (
                                        <>
                                            <FiSend className="mr-2" /> Enviar Feedback
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
