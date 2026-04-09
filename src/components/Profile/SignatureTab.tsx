import React, { useRef, useState } from 'react';
import { useSignature } from '@/contexts/SignatureContext';
import { useI18n } from '@/contexts/I18nContext';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-hot-toast';
import { FiEdit3, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

export default function SignatureTab() {
    const { userSignatureUrl, registerSignature, refreshSignature, isLoading } = useSignature();
    const { t } = useI18n();
    const sigCanvasRef = useRef<SignatureCanvas>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [signatureDrawn, setSignatureDrawn] = useState(false);

    const handleSave = async () => {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
            toast.error(t('profile.signatureEmpty', 'Por favor, desenhe sua assinatura antes de salvar.'));
            return;
        }

        try {
            setIsSaving(true);
            const base64Img = sigCanvasRef.current.getCanvas().toDataURL('image/png');
            await registerSignature(base64Img);
            toast.success(t('profile.signatureSaved', 'Assinatura salva com sucesso!'));
            setIsDrawing(false);
            setSignatureDrawn(false);
        } catch (error: any) {
            toast.error(error.message || t('profile.signatureError', 'Erro ao salvar assinatura.'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4">
                    Minha Assinatura Digital
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Esta assinatura será utilizada para atestar sua presença em listas oficiais do portal, aprovação de documentos e outras autenticações.
                </p>
            </div>

            {!isDrawing ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                    {userSignatureUrl ? (
                        <>
                            <p className="text-sm font-medium text-gray-700 mb-4">Sua assinatura atual:</p>
                            <div className="bg-white border-2 border-gray-200 border-dashed rounded-xl max-w-sm mx-auto h-40 flex items-center justify-center p-2">
                                <img src={userSignatureUrl} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                            </div>
                            <Button 
                                onClick={() => setIsDrawing(true)}
                                variant="outline" 
                                className="mt-6 flex items-center gap-2 mx-auto"
                            >
                                <FiEdit3 /> Substituir Assinatura
                            </Button>
                        </>
                    ) : (
                        <div className="py-8">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiEdit3 className="w-8 h-8" />
                            </div>
                            <p className="text-gray-600 mb-4">Você ainda não possui uma assinatura cadastrada.</p>
                            <Button onClick={() => setIsDrawing(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                                Criar Assinatura Agora
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white border text-center shadow-sm border-gray-200 rounded-xl p-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Desenhe sua nova assinatura abaixo:</p>
                    <div className="border-2 border-dashed border-blue-300 rounded-xl bg-gray-50 relative overflow-hidden">
                        <SignatureCanvas
                            ref={sigCanvasRef}
                            penColor="black"
                            canvasProps={{ className: 'w-full rounded-xl cursor-crosshair', style: { height: '220px' } }}
                            onEnd={() => setSignatureDrawn(true)}
                        />
                        {!signatureDrawn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                                Assine aqui no quadro
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <Button 
                            variant="ghost" 
                            onClick={() => { sigCanvasRef.current?.clear(); setSignatureDrawn(false); }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FiRefreshCcw className="mr-2" /> Limpar
                        </Button>
                        
                        <div className="flex gap-2">
                            {userSignatureUrl && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setIsDrawing(false); setSignatureDrawn(false); }}
                                >
                                    Cancelar
                                </Button>
                            )}
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving || !signatureDrawn}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <FiSave className="mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Assinatura'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
