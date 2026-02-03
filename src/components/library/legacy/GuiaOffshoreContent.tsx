'use client';

import React from 'react';
import { FiAnchor, FiExternalLink } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

export default function GuiaOffshoreContent() {
    const { t } = useI18n();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-center py-12 px-6">
                <FiAnchor className="mx-auto h-16 w-16 text-abz-blue mb-4 opacity-50" />
                <h2 className="text-2xl font-bold text-abz-text-black mb-3">
                    {t('guia.title', 'Guia Offshore')}
                </h2>
                <p className="text-gray-600 max-w-lg mx-auto mb-8">
                    {t('guia.description', 'Acesse o guia completo com todas as informações necessárias para sua rotina offshore, incluindo segurança, convivência e procedimentos de embarque.')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-blue-50/50">
                        <h3 className="font-semibold text-lg mb-2">Manual de Embarque</h3>
                        <p className="text-sm text-gray-500 mb-4">Documentação, vacinas e preparativos antes de subir a bordo.</p>
                        <button className="text-abz-blue font-medium hover:underline flex items-center">
                            Acessar Manual <FiExternalLink className="ml-1" />
                        </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-blue-50/50">
                        <h3 className="font-semibold text-lg mb-2">Vida a Bordo</h3>
                        <p className="text-sm text-gray-500 mb-4">Regras de convivência, horários e facilidades disponíveis nas unidades.</p>
                        <button className="text-abz-blue font-medium hover:underline flex items-center">
                            Ver Guia <FiExternalLink className="ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
