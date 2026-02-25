'use client';

import React, { useState, useEffect } from 'react';
import { FiKey, FiSmartphone, FiMonitor, FiArrowRight, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { startRegistration } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface PostLoginBiometricPromptProps {
    onSkip: () => void;
    onSuccess: () => void;
}

export default function PostLoginBiometricPrompt({ onSkip, onSuccess }: PostLoginBiometricPromptProps) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [deviceType, setDeviceType] = useState<'platform' | 'cross-platform' | 'unknown'>('unknown');
    const router = useRouter();

    useEffect(() => {
        // Check what kind of authenticator is best for this device
        const checkAuthenticator = async () => {
            if (typeof window !== 'undefined' && window.PublicKeyCredential) {
                try {
                    // Check if device has built-in biometrics (TouchID, FaceID, Windows Hello, Android Biometrics)
                    const isPlatformSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                    setDeviceType(isPlatformSupported ? 'platform' : 'cross-platform');
                } catch (e) {
                    setDeviceType('unknown');
                }
            }
        };

        checkAuthenticator();
    }, []);

    const handleRegister = async () => {
        try {
            setIsRegistering(true);

            // 1. Get options from server
            const bodyPayload = { attachment: deviceType === 'platform' ? 'platform' : undefined };
            const optionsRes = await fetch('/api/auth/webauthn/register/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!optionsRes.ok) {
                throw new Error('Erro ao obter opções de registro');
            }

            const options = await optionsRes.json();

            // 2. Pass options to the browser to get local credentials
            let attResp;
            try {
                attResp = await startRegistration({ optionsJSON: options });
            } catch (error: any) {
                if (error.name === 'NotAllowedError') {
                    toast.error('Registro cancelado.');
                    return;
                }
                throw new Error('Falha na interação com o dispositivo biométrico.');
            }

            // 3. Verify the response with the server
            const verificationRes = await fetch('/api/auth/webauthn/register/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            const verificationResult = await verificationRes.json();

            if (verificationResult.success) {
                toast.success(verificationResult.message || 'Biometria cadastrada com sucesso!');
                localStorage.setItem('hasPasskey', 'true');
                onSuccess();
            } else {
                throw new Error(verificationResult.error || 'Erro na verificação no servidor');
            }
        } catch (error: any) {
            console.error('Passkey registration error:', error);
            toast.error(error.message || 'Erro ao cadastrar biometria.');
        } finally {
            setIsRegistering(false);
        }
    };

    const getDeviceIcon = () => {
        if (deviceType === 'platform') {
            // Very basic heuristic for mobile vs desktop
            const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
            return isMobile ? <FiSmartphone className="mx-auto w-12 h-12 text-blue-500 mb-4" /> : <FiMonitor className="mx-auto w-12 h-12 text-blue-500 mb-4" />;
        }
        return <FiKey className="mx-auto w-12 h-12 text-blue-500 mb-4" />;
    };

    const getTitle = () => {
        if (deviceType === 'platform') return 'Acesse mais rápido na próxima vez!';
        return 'Deseja cadastrar uma chave de segurança?';
    };

    const getDescription = () => {
        if (deviceType === 'platform') {
            return 'Este dispositivo suporta biometria (como Touch ID, Face ID ou Windows Hello). Deseja ativá-la para não precisar mais digitar sua senha?';
        }
        if (deviceType === 'cross-platform') {
            return 'Você pode usar uma chave de segurança física (como YubiKey) ou outro dispositivo para entrar na sua conta de forma mais segura.';
        }
        return 'Cadastre uma biometria ou chave de acesso para entrar mais rápido.';
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                <div className="text-center">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        {getDeviceIcon()}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {getTitle()}
                    </h2>

                    <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                        {getDescription()}
                    </p>

                    <div className="space-y-3">
                        <Button
                            onClick={handleRegister}
                            disabled={isRegistering}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-xl text-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                        >
                            {isRegistering ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" />
                            ) : (
                                <>
                                    <FiKey className="w-5 h-5" />
                                    Ativar Biometria / Passkey
                                </>
                            )}
                        </Button>

                        <button
                            onClick={onSkip}
                            disabled={isRegistering}
                            className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                            Agora não, pular
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
