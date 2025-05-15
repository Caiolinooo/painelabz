'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { FiArrowLeft, FiDownload, FiFileText, FiInfo, FiList, FiMap, FiUsers } from 'react-icons/fi';

export default function ImportDocumentationPage() {
  const { t } = useI18n();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentação de Importação</h1>
          <p className="mt-1 text-sm text-gray-500">
            Guia completo para importação de funcionários
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            href="/admin/user-management/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2 -ml-1 h-5 w-5 text-gray-500" />
            Voltar para Importação
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Visão Geral</h2>
        <p className="text-gray-700 mb-4">
          O sistema de importação permite adicionar múltiplos funcionários ao sistema a partir de diversos formatos de arquivo.
          Este guia explica os formatos suportados, como preparar seus dados e como usar o sistema de importação.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div className="flex items-center mb-2">
              <FiFileText className="text-abz-blue mr-2" />
              <h3 className="font-medium text-gray-900">Formatos Suportados</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 pl-6 list-disc">
              <li>Excel (XLSX, XLS)</li>
              <li>Office 365 (XLSX)</li>
              <li>CSV</li>
              <li>JSON</li>
              <li>XML</li>
              <li>TOTVS (Protheus/RM)</li>
              <li>SAP</li>
              <li>Oracle HCM</li>
              <li>WK</li>
              <li>Dominio</li>
              <li>Formato Personalizado</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div className="flex items-center mb-2">
              <FiUsers className="text-abz-blue mr-2" />
              <h3 className="font-medium text-gray-900">Campos Obrigatórios</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 pl-6 list-disc">
              <li>Nome Completo</li>
              <li>Email ou Telefone (pelo menos um)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Outros campos são opcionais e podem ser preenchidos posteriormente.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div className="flex items-center mb-2">
              <FiInfo className="text-abz-blue mr-2" />
              <h3 className="font-medium text-gray-900">Recursos</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 pl-6 list-disc">
              <li>Mapeamento de campos</li>
              <li>Validação de dados</li>
              <li>Detecção de duplicatas</li>
              <li>Envio de convites</li>
              <li>Importação em lotes</li>
            </ul>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Formatos Suportados</h2>
        
        <div className="space-y-6 mb-8">
          <div className="border-l-4 border-abz-blue pl-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Excel e Office 365</h3>
            <p className="text-gray-700 mb-2">
              Arquivos Excel (.xlsx, .xls) são suportados, incluindo exportações do Office 365.
            </p>
            <p className="text-sm text-gray-600">
              Recomendamos usar a primeira linha como cabeçalho com nomes de colunas claros.
              O sistema tentará mapear automaticamente campos como "Nome", "Email", "Telefone", etc.
            </p>
            <div className="mt-2">
              <Link
                href="/templates/office365-import-template.xlsx"
                download
                className="inline-flex items-center text-sm text-abz-blue hover:underline"
              >
                <FiDownload className="mr-1" />
                Baixar Template Excel
              </Link>
            </div>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">CSV</h3>
            <p className="text-gray-700 mb-2">
              Arquivos CSV (valores separados por vírgula) são suportados.
            </p>
            <p className="text-sm text-gray-600">
              O sistema suporta delimitadores por vírgula (,) ou ponto e vírgula (;).
              A primeira linha deve conter os nomes das colunas.
            </p>
            <div className="mt-2">
              <Link
                href="/templates/import-users-csv.csv"
                download
                className="inline-flex items-center text-sm text-green-600 hover:underline"
              >
                <FiDownload className="mr-1" />
                Baixar Template CSV
              </Link>
            </div>
          </div>
          
          <div className="border-l-4 border-yellow-500 pl-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">JSON e XML</h3>
            <p className="text-gray-700 mb-2">
              Arquivos JSON e XML são suportados para integrações com sistemas externos.
            </p>
            <p className="text-sm text-gray-600">
              Para JSON, o arquivo deve conter um array de objetos ou um objeto com uma propriedade que é um array.
              Para XML, o sistema tentará encontrar elementos que representam usuários.
            </p>
            <div className="mt-2 flex space-x-4">
              <Link
                href="/templates/import-users-json.json"
                download
                className="inline-flex items-center text-sm text-yellow-600 hover:underline"
              >
                <FiDownload className="mr-1" />
                Exemplo JSON
              </Link>
              <Link
                href="/templates/import-users-xml.xml"
                download
                className="inline-flex items-center text-sm text-yellow-600 hover:underline"
              >
                <FiDownload className="mr-1" />
                Exemplo XML
              </Link>
            </div>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sistemas de RH (TOTVS, SAP, Oracle)</h3>
            <p className="text-gray-700 mb-2">
              Suporte para exportações de sistemas de RH comuns como TOTVS Protheus/RM, SAP SuccessFactors e Oracle HCM.
            </p>
            <p className="text-sm text-gray-600">
              O sistema detecta automaticamente os campos específicos desses sistemas e os mapeia para o formato interno.
            </p>
          </div>
          
          <div className="border-l-4 border-gray-500 pl-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Outros Formatos (WK, Dominio)</h3>
            <p className="text-gray-700 mb-2">
              Suporte para formatos específicos como WK e Dominio.
            </p>
            <p className="text-sm text-gray-600">
              WK: Formato de texto com campos separados por pipe (|).<br />
              Dominio: Formato de texto com campos de largura fixa.
            </p>
            <div className="mt-2">
              <Link
                href="/templates/import-users-txt.txt"
                download
                className="inline-flex items-center text-sm text-gray-600 hover:underline"
              >
                <FiDownload className="mr-1" />
                Exemplo TXT
              </Link>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Processo de Importação</h2>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              1
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Preparação dos Dados</h3>
              <p className="text-gray-700">
                Prepare seu arquivo de dados com pelo menos os campos obrigatórios (nome e email/telefone).
                Você pode baixar um dos templates fornecidos como ponto de partida.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              2
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Upload do Arquivo</h3>
              <p className="text-gray-700">
                Na página de importação, selecione o tipo de arquivo e faça o upload.
                O sistema processará o arquivo e mostrará uma prévia dos dados.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              3
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Mapeamento de Campos</h3>
              <p className="text-gray-700">
                Se necessário, use a função de mapeamento de campos para associar as colunas do seu arquivo
                aos campos do sistema. O sistema tentará mapear automaticamente, mas você pode ajustar manualmente.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              4
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Validação e Verificação</h3>
              <p className="text-gray-700">
                O sistema validará os dados e alertará sobre possíveis problemas, como duplicatas ou dados inválidos.
                Você pode optar por corrigir os problemas ou continuar com a importação.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              5
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Opções de Importação</h3>
              <p className="text-gray-700">
                Configure as opções de importação, como envio de convites por email/SMS,
                função padrão para novos usuários e tratamento de duplicatas.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-abz-blue text-white rounded-full w-6 h-6 flex items-center justify-center mt-0.5 mr-3">
              6
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Importação</h3>
              <p className="text-gray-700">
                Inicie a importação e acompanhe o progresso. O sistema processará os dados em lotes
                para garantir estabilidade e desempenho.
              </p>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Dicas e Boas Práticas</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Recomendações</h3>
          <ul className="text-sm text-blue-700 space-y-2 pl-6 list-disc">
            <li>
              <strong>Prepare seus dados:</strong> Verifique se seus dados estão limpos e formatados corretamente antes da importação.
            </li>
            <li>
              <strong>Use os templates:</strong> Utilize os templates fornecidos para garantir compatibilidade.
            </li>
            <li>
              <strong>Importe em lotes:</strong> Para grandes volumes de dados, divida em lotes menores (até 100 registros por vez).
            </li>
            <li>
              <strong>Verifique duplicatas:</strong> Verifique se há duplicatas antes da importação para evitar problemas.
            </li>
            <li>
              <strong>Salve mapeamentos:</strong> Se você importa regularmente do mesmo sistema, salve o mapeamento de campos para uso futuro.
            </li>
            <li>
              <strong>Teste primeiro:</strong> Para sistemas críticos, teste a importação com um pequeno conjunto de dados antes de importar tudo.
            </li>
          </ul>
        </div>
        
        <div className="flex justify-center">
          <Link
            href="/admin/user-management/import"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-abz-blue hover:bg-abz-blue-dark"
          >
            <FiUsers className="mr-2 -ml-1" />
            Ir para Importação de Usuários
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tutoriais</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/user-management/import/documentation#excel" className="block">
            <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center mb-2">
                <FiFileText className="text-green-500 mr-2" />
                <h3 className="font-medium text-gray-900">Importação de Excel</h3>
              </div>
              <p className="text-sm text-gray-700">
                Como importar funcionários a partir de planilhas Excel ou Office 365.
              </p>
            </div>
          </Link>
          
          <Link href="/admin/user-management/import/documentation#mapping" className="block">
            <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center mb-2">
                <FiMap className="text-purple-500 mr-2" />
                <h3 className="font-medium text-gray-900">Mapeamento de Campos</h3>
              </div>
              <p className="text-sm text-gray-700">
                Como usar o mapeamento de campos para importar de qualquer formato.
              </p>
            </div>
          </Link>
          
          <Link href="/admin/user-management/import/documentation#duplicates" className="block">
            <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center mb-2">
                <FiUsers className="text-yellow-500 mr-2" />
                <h3 className="font-medium text-gray-900">Tratamento de Duplicatas</h3>
              </div>
              <p className="text-sm text-gray-700">
                Como lidar com duplicatas durante a importação.
              </p>
            </div>
          </Link>
          
          <Link href="/admin/user-management/import/documentation#invites" className="block">
            <div className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center mb-2">
                <FiList className="text-red-500 mr-2" />
                <h3 className="font-medium text-gray-900">Envio de Convites</h3>
              </div>
              <p className="text-sm text-gray-700">
                Como configurar o envio automático de convites para novos usuários.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
