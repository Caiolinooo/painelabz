'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiX, FiRefreshCcw, FiCheck, FiKey } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SignaturePadProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureBase64: string) => Promise<void>;
    isSubmitting?: boolean;
}

export default function SignaturePad({ isOpen, onClose, onConfirm, isSubmitting = false }: SignaturePadProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

    if (!isOpen) return null;

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const handlePasskeySign = async () => {
        try {
            setIsPasskeyLoading(true);
            const { startAuthentication } = await import('@simplewebauthn/browser');

            const optionsRes = await fetch('/api/auth/webauthn/sign/options', { method: 'POST' });
            if (!optionsRes.ok) throw new Error('Erro ao iniciar assinatura biométrica');
            const options = await optionsRes.json();

            let asseResp;
            try {
                asseResp = await startAuthentication({ optionsJSON: options });
            } catch (err: any) {
                console.error('WebAuthn error:', err);
                if (err.name === 'NotAllowedError') {
                    // Ignora silentemente se o usuário apenas fechou o prompt
                    return;
                }
                throw new Error('Falha ao usar biometria. Verifique se há uma Passkey cadastrada neste dispositivo.');
            }

            const verifyRes = await fetch('/api/auth/webauthn/sign/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asseResp),
            });
            const verification = await verifyRes.json();

            if (verification.success) {
                toast.success('Assinatura biométrica validada!');
                await onConfirm('PASSKEY_SIGNED');
            } else {
                throw new Error(verification.error || 'Erro na verificação da assinatura');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao utilizar biometria');
        } finally {
            setIsPasskeyLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (isEmpty) return;

        // Using getCanvas() instead of getTrimmedCanvas() to avoid "trim_canvas is not a function" error
        // caused by bundling issues with the trim-canvas dependency
        const signatureData = sigCanvas.current?.getCanvas().toDataURL('image/png');

        if (signatureData) {
            // Pass the signature data to the confirm handler
            await onConfirm(signatureData); // Modified to await the confirmation
        }
    };

    const handleEnd = () => {
        setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assinatura de Recebimento</h3>
                    <button onClick={onClose} disabled={isSubmitting} className="text-gray-500 hover:text-gray-700">
                        <FiX className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Por favor, assine abaixo para confirmar o recebimento dos EPIs listados.
                    Ao assinar, você declara ter recebido os equipamentos em perfeito estado.
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-gray-50 relative">
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{
                            className: 'signature-canvas w-full h-64 rounded-lg cursor-crosshair'
                        }}
                        onEnd={handleEnd}
                    />
                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                            Assine aqui
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap-reverse sm:flex-wrap items-center justify-between gap-4 mt-6">
                    <button
                        onClick={clear}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border font-medium border-gray-300"
                    >
                        <FiRefreshCcw className="w-4 h-4" />
                        Limpar
                    </button>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1 sm:justify-end">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting || isPasskeyLoading}
                            className="flex-1 sm:flex-none px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium border border-transparent whitespace-nowrap"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePasskeySign}
                            disabled={isSubmitting || isPasskeyLoading}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium whitespace-nowrap
                                ${isSubmitting || isPasskeyLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                            `}
                        >
                            {isPasskeyLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <FiKey className="w-4 h-4" />
                            )}
                            <span className="hidden xs:inline">Usar Biometria</span>
                            <span className="xs:hidden">Biometria</span>
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isEmpty || isSubmitting || isPasskeyLoading}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium whitespace-nowrap
                                ${isEmpty || isSubmitting || isPasskeyLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                            `}
                        >
                            {isSubmitting && !isPasskeyLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span className="hidden xs:inline">Processando...</span>
                                </>
                            ) : (
                                <>
                                    <FiCheck className="w-4 h-4" />
                                    Assinar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
