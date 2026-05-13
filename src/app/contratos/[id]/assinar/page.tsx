'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import {
    FiFileText, FiChevronLeft, FiChevronRight, FiCheck, FiX, FiShield,
    FiMail, FiPhone, FiUser, FiAlertCircle, FiEdit3
} from 'react-icons/fi';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/authUtils';
import { useSignature } from '@/contexts/SignatureContext';
import DocumentStatusBadge from '@/components/contratos/DocumentStatusBadge';
import SignaturePositionOverlay from '@/components/contratos/SignaturePositionOverlay';
import toast from 'react-hot-toast';

export default function AssinarDocumentoPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const docId = params?.id as string;
    const isPublic = searchParams?.get('publico') === 'true';
    const emailParam = searchParams?.get('email') || '';

    const { requestSignature } = useSignature();

    const [documento, setDocumento] = useState<any>(null);
    const [solicitacao, setSolicitacao] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pdfWidth, setPdfWidth] = useState(600);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState<number>(0);
    const [pdfUrl, setPdfUrl] = useState<string>('');

    // Signing states
    const [showDataModal, setShowDataModal] = useState(false);
    const [showLegalConfirm, setShowLegalConfirm] = useState(false);
    const [signMethod, setSignMethod] = useState<'certificado' | 'dados' | null>(null);
    const [legalAccepted, setLegalAccepted] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);

    // Signer data (for non-certificate method)
    const [signerData, setSignerData] = useState({
        nome: '',
        cpf: '',
        email: emailParam || '',
        telefone: ''
    });

    const pdfContainerRef = useRef<HTMLDivElement>(null);

    // Check for certificate on load
    useEffect(() => {
        checkForCertificate();
    }, []);

    const checkForCertificate = async () => {
        try {
            if (typeof window !== 'undefined' && (window as any).crypto) {
                const certs = await (window as any).crypto.subtle?.getCertificates?.();
                setHasCertificate(false);
            }
            setHasCertificate(false);
        } catch (e) {
            console.log('[Assinar] Certificado não detectado automaticamente');
            setHasCertificate(false);
        }
    };

    const fetchDocumento = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/contracts/sign-access?documento_id=${docId}${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}`);
            const data = await res.json();

            if (data.success) {
                setDocumento(data.documento);
                setSolicitacao(data.solicitacao);
                setPdfUrl(data.pdf_url || '');
            } else {
                toast.error(data.error || 'Documento não encontrado');
            }
        } catch (err) {
            toast.error('Erro ao carregar documento');
        } finally {
            setLoading(false);
        }
    }, [docId, emailParam]);

    useEffect(() => {
        if (docId) fetchDocumento();
    }, [docId, fetchDocumento]);

    useEffect(() => {
        const updateWidth = () => {
            if (pdfContainerRef.current) {
                const w = pdfContainerRef.current.clientWidth - 32;
                setPdfWidth(Math.min(w, 800));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) => {
        setNumPages(n);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('[Assinar] Erro ao carregar PDF:', error);
    };

    // Handle signing with certificate (browser's built-in)
    const handleSignWithCertificate = async () => {
        if (!legalAccepted) {
            toast.error('Confirme a declaração legal para continuar');
            return;
        }

        setIsSigning(true);
        try {
            const result = await requestSignature({
                title: 'Assinar com Certificado Digital',
                description: `Assine o documento: ${documento?.titulo}`,
            });

            if (!result) {
                setIsSigning(false);
                return;
            }

            await finalizeSignature(result.signatureUrl);
        } catch (err: any) {
            console.error('[Assinar] Erro ao assinar com certificado:', err);
            toast.error(err.message || 'Erro ao assinar com certificado digital');
        } finally {
            setIsSigning(false);
        }
    };

    // Handle signing with data + signature pad
    const handleSignWithData = async () => {
        if (!signerData.nome || !signerData.cpf || !signerData.email) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }
        if (!legalAccepted) {
            toast.error('Confirme a declaração legal para continuar');
            return;
        }

        setShowDataModal(false);
        setIsSigning(true);

        try {
            const result = await requestSignature({
                title: 'Assinar Documento',
                description: `Assine o documento: ${documento?.titulo}`,
            });

            if (!result) {
                setIsSigning(false);
                return;
            }

            await finalizeSignature(result.signatureUrl, signerData);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao assinar documento');
        } finally {
            setIsSigning(false);
        }
    };

    const finalizeSignature = async (signatureBase64: string, data?: any) => {
        try {
            let finalSignature = signatureBase64;
            if (signatureBase64.startsWith('http')) {
                const sigRes = await fetch(signatureBase64);
                const blob = await sigRes.blob();
                finalSignature = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }

            const res = await fetch('/api/contracts/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    solicitacao_id: solicitacao?.id,
                    signature_base64: finalSignature,
                    signer_data: data || null,
                    sign_method: signMethod,
                }),
            });

            const result = await res.json();

            if (result.success) {
                toast.success('Documento assinado com sucesso!');
                fetchDocumento();
            } else {
                toast.error(result.error || 'Erro ao assinar');
            }
        } catch (err) {
            toast.error('Erro ao finalizar assinatura');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!documento) {
        return (
            <MainLayout>
                <div className="text-center py-20">
                    <FiAlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                    <p className="text-gray-500">Documento não encontrado ou acesso inválido</p>
                    <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                        ← Voltar para o início
                    </Link>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{documento.titulo}</h1>
                            {documento.descricao && (
                                <p className="text-sm text-gray-500 mt-1">{documento.descricao}</p>
                            )}
                        </div>
                        <DocumentStatusBadge
                            status={solicitacao?.status || 'PENDING'}
                            size="md"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* PDF Viewer */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
                        {/* Controls */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
                                >
                                    <FiChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Página {currentPage} de {numPages || '...'}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                                    disabled={currentPage >= numPages}
                                    className="p-1.5 rounded hover:bg-gray-200"
                                >
                                    <FiChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* PDF Render with Signature Overlays */}
                        <div
                            ref={pdfContainerRef}
                            className="p-4 flex justify-center overflow-auto bg-gray-100 min-h-[600px]"
                            style={{ position: 'relative' }}
                        >
                            {pdfUrl && (
                                <>
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-[700px] border-0 rounded-lg"
                                        title="Documento PDF"
                                    />
                                    {/* Signature overlays positioned on the PDF */}
                                    {solicitacao?.status !== 'SIGNED' && solicitacao?.posicao_x && solicitacao?.posicao_y && (
                                        <SignaturePositionOverlay
                                            x={solicitacao.posicao_x}
                                            y={solicitacao.posicao_y}
                                            width={solicitacao.largura_assinatura || 150}
                                            height={solicitacao.altura_assinatura || 50}
                                            label="Sua assinatura aqui"
                                            status="PENDING"
                                            interactive={false}
                                        />
                                    )}
                                    {/* Signed confirmation overlay */}
                                    {solicitacao?.status === 'SIGNED' && (
                                        <SignaturePositionOverlay
                                            x={solicitacao.posicao_x || 100}
                                            y={solicitacao.posicao_y || 500}
                                            width={solicitacao.largura_assinatura || 150}
                                            height={solicitacao.altura_assinatura || 50}
                                            label="✓ Assinado"
                                            status="SIGNED"
                                            interactive={false}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Sign Options */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <FiEdit3 className="w-4 h-4 text-gray-400" />
                                Assinar Documento
                            </h3>

                            {solicitacao?.status === 'SIGNED' ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FiCheck className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="text-green-600 font-medium">Documento Assinado</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Assinado em {new Date(solicitacao.updated_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Certificate Option */}
                                    <button
                                        onClick={() => {
                                            setSignMethod('certificado');
                                            setShowLegalConfirm(true);
                                        }}
                                        className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FiShield className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Certificado Digital</p>
                                            <p className="text-xs text-gray-500">Use seu e-CPF, e-CNPJ ou token</p>
                                        </div>
                                    </button>

                                    {/* Manual Data Option */}
                                    <button
                                        onClick={() => {
                                            setSignMethod('dados');
                                            setShowDataModal(true);
                                        }}
                                        className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                                    >
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <FiUser className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Dados Pessoais + Assinatura</p>
                                            <p className="text-xs text-gray-500">Preencha seus dados e assine manualmente</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Document Info */}
                        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-800">Informações</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Enviado em</span>
                                    <span className="text-gray-800">
                                        {new Date(documento.data_criacao).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                {documento.hash_original && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Hash</span>
                                        <span className="text-gray-800 font-mono text-xs break-all">
                                            {documento.hash_original.substring(0, 16)}...
                                        </span>
                                    </div>
                                )}
                                {solicitacao && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Posição</span>
                                        <span className="text-gray-800 text-xs">
                                            Pág {solicitacao.pagina_assinatura || 1} | X:{solicitacao.posicao_x || 100} Y:{solicitacao.posicao_y || 500}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Modal */}
            {showDataModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <FiUser className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Seus Dados</h3>
                                <p className="text-xs text-gray-500">Preencha para assinar o documento</p>
                            </div>
                            <button
                                onClick={() => setShowDataModal(false)}
                                className="ml-auto text-gray-400 hover:text-gray-600"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="text-sm text-gray-700 font-medium block mb-1">
                                    Nome Completo *
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={signerData.nome}
                                        onChange={(e) => setSignerData({ ...signerData, nome: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-700 font-medium block mb-1">
                                    CPF *
                                </label>
                                <input
                                    type="text"
                                    value={signerData.cpf}
                                    onChange={(e) => setSignerData({ ...signerData, cpf: e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="000.000.000-00"
                                    maxLength={11}
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-700 font-medium block mb-1">
                                    E-mail *
                                </label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={signerData.email}
                                        onChange={(e) => setSignerData({ ...signerData, email: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-700 font-medium block mb-1">
                                    Telefone
                                </label>
                                <div className="relative">
                                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={signerData.telefone}
                                        onChange={(e) => setSignerData({ ...signerData, telefone: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowDataModal(false);
                                    setShowLegalConfirm(true);
                                }}
                                disabled={!signerData.nome || !signerData.cpf || !signerData.email}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium disabled:bg-gray-300 hover:bg-green-700 transition-colors"
                            >
                                Prosseguir para Assinatura
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal Confirmation Modal */}
            {showLegalConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <FiShield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Confirmação Legal</h3>
                                <p className="text-xs text-gray-500">Leia atentamente antes de assinar</p>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 leading-relaxed">
                                Ao assinar eletronicamente este documento, você declara que:
                                <ul className="list-disc ml-4 mt-2 space-y-1 text-xs text-gray-600">
                                    <li>É o titular das informações preenchidas</li>
                                    <li>Leu e compreendeu o conteúdo integral do documento</li>
                                    <li>Reconhece a validade jurídica desta assinatura conforme MP 2.200-2/2001</li>
                                    <li>Está ciente que IP, data/hora e navegador serão registrados para auditoria</li>
                                    {signMethod === 'certificado' && (
                                        <li>Está utilizando certificado digital válido (e-CPF/e-CNPJ)</li>
                                    )}
                                </ul>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={legalAccepted}
                                    onChange={(e) => setLegalAccepted(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                                />
                                <span className="text-sm text-gray-700">
                                    <strong>Confirmo</strong> que as informações são verdadeiras e assino
                                    eletronicamente este documento, reconhecendo sua validade jurídica e integridade.
                                </span>
                            </label>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowLegalConfirm(false);
                                        setLegalAccepted(false);
                                    }}
                                    className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLegalConfirm(false);
                                        if (signMethod === 'certificado') {
                                            handleSignWithCertificate();
                                        } else {
                                            handleSignWithData();
                                        }
                                    }}
                                    disabled={!legalAccepted || isSigning}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                    {isSigning ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    ) : (
                                        <FiEdit3 className="w-4 h-4" />
                                    )}
                                    {isSigning ? 'Assinando...' : 'Assinar Agora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}