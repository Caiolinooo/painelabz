'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-hot-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useSignature } from '@/contexts/SignatureContext';
import {
    FiCalendar, FiMapPin, FiUsers, FiClock, FiCheck,
    FiAlertCircle, FiRefreshCcw, FiLock, FiEdit3, FiUser, FiX, FiGlobe
} from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';


interface PublicLista {
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    local: string | null;
    pauta: string | null;
    status: string;
    requer_token: boolean;
    total_participantes: number;
    max_participantes: number | null;
}

export default function PublicListaPage() {
    const params = useParams();
    const linkUnico = params?.linkUnico as string;
    const { isAuthenticated, profile, user, loginWithPassword } = useSupabaseAuth();
    const { requestSignature, hasSignature } = useSignature();
    const { t, locale, setLocale } = useI18n();
    const [showLangModal, setShowLangModal] = useState(false);

    // Exibir o modal de seleção de idioma condicionalmente no mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const chosen = sessionStorage.getItem('presenca_lang_chosen');
            if (!chosen) {
                setShowLangModal(true);
            }
        }
    }, []);

    const handleConfirmLang = () => {
        sessionStorage.setItem('presenca_lang_chosen', 'true');
        setShowLangModal(false);
    };


    const [lista, setLista] = useState<PublicLista | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tokenInput, setTokenInput] = useState('');
    const [isTokenVerified, setIsTokenVerified] = useState(false);

    // Visitor form
    const [visitorName, setVisitorName] = useState('');
    const [visitorRole, setVisitorRole] = useState('');
    const [visitorCompany, setVisitorCompany] = useState('');
    const sigCanvasRef = useRef<SignatureCanvas>(null);
    const [signatureDrawn, setSignatureDrawn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Identification Modal & Login
    const [showIdModal, setShowIdModal] = useState(false);
    const [isIdModalDismissed, setIsIdModalDismissed] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Fetch list data
    useEffect(() => {
        const fetchList = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/lista-presenca/public?link=${linkUnico}`);
                const data = await res.json();
                if (data.success) {
                    setLista(data.lista);
                    if (!data.lista.requer_token) setIsTokenVerified(true);
                } else {
                    setError(data.error || t('lista_presenca.publica.erro_nao_encontrada', 'Lista não encontrada'));
                }
            } catch {
                setError(t('lista_presenca.publica.erro_carregar', 'Erro ao carregar lista'));
            } finally {
                setIsLoading(false);
            }

        };
        if (linkUnico) fetchList();
    }, [linkUnico]);

    // Initial load: determine if we should popup the identification modal
    useEffect(() => {
        if (!isLoading && lista && !isAuthenticated && !isIdModalDismissed) {
            setShowIdModal(true);
        }
    }, [isLoading, lista, isAuthenticated, isIdModalDismissed]);

    // Pre-fill for authenticated users
    useEffect(() => {
        if (isAuthenticated && profile) {
            setVisitorName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
            setVisitorRole(profile.role || '');
            setVisitorCompany('ABZ Group');
        }
    }, [isAuthenticated, profile]);

    // Submit for authenticated user (uses global signature)
    const handleAuthenticatedSubmit = async () => {
        if (!lista || !user) return;

        const result = await requestSignature({
            title: t('lista_presenca.publica.modal_titulo', 'Registrar Presença'),
            description: t('lista_presenca.publica.modal_descricao', { titulo: lista.titulo }, `Confirme sua identidade para registrar presença em "${lista.titulo}"`),
        });
        if (!result) return;


        try {
            setIsSubmitting(true);
            const res = await fetch('/api/lista-presenca/registros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lista_id: lista.id,
                    nome_completo: visitorName,
                    funcao: visitorRole,
                    empresa: visitorCompany,
                    assinatura_url: result.signatureUrl,
                    user_id: user.id,
                    token_acesso: tokenInput || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                toast.success(t('lista_presenca.publica.sucesso_registro', 'Presença registrada!'));
            } else {
                toast.error(data.error || t('lista_presenca.publica.erro_registro', 'Erro ao registrar'));
            }
        } catch {
            toast.error(t('lista_presenca.publica.erro_geral', 'Erro ao registrar presença'));
        } finally {
            setIsSubmitting(false);
        }

    };

    // Submit for visitor (uses canvas signature)
    const handleVisitorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lista) return;

        if (!visitorName.trim()) { toast.error(t('lista_presenca.publica.erro_nome_vazio', 'Informe seu nome completo')); return; }
        if (!signatureDrawn || sigCanvasRef.current?.isEmpty()) { toast.error(t('lista_presenca.publica.erro_assinatura_vazia', 'Desenhe sua assinatura')); return; }


        const signatureBase64 = sigCanvasRef.current?.getCanvas().toDataURL('image/png');

        try {
            setIsSubmitting(true);
            const res = await fetch('/api/lista-presenca/registros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lista_id: lista.id,
                    nome_completo: visitorName.trim(),
                    funcao: visitorRole.trim() || null,
                    empresa: visitorCompany.trim() || null,
                    assinatura_base64: signatureBase64,
                    token_acesso: tokenInput || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                toast.success(t('lista_presenca.publica.sucesso_registro', 'Presença registrada!'));
            } else {
                toast.error(data.error || t('lista_presenca.publica.erro_registro', 'Erro ao registrar'));
            }
        } catch {
            toast.error(t('lista_presenca.publica.erro_geral', 'Erro ao registrar presença'));
        } finally {
            setIsSubmitting(false);
        }

    };

    const handleInlineLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        if (!loginEmail || !loginPassword) {
            setLoginError(t('lista_presenca.publica.erro_login_campos', 'Preencha os campos'));
            return;
        }

        setIsLoggingIn(true);
        try {
            const success = await loginWithPassword(loginEmail, loginPassword, false);
            if (success) {
                setShowIdModal(false);
                setIsIdModalDismissed(true);
                toast.success(t('lista_presenca.publica.sucesso_login', 'Autenticado com sucesso!'));
                // Os hooks globais atualizados cuidarão de renderizar o form bloqueado e trazer a global signature.
            } else {
                setLoginError(t('lista_presenca.publica.erro_credenciais', 'Credenciais inválidas'));
            }
        } catch (err) {
            setLoginError(t('lista_presenca.publica.erro_login_tentativa', 'Erro ao tentar login. Tente novamente.'));
        } finally {
            setIsLoggingIn(false);
        }

    };

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    const formatTime = (t: string | null) => t ? t.slice(0, 5) : '';

    // Render
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <FiAlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('lista_presenca.publica.lista_indisponivel', 'Lista Indisponível')}</h2>
                    <p className="text-sm text-gray-500">{error}</p>

                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t('lista_presenca.publica.presenca_registrada', 'Presença Registrada!')}</h2>
                    <p className="text-sm text-gray-500 mb-1">{lista?.titulo}</p>
                    <p className="text-xs text-gray-400">{t('lista_presenca.publica.assinatura_sucesso', 'Sua assinatura foi registrada com sucesso.')}</p>

                </div>
            </div>
        );
    }

    // Token wall
    if (lista?.requer_token && !isTokenVerified) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
                    <FiLock className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">{lista.titulo}</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">{t('lista_presenca.publica.token_requerido', 'Esta lista requer um token de acesso.')}</p>
                    <input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={t('lista_presenca.publica.token_placeholder', 'Digite o token de acesso')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none mb-4"
                    />
                    <button onClick={() => setIsTokenVerified(true)} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm">
                        {t('lista_presenca.publica.acessar', 'Acessar')}
                    </button>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8 relative">
            {/* Identification Modal */}
            {showIdModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
                                <FiUser className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{t('lista_presenca.publica.identificacao_necessaria', 'Identificação Necessária')}</h3>
                            <p className="text-sm text-center text-gray-500 mb-6">
                                {t('lista_presenca.publica.identificacao_subtitulo', 'Para assinar esta lista, primeiro precisamos saber quem é você.')}
                            </p>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('lista_presenca.publica.sou_colaborador', 'Já sou colaborador ABZ Group')}</h4>
                                    <form onSubmit={handleInlineLogin} className="space-y-3">
                                        <input 
                                            type="email" 
                                            placeholder={t('lista_presenca.publica.email', 'E-mail')} 
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                        />
                                        <input 
                                            type="password" 
                                            placeholder={t('lista_presenca.publica.senha', 'Senha')} 
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                        />
                                        {loginError && <p className="text-xs text-red-500">{loginError}</p>}
                                        <button 
                                            type="submit" 
                                            disabled={isLoggingIn}
                                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center justify-center"
                                        >
                                            {isLoggingIn ? t('lista_presenca.publica.entrando', 'Entrando...') : t('lista_presenca.publica.fazer_login_assinar', 'Fazer Login e Assinar')}
                                        </button>
                                    </form>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-400">{t('lista_presenca.publica.ou', 'ou')}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setShowIdModal(false); setIsIdModalDismissed(true); }}
                                    className="w-full py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                                >
                                    {t('lista_presenca.publica.sou_visitante', 'Sou Apenas Visitante')}
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
                {/* ABZ Header */}
                <div className="text-center pt-2">
                    <img src="/images/logo.png" alt="ABZ Group" className="h-10 sm:h-12 mx-auto mb-3" onError={(e) => { (e.target as HTMLImageElement).src = '/images/LC1_Azul.png'; }} />
                    <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest font-medium">{t('lista_presenca.publica.lista_cabecalho', 'Lista de Presença / Attendance List')}</p>
                </div>


                {/* Event Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h1 className="text-lg font-bold text-gray-900 mb-3">{lista?.titulo}</h1>
                    <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 text-gray-400" />
                            {lista ? formatDate(lista.data_evento) : ''}
                            {lista?.hora_inicio && <span className="text-gray-400 ml-1">{formatTime(lista.hora_inicio)}{lista.hora_fim ? ` – ${formatTime(lista.hora_fim)}` : ''}</span>}
                        </div>
                        {lista?.local && <div className="flex items-center gap-2"><FiMapPin className="w-4 h-4 text-gray-400" />{lista.local}</div>}
                        <div className="flex items-center gap-2">
                            <FiUsers className="w-4 h-4 text-gray-400" />
                            {lista?.total_participantes} {lista?.total_participantes === 1 ? t('lista_presenca.publica.participante', 'participante') : t('lista_presenca.publica.participantes', 'participantes')}{lista?.max_participantes ? ` / ${lista.max_participantes}` : ''}
                        </div>

                    </div>
                    {lista?.pauta && <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">{lista.pauta}</div>}
                </div>

                {/* Sign Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FiEdit3 className="w-4 h-4 text-blue-600" />
                        {t('lista_presenca.publica.registrar_presenca', 'Registrar Presença')}
                    </h2>

                    <form onSubmit={isAuthenticated ? (e) => { e.preventDefault(); handleAuthenticatedSubmit(); } : handleVisitorSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('lista_presenca.publica.nome_completo_label', 'Nome Completo *')}</label>
                            <input type="text" required value={visitorName} onChange={(e) => setVisitorName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('lista_presenca.publica.funcao_label', 'Função')}</label>
                                <input type="text" value={visitorRole} onChange={(e) => setVisitorRole(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('lista_presenca.publica.empresa_label', 'Empresa')}</label>
                                <input type="text" value={visitorCompany} onChange={(e) => setVisitorCompany(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                            </div>
                        </div>


                        {/* Signature Area */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('lista_presenca.publica.assinatura_label', 'Assinatura *')}</label>
                            {isAuthenticated && hasSignature ? (
                                <div className="text-center py-3">
                                    <p className="text-sm text-green-600 mb-2 flex items-center justify-center gap-1.5">
                                        <FiCheck className="w-4 h-4" />
                                        {t('lista_presenca.publica.assinatura_vinculada', 'Assinatura vinculada ao seu perfil')}
                                    </p>
                                    <p className="text-xs text-gray-400">{t('lista_presenca.publica.assinatura_vinculada_desc', 'Clique em "Registrar" para usar sua assinatura cadastrada.')}</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 relative">
                                        <SignatureCanvas
                                            ref={sigCanvasRef}
                                            penColor="black"
                                            canvasProps={{ className: 'w-full rounded-xl', style: { height: '160px' } }}
                                            onEnd={() => setSignatureDrawn(true)}
                                        />
                                        {!signatureDrawn && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                                                {t('lista_presenca.publica.assine_aqui', 'Assine aqui')}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { sigCanvasRef.current?.clear(); setSignatureDrawn(false); }}
                                        className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        <FiRefreshCcw className="w-3 h-3" />
                                        {t('lista_presenca.publica.limpar', 'Limpar')}
                                    </button>
                                </div>
                            )}
                        </div>


                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium text-sm"
                        >
                            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <FiCheck className="w-4 h-4" />}
                            {isSubmitting ? t('lista_presenca.publica.registrando', 'Registrando...') : t('lista_presenca.publica.registrar_presenca', 'Registrar Presença')}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-gray-400">{t('lista_presenca.publica.rodape', 'Portal ABZ Group — Controle de Presença (AN-QUA-001)')}</p>

            </div>

            {/* Blocking Language Selection Modal */}
            {showLangModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4 text-blue-600">
                                <FiGlobe className="w-8 h-8 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 leading-snug">
                                Escolha seu Idioma / Choose your Language
                            </h3>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                Selecione o idioma para prosseguir com o preenchimento da lista de presença.
                            </p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {/* PT-BR Button */}
                            <button
                                type="button"
                                onClick={() => setLocale('pt-BR')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    locale === 'pt-BR'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <span className="text-2xl">🇧🇷</span>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Português</p>
                                        <p className="text-slate-500 text-xs">Brasil</p>
                                    </div>
                                </div>
                                {locale === 'pt-BR' && (
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                                        <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </button>

                            {/* EN-US Button */}
                            <button
                                type="button"
                                onClick={() => setLocale('en-US')}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    locale === 'en-US'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <span className="text-2xl">🇺🇸</span>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">English</p>
                                        <p className="text-slate-500 text-xs">United States</p>
                                    </div>
                                </div>
                                {locale === 'en-US' && (
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                                        <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleConfirmLang}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg"
                        >
                            Confirmar / Confirm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
