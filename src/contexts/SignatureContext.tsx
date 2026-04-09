'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import SignatureModal from '@/components/ui/SignatureModal';
import { fetchWithAuth } from '@/lib/authUtils';

// ==================== TYPES ====================

export interface SignatureRequest {
    title?: string;
    description?: string;
}

export interface SignatureResult {
    signatureUrl: string;
    authMethod: 'canvas' | 'passkey' | 'facial' | 'senha';
}

export interface SignatureContextType {
    /** URL da assinatura do perfil do usuário (null se não cadastrada) */
    userSignatureUrl: string | null;
    /** Se o usuário tem assinatura cadastrada */
    hasSignature: boolean;
    /** Se está carregando dados da assinatura */
    isLoading: boolean;

    /**
     * Solicita assinatura do usuário. Abre o modal automaticamente.
     * Se não tem assinatura → força cadastro primeiro.
     * Se tem → mostra preview + autenticação.
     * 
     * @returns SignatureResult se confirmado, null se cancelado.
     * 
     * @example
     * const { requestSignature } = useSignature();
     * const result = await requestSignature({ title: 'Assinar EPI' });
     * if (result) {
     *   console.log(result.signatureUrl); // URL da imagem real
     *   console.log(result.authMethod);   // 'canvas' | 'passkey' | ...
     * }
     */
    requestSignature: (opts?: SignatureRequest) => Promise<SignatureResult | null>;

    /** Força recarregar a assinatura do perfil */
    refreshSignature: () => Promise<void>;

    /** Registra nova assinatura programaticamente (sem modal) */
    registerSignature: (base64: string) => Promise<string>;
}

// ==================== CONTEXT ====================

const SignatureContext = createContext<SignatureContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function SignatureProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, profile } = useSupabaseAuth();

    // State
    const [userSignatureUrl, setUserSignatureUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalTitle, setModalTitle] = useState('Assinatura Digital');
    const [modalDescription, setModalDescription] = useState('Confirme sua identidade para assinar.');

    // Promise resolver ref — this is how requestSignature() awaits the modal result
    const resolverRef = useRef<((result: SignatureResult | null) => void) | null>(null);

    // ==================== LOAD SIGNATURE ON AUTH ====================

    const loadSignature = useCallback(async () => {
        if (!isAuthenticated) {
            setUserSignatureUrl(null);
            return;
        }

        try {
            setIsLoading(true);
            const res = await fetchWithAuth('/api/user/signature');
            const data = await res.json();
            if (data.success) {
                setUserSignatureUrl(data.signatureUrl || null);
            }
        } catch (error) {
            console.error('[SignatureContext] Erro ao carregar assinatura:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && profile) {
            // Use signature_url from profile if available (avoid extra fetch)
            const profileSigUrl = (profile as any)?.signature_url;
            if (profileSigUrl) {
                setUserSignatureUrl(profileSigUrl);
            } else {
                loadSignature();
            }
        } else {
            setUserSignatureUrl(null);
        }
    }, [isAuthenticated, profile, loadSignature]);

    // ==================== REGISTER SIGNATURE ====================

    const registerSignature = useCallback(async (base64: string): Promise<string> => {
        const res = await fetchWithAuth('/api/user/signature', {
            method: 'POST',
            body: ***REMOVED*** signatureBase64: base64 }),
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error || 'Erro ao registrar assinatura');
        }
        setUserSignatureUrl(data.signatureUrl);
        return data.signatureUrl;
    }, []);

    // ==================== REQUEST SIGNATURE (MAIN API) ====================

    const requestSignature = useCallback(async (opts?: SignatureRequest): Promise<SignatureResult | null> => {
        if (!isAuthenticated) {
            console.warn('[SignatureContext] requestSignature called without authentication');
            return null;
        }

        // Set modal options
        setModalTitle(opts?.title || 'Assinatura Digital');
        setModalDescription(opts?.description || 'Confirme sua identidade para assinar este documento.');

        // Open modal and wait for result via Promise
        return new Promise<SignatureResult | null>((resolve) => {
            resolverRef.current = resolve;
            setIsModalOpen(true);
        });
    }, [isAuthenticated]);

    // ==================== MODAL HANDLERS ====================

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setIsSubmitting(false);
        if (resolverRef.current) {
            resolverRef.current(null); // Cancelled
            resolverRef.current = null;
        }
    }, []);

    const handleModalConfirm = useCallback((signatureUrl: string, authMethod: string) => {
        setIsSubmitting(true);
        setIsModalOpen(false);
        setIsSubmitting(false);
        if (resolverRef.current) {
            resolverRef.current({
                signatureUrl,
                authMethod: authMethod as SignatureResult['authMethod'],
            });
            resolverRef.current = null;
        }
    }, []);

    const handleRegisterSignature = useCallback(async (base64: string): Promise<string> => {
        return registerSignature(base64);
    }, [registerSignature]);

    // ==================== REFRESH ====================

    const refreshSignature = useCallback(async () => {
        await loadSignature();
    }, [loadSignature]);

    // ==================== CONTEXT VALUE ====================

    const value: SignatureContextType = {
        userSignatureUrl,
        hasSignature: !!userSignatureUrl,
        isLoading,
        requestSignature,
        refreshSignature,
        registerSignature,
    };

    return (
        <SignatureContext.Provider value={value}>
            {children}

            {/* Modal Global — Um único modal para toda a aplicação */}
            <SignatureModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                userSignatureUrl={userSignatureUrl}
                isSubmitting={isSubmitting}
                title={modalTitle}
                description={modalDescription}
                onRegisterSignature={handleRegisterSignature}
            />
        </SignatureContext.Provider>
    );
}

// ==================== HOOK ====================

/**
 * Hook para acessar o sistema de assinatura global.
 * 
 * @example
 * ```tsx
 * const { requestSignature, hasSignature, userSignatureUrl } = useSignature();
 * 
 * // Solicitar assinatura (abre modal automaticamente)
 * const result = await requestSignature({ title: 'Assinar Documento' });
 * if (result) {
 *   console.log(result.signatureUrl);  // URL da imagem da assinatura real
 *   console.log(result.authMethod);    // 'canvas' | 'passkey' | 'facial' | 'senha'
 * }
 * ```
 */
export function useSignature(): SignatureContextType {
    const context = useContext(SignatureContext);
    if (!context) {
        throw new Error('useSignature deve ser usado dentro de um <SignatureProvider>');
    }
    return context;
}

export default SignatureContext;
