'use client';

import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheck, FiX, FiEye, FiEdit, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { AccessPermissions } from '@/models/User';

interface ReimbursementPermissionsEditorProps {
  permissions: AccessPermissions;
  onChange: (permissions: AccessPermissions) => void;
  readOnly?: boolean;
}

const ReimbursementPermissionsEditor: React.FC<ReimbursementPermissionsEditorProps> = ({
  permissions,
  onChange,
  readOnly = false
}) => {
  // Inicializar permissões de reembolso se não existirem
  const [localPermissions, setLocalPermissions] = useState<AccessPermissions>({
    ...permissions,
    features: {
      ...permissions.features,
      reimbursement_approval: permissions.features?.reimbursement_approval || false,
      reimbursement_view: permissions.features?.reimbursement_view || false,
      reimbursement_edit: permissions.features?.reimbursement_edit || false
    }
  });

  // Atualizar permissões locais quando as props mudarem
  useEffect(() => {
    setLocalPermissions({
      ...permissions,
      features: {
        ...permissions.features,
        reimbursement_approval: permissions.features?.reimbursement_approval || false,
        reimbursement_view: permissions.features?.reimbursement_view || false,
        reimbursement_edit: permissions.features?.reimbursement_edit || false
      }
    });
  }, [permissions]);

  // Função para alterar uma permissão específica
  const handlePermissionChange = (feature: string, value: boolean) => {
    if (readOnly) return;

    const updatedPermissions = {
      ...localPermissions,
      features: {
        ...localPermissions.features,
        [feature]: value
      }
    };

    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  // Verificar se o usuário tem uma permissão específica
  const hasPermission = (feature: string): boolean => {
    return !!localPermissions.features?.[feature];
  };

  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center mb-4">
        <FiDollarSign className="h-5 w-5 text-abz-blue mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Permissões de Reembolso</h3>
      </div>

      {readOnly && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md flex items-start">
          <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            Você está no modo de visualização. Não é possível alterar as permissões.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <FiEye className="h-5 w-5 text-gray-500 mr-2" />
            <div>
              <p className="font-medium text-gray-900">Visualizar Reembolsos</p>
              <p className="text-sm text-gray-500">Permite visualizar solicitações de reembolso</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handlePermissionChange('reimbursement_view', !hasPermission('reimbursement_view'))}
              disabled={readOnly}
              className={`w-10 h-5 relative rounded-full transition-colors duration-200 ease-in-out ${
                hasPermission('reimbursement_view') ? 'bg-green-500' : 'bg-gray-300'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${
                  hasPermission('reimbursement_view') ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <FiCheck className="h-5 w-5 text-gray-500 mr-2" />
            <div>
              <p className="font-medium text-gray-900">Aprovar Reembolsos</p>
              <p className="text-sm text-gray-500">Permite aprovar ou rejeitar solicitações de reembolso</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handlePermissionChange('reimbursement_approval', !hasPermission('reimbursement_approval'))}
              disabled={readOnly}
              className={`w-10 h-5 relative rounded-full transition-colors duration-200 ease-in-out ${
                hasPermission('reimbursement_approval') ? 'bg-green-500' : 'bg-gray-300'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${
                  hasPermission('reimbursement_approval') ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <FiEdit className="h-5 w-5 text-gray-500 mr-2" />
            <div>
              <p className="font-medium text-gray-900">Editar Configurações</p>
              <p className="text-sm text-gray-500">Permite editar configurações de reembolso</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handlePermissionChange('reimbursement_edit', !hasPermission('reimbursement_edit'))}
              disabled={readOnly}
              className={`w-10 h-5 relative rounded-full transition-colors duration-200 ease-in-out ${
                hasPermission('reimbursement_edit') ? 'bg-green-500' : 'bg-gray-300'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${
                  hasPermission('reimbursement_edit') ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md flex items-start">
        <FiInfo className="mr-2 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          Administradores têm todas as permissões de reembolso automaticamente. Gerentes têm permissão de aprovação por padrão.
        </p>
      </div>
    </div>
  );
};

export default ReimbursementPermissionsEditor;
