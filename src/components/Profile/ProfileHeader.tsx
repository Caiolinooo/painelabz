'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/contexts/I18nContext';
import { FiCamera, FiUser } from 'react-icons/fi';
import { PhotoUploadModal } from './PhotoUploadModal';

interface ProfileHeaderProps {
  user: any;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const { t } = useI18n();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const position = user?.position || t('profile.noPosition', 'Cargo não informado');
  const department = user?.department || t('profile.noDepartment', 'Departamento não informado');
  
  // Usar a foto do Google Drive se disponível, caso contrário usar o avatar ou um placeholder
  const photoUrl = user?.drive_photo_url || user?.avatar || null;

  return (
    <>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullName}
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            ) : (
              <FiUser className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
            aria-label={t('profile.changePhoto', 'Alterar foto')}
          >
            <FiCamera className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-gray-600">{position}</p>
          <p className="text-gray-500">{department}</p>
          <p className="text-gray-500 mt-1">{user?.email}</p>
          {user?.phone_number && (
            <p className="text-gray-500">{user.phone_number}</p>
          )}
        </div>
      </div>
      
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        userId={user?.id}
        currentPhotoUrl={photoUrl}
      />
    </>
  );
}
