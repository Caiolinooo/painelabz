'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiX, FiRefreshCcw, FiCheck } from 'react-icons/fi';

interface SignaturePadProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureBase64: string) => Promise<void>;
    isSubmitting?: boolean;
}

export default function SignaturePad({ isOpen, onClose, onConfirm, isSubmitting = false }: SignaturePadProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    if (!isOpen) return null;

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
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

                <div className="flex justify-between items-center">
                    <button
                        onClick={clear}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <FiRefreshCcw className="w-4 h-4" />
                        Limpar
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isEmpty || isSubmitting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium
                                ${isEmpty || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <FiCheck className="w-4 h-4" />
                                    Confirmar Recebimento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
