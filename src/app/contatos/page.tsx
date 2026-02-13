'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { FiPhone, FiMail, FiMapPin, FiClock, FiInstagram } from 'react-icons/fi';

export default function ContatosPage() {
  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-abz-text-black mb-6">Contatos</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-abz-text-black mb-6">Informações de Contato</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contato principal */}
          <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold text-abz-blue-dark mb-4">ABZ Group - Sede</h3>

            <div className="space-y-4">
              <div className="flex items-start">
                <FiMapPin className="text-abz-blue w-5 h-5 mt-1 mr-3 flex-shrink-0" />
                <p className="text-abz-text-dark">
                  <strong>Edifício The Corporate</strong><br />
                  Av. Prefeito Aristeu Ferreira da Silva, 370<br />
                  Granja dos Cavaleiros, Macaé - RJ, 27930-070
                </p>
              </div>

              <div className="flex items-center">
                <FiMail className="text-abz-blue w-5 h-5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-abz-text-dark">contato@groupabz.com</p>
                </div>
              </div>

              <div className="flex items-center">
                <FiClock className="text-abz-blue w-5 h-5 mr-3 flex-shrink-0" />
                <p className="text-abz-text-dark">Segunda a Sexta: 8h às 18h</p>
              </div>

              <div className="flex items-center">
                <FiInstagram className="text-abz-blue w-5 h-5 mr-3 flex-shrink-0" />
                <a
                  href="https://www.instagram.com/groupabz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-abz-blue hover:underline"
                >
                  @groupabz
                </a>
              </div>
            </div>
          </div>

          {/* Departamentos */}
          <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold text-abz-blue-dark mb-4">Departamentos</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-abz-text-black">Logística</h4>
                <p className="text-sm text-gray-500 mb-1">Programação de escala, embarque, dobras, faltas e folga indenizada</p>
                <p className="text-abz-text-dark">logistica@groupabz.com</p>
                <p className="text-abz-text-dark font-medium text-green-600">(22) 99207-4646</p>
              </div>

              <div>
                <h4 className="font-semibold text-abz-text-black">Departamento Pessoal (Folha)</h4>
                <p className="text-sm text-gray-500 mb-1">Dúvidas sobre Folha de Pagamento</p>
                <p className="text-abz-text-dark">rh@groupabz.com</p>
                <p className="text-abz-text-dark font-medium text-green-600">(22) 99778-2348 / (22) 99912-4131</p>
              </div>

              <div>
                <h4 className="font-semibold text-abz-text-black">Departamento Pessoal (Ponto)</h4>
                <p className="text-sm text-gray-500 mb-1">Registro de Folha de Ponto</p>
                <p className="text-abz-text-dark">rh@groupabz.com</p>
                <p className="text-abz-text-dark font-medium text-green-600">(22) 99238-7332</p>
              </div>

              <div>
                <h4 className="font-semibold text-abz-text-black">Departamento Pessoal (Benefícios)</h4>
                <p className="text-sm text-gray-500 mb-1">Benefícios (Plano de saúde, VA, VR, entre outros)</p>
                <p className="text-abz-text-dark">rh@groupabz.com</p>
                <p className="text-abz-text-dark font-medium text-green-600">(22) 99208-1661</p>
              </div>

              <div>
                <h4 className="font-semibold text-abz-text-black">QHSE (SGI)</h4>
                <p className="text-sm text-gray-500 mb-1">EPI, registro de acidentes ou doenças ocupacionais</p>
                <p className="text-abz-text-dark">sgi@groupabz.com</p>
                <p className="text-abz-text-dark font-medium text-green-600">(22) 99949-4705</p>
              </div>

              <div>
                <h4 className="font-semibold text-abz-text-black">Ouvidoria</h4>
                <p className="text-sm text-gray-500 mb-1">Denúncias, queixas, elogios ou sugestões</p>
                <p className="text-abz-text-dark">ouvidoria@groupabz.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa da localização (opcional) */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-abz-text-black mb-4">Nossa Localização</h3>
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md">
            <iframe
              src="https://www.google.com/maps?q=Av.+Prefeito+Aristeu+Ferreira+da+Silva,+370+-+Granja+dos+Cavaleiros,+Macaé+-+RJ,+27930-070&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização ABZ Group"
            ></iframe>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
