'use client';

import React from 'react';
import AuthorizedUsersManager from '@/components/admin/AuthorizedUsersManager';
import { FiUserCheck } from 'react-icons/fi';

export default function AdminAuthorizedUsersPage() {
  return (
    <div className="container mx-auto">
      <div className="flex items-center mb-6">
        <FiUserCheck className="h-6 w-6 text-abz-blue mr-2" />
        <h1 className="text-2xl font-bold text-abz-blue">Usuários Autorizados</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <AuthorizedUsersManager />
      </div>
    </div>
  );
}
