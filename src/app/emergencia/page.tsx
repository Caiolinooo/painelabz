'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiAlertTriangle, FiPhone } from 'react-icons/fi';

export default function EmergenciaPage() {
  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-red-600 mb-6 flex items-center">
        <FiAlertTriangle className="mr-3" /> Emergência
      </h1>

      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-8 flex items-center">
          Canais de Atendimento
        </h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {/* Logística */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">Logística</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="https://wa.me/5522992074346" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 mb-1 md:mb-0">
                <FiPhone className="mr-2" /> (22) 99207-4346
              </a>
              <a href="mailto:logistica@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> logistica@groupabz.com
              </a>
            </div>
          </div>

          {/* Folha de Pagamento */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">Folha de Pagamento</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="https://wa.me/5522999124131" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 mb-1 md:mb-0">
                <FiPhone className="mr-2" /> (22) 99912-4131
              </a>
              <a href="mailto:rh@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> rh@groupabz.com
              </a>
            </div>
          </div>

          {/* Benefícios */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">Benefícios</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="https://wa.me/5522992081661" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 mb-1 md:mb-0">
                <FiPhone className="mr-2" /> (22) 99208-1661
              </a>
              <a href="mailto:rh@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> rh@groupabz.com
              </a>
            </div>
          </div>

          {/* Folha de Ponto */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">Folha de Ponto</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="https://wa.me/5522992087337" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 mb-1 md:mb-0">
                <FiPhone className="mr-2" /> (22) 99208-7337
              </a>
              <a href="mailto:rh@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> rh@groupabz.com
              </a>
            </div>
          </div>

          {/* QHSE */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">QHSE</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="https://wa.me/5522999494705" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 mb-1 md:mb-0">
                <FiPhone className="mr-2" /> (22) 99949-4705
              </a>
              <a href="mailto:sgi@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> sgi@groupabz.com
              </a>
            </div>
          </div>

          {/* Ouvidoria */}
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium text-gray-900 mb-2 md:mb-0 w-1/3">Ouvidoria</span>
            <div className="flex flex-col md:flex-row md:items-center text-gray-600 md:space-x-6 flex-1 justify-end">
              <a href="mailto:ouvidoria@groupabz.com" className="flex items-center hover:text-blue-600">
                <span className="hidden md:inline mr-2">|</span> ouvidoria@groupabz.com
              </a>
            </div>
          </div>
        </div>

        {/* Emergência Pública */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FiAlertTriangle className="mr-2 text-red-500" /> Telefones de Emergência Pública
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
              <span className="font-medium text-red-800">Bombeiros</span>
              <span className="text-2xl font-bold text-red-600">193</span>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
              <span className="font-medium text-red-800">Polícia Militar</span>
              <span className="text-2xl font-bold text-red-600">190</span>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
              <span className="font-medium text-red-800">SAMU</span>
              <span className="text-2xl font-bold text-red-600">192</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

