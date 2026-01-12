'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiMessageSquare, FiAlertCircle, FiHelpCircle, FiSend, FiX, FiCheck, FiCamera, FiPaperclip, FiTrash2, FiImage } from 'react-icons/fi';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePathname } from 'next/navigation';
import { fetchWithToken } from '@/lib/tokenStorage';

type FeedbackType = 'doubt' | 'bug' | 'suggestion';

interface ConsoleLog {
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: string;
}

interface Attachment {
    name: string;
    type: string;
    data: string; // base64
    size: number;
}

export default function GlobalFeedbackWidget() {
    const { user } = useSupabaseAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>('doubt');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [capturingScreen, setCapturingScreen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const consoleLogs = useRef<ConsoleLog[]>([]);

    // Capturar erros e logs do console
    useEffect(() => {
        const maxLogs = 50;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        const addLog = (logType: ConsoleLog['type'], args: any[]) => {
            const logMessage = args.map(arg => {
                try {
                    if (typeof arg === 'object') {
                        return JSON.stringify(arg, null, 2).slice(0, 500);
                    }
                    return String(arg).slice(0, 500);
                } catch {
                    return '[Objeto não serializável]';
                }
            }).join(' ');

            consoleLogs.current.push({
                type: logType,
                message: logMessage.slice(0, 1000),
                timestamp: new Date().toISOString()
            });

            if (consoleLogs.current.length > maxLogs) {
                consoleLogs.current = consoleLogs.current.slice(-maxLogs);
            }
        };

        console.error = (...args) => {
            addLog('error', args);
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args) => {
            addLog('warn', args);
            originalConsoleWarn.apply(console, args);
        };

        const handleError = (event: ErrorEvent) => {
            addLog('error', [`[Unhandled Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            addLog('error', [`[Unhandled Promise Rejection] ${event.reason}`]);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    // Capturar screenshot da página
    const captureScreenshot = useCallback(async () => {
        try {
            setCapturingScreen(true);

            // Usar html2canvas se disponível
            const html2canvas = (await import('html2canvas')).default;

            // Esconder o widget antes de capturar
            const widgetElement = document.querySelector('[data-feedback-widget]');
            if (widgetElement) {
                (widgetElement as HTMLElement).style.display = 'none';
            }

            const canvas = await html2canvas(document.body, {
                logging: false,
                useCORS: true,
                allowTaint: true,
                scale: 0.5, // Reduzir qualidade para diminuir tamanho
                ignoreElements: (element) => {
                    return element.hasAttribute('data-feedback-widget');
                }
            });

            // Mostrar o widget novamente
            if (widgetElement) {
                (widgetElement as HTMLElement).style.display = '';
            }

            const screenshotData = canvas.toDataURL('image/jpeg', 0.6);
            setScreenshot(screenshotData);

        } catch (error) {
            console.error('Erro ao capturar screenshot:', error);
            alert('Não foi possível capturar a tela. Você pode anexar uma imagem manualmente.');
        } finally {
            setCapturingScreen(false);
        }
    }, []);

    // Handler para upload de arquivos
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const maxSize = 5 * 1024 * 1024; // 5MB
        const maxFiles = 3;

        if (attachments.length + files.length > maxFiles) {
            alert(`Máximo de ${maxFiles} arquivos permitidos.`);
            return;
        }

        Array.from(files).forEach(file => {
            if (file.size > maxSize) {
                alert(`Arquivo ${file.name} é muito grande. Máximo: 5MB`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    data: base64,
                    size: file.size
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setSending(true);

            const recentLogs = consoleLogs.current
                .filter(log => log.type === 'error' || log.type === 'warn')
                .slice(-30);

            // Coletar informações de performance
            const performanceInfo: Record<string, any> = {};
            if (typeof window !== 'undefined' && window.performance) {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigation) {
                    performanceInfo.pageLoadTime = Math.round(navigation.loadEventEnd - navigation.startTime);
                    performanceInfo.domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.startTime);
                    performanceInfo.timeToFirstByte = Math.round(navigation.responseStart - navigation.requestStart);
                }
                performanceInfo.memoryUsage = (performance as any).memory?.usedJSHeapSize
                    ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
                    : 'N/A';
            }

            const payload = {
                type,
                message,
                url: window.location.href,
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                userName: (user as any)?.name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Desconhecido',
                userEmail: user?.email || '',
                consoleLogs: recentLogs,
                browserInfo: {
                    language: navigator.language,
                    languages: navigator.languages?.join(', '),
                    platform: navigator.platform,
                    cookiesEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine,
                    deviceMemory: (navigator as any).deviceMemory || 'N/A',
                    hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
                    colorDepth: window.screen.colorDepth,
                    pixelRatio: window.devicePixelRatio,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    timestamp: new Date().toISOString(),
                    ...performanceInfo
                },
                screenshot: screenshot,
                attachments: attachments.map(a => ({
                    name: a.name,
                    type: a.type,
                    data: a.data,
                    size: a.size
                }))
            };

            const res = await fetchWithToken('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccess(true);
                setMessage('');
                setScreenshot(null);
                setAttachments([]);
                consoleLogs.current = [];
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

    if (!user) return null;

    const errorCount = consoleLogs.current.filter(l => l.type === 'error').length;
    const warnCount = consoleLogs.current.filter(l => l.type === 'warn').length;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] print:hidden" data-feedback-widget>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-abz-blue hover:bg-abz-blue-dark text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 flex items-center justify-center group relative"
                    title="Ajuda e Feedback"
                >
                    <FiMessageSquare className="w-6 h-6" />
                    {errorCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {errorCount}
                        </span>
                    )}
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out group-hover:pl-2 whitespace-nowrap text-sm font-medium">
                        Ajuda / Reportar
                    </span>
                </button>
            )}

            {isOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-80 sm:w-[420px] overflow-hidden border border-gray-100 animate-slide-up max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-abz-blue to-abz-blue-dark p-4 flex justify-between items-center text-white flex-shrink-0">
                        <h3 className="font-semibold flex items-center">
                            <FiMessageSquare className="mr-2" /> Central de Ajuda
                        </h3>
                        <div className="flex items-center gap-2">
                            {(errorCount > 0 || warnCount > 0) && (
                                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                                    {errorCount > 0 && <span className="text-red-200">{errorCount} erros</span>}
                                    {errorCount > 0 && warnCount > 0 && ' • '}
                                    {warnCount > 0 && <span className="text-yellow-200">{warnCount} avisos</span>}
                                </span>
                            )}
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1 transition">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
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
                        <div className="p-4 overflow-y-auto flex-1">
                            {/* Type Selection */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setType('doubt')}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${type === 'doubt' ? 'bg-white text-abz-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FiHelpCircle className="mr-1" /> Dúvida
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('bug')}
                                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium rounded-md transition-all ${type === 'bug' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FiAlertCircle className="mr-1" /> Erro
                                </button>
                                <button
                                    type="button"
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
                                        className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-abz-blue focus:border-abz-blue text-sm p-3 min-h-[80px] resize-none"
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

                                {/* Screenshot e Anexos */}
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={captureScreenshot}
                                            disabled={capturingScreen}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <FiCamera className="w-4 h-4" />
                                            {capturingScreen ? 'Capturando...' : 'Capturar Tela'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={attachments.length >= 3}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <FiPaperclip className="w-4 h-4" />
                                            Anexar Arquivo
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*,.pdf,.txt,.log"
                                            multiple
                                            onChange={handleFileUpload}
                                        />
                                    </div>

                                    {/* Preview do Screenshot */}
                                    {screenshot && (
                                        <div className="relative">
                                            <img
                                                src={screenshot}
                                                alt="Screenshot"
                                                className="w-full rounded-lg border border-gray-200 max-h-32 object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setScreenshot(null)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <FiX className="w-3 h-3" />
                                            </button>
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                                                📷 Screenshot capturado
                                            </span>
                                        </div>
                                    )}

                                    {/* Lista de Anexos */}
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((att, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <FiImage className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                        <span className="truncate">{att.name}</span>
                                                        <span className="text-gray-400 text-xs">({Math.round(att.size / 1024)}KB)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(idx)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Info sobre dados coletados */}
                                <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded space-y-1">
                                    <p>📊 Dados que serão enviados automaticamente:</p>
                                    <ul className="list-disc list-inside text-gray-500 space-y-0.5">
                                        <li>URL atual e dados do navegador</li>
                                        <li>Erros do console ({errorCount}) e avisos ({warnCount})</li>
                                        <li>Métricas de performance da página</li>
                                        {screenshot && <li>Screenshot da tela</li>}
                                        {attachments.length > 0 && <li>{attachments.length} arquivo(s) anexado(s)</li>}
                                    </ul>
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className={`w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-abz-blue hover:bg-abz-blue-dark'} transition-colors`}
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
