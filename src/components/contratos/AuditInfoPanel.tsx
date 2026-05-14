'use client';

import React from 'react';
import { FiShield, FiClock, FiGlobe, FiMonitor, FiHash } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface AuditInfoPanelProps {
    hashOriginal: string;
    hashFinal?: string;
    ip?: string;
    userAgent?: string;
    dataAssinatura?: string;
    colaboradorNome?: string;
}

export default function AuditInfoPanel({
    hashOriginal,
    hashFinal,
    ip,
    userAgent,
    dataAssinatura,
    colaboradorNome,
}: AuditInfoPanelProps) {
    const { t, locale } = useI18n();

    const truncateHash = (hash: string) =>
        hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <FiShield className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-800">{t('contratos.audit.title', 'Dados de Auditoria')}</h4>
            </div>

            <div className="space-y-2.5">
                {/* Hash Original */}
                <div className="flex items-start gap-2">
                    <FiHash className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500">{t('contratos.audit.hash_original', 'Hash Original (SHA-256)')}</p>
                        <p className="text-xs font-mono text-gray-700 break-all" title={hashOriginal}>
                            {truncateHash(hashOriginal)}
                        </p>
                    </div>
                </div>

                {/* Hash Final */}
                {hashFinal && (
                    <div className="flex items-start gap-2">
                        <FiHash className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500">{t('contratos.audit.hash_final', 'Hash Final (SHA-256)')}</p>
                            <p className="text-xs font-mono text-emerald-700 break-all" title={hashFinal}>
                                {truncateHash(hashFinal)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Collaborator */}
                {colaboradorNome && (
                    <div className="flex items-start gap-2">
                        <FiShield className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">{t('contratos.audit.signed_by', 'Assinado por')}</p>
                            <p className="text-xs font-medium text-gray-700">{colaboradorNome}</p>
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                {dataAssinatura && (
                    <div className="flex items-start gap-2">
                        <FiClock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">{t('contratos.audit.date_time', 'Data/Hora')}</p>
                            <p className="text-xs text-gray-700">
                                {new Date(dataAssinatura).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR')}
                            </p>
                        </div>
                    </div>
                )}

                {/* IP */}
                {ip && (
                    <div className="flex items-start gap-2">
                        <FiGlobe className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">{t('contratos.audit.source_ip', 'IP de Origem')}</p>
                            <p className="text-xs font-mono text-gray-700">{ip}</p>
                        </div>
                    </div>
                )}

                {/* User Agent */}
                {userAgent && (
                    <div className="flex items-start gap-2">
                        <FiMonitor className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">{t('contratos.audit.browser', 'Navegador')}</p>
                            <p className="text-xs text-gray-700 line-clamp-2">{userAgent}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
