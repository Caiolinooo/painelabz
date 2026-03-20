'use client';

import MainLayout from '@/components/Layout/MainLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiAlertCircle, FiClipboard, FiExternalLink, FiShield } from 'react-icons/fi';

const POLIWEB_URL = process.env.NEXT_PUBLIC_POLIWEB_URL || '';

export default function PoliwebPage() {
  const { hasAccess } = useSupabaseAuth();
  const hasPoliwebAccess = hasAccess('poliweb');

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Poliweb</h1>
          <p className="mt-2 text-gray-600">Acesso rápido ao sistema da clínica ocupacional para consultas e processos relacionados ao ASO.</p>
        </div>

        {!hasPoliwebAccess ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-700">Acesso não autorizado</h2>
                <p className="mt-1 text-sm text-red-700">
                  Seu setor não possui permissão para utilizar o módulo Poliweb no momento.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                  <FiClipboard className="h-5 w-5" />
                  Clínica ocupacional
                </div>
                <p className="mt-2 text-sm text-blue-900">
                  Utilize o Poliweb para acessar rotinas ligadas a ASO e acompanhamento ocupacional.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <FiShield className="h-5 w-5" />
                  Controle por setor
                </div>
                <p className="mt-2 text-sm text-emerald-900">
                  Este acesso respeita as permissões já configuradas por setor dentro do portal.
                </p>
              </div>
            </div>

            {POLIWEB_URL ? (
              <a
                href={POLIWEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <FiExternalLink className="h-4 w-4" />
                Acessar Poliweb
              </a>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                O módulo foi habilitado no portal, mas a URL externa do Poliweb ainda não foi configurada em
                <span className="font-semibold"> NEXT_PUBLIC_POLIWEB_URL</span>.
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}