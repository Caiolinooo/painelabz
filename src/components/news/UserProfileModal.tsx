'use client';

import React from 'react';
import { FiX, FiMail, FiUser, FiBriefcase, FiCalendar } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface UserProfileModalProps {
    user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
        avatar?: string;
        drive_photo_url?: string;
        bio?: string;
        department?: string;
        joined_at?: string;
    } | null;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
    const { t } = useI18n();

    if (!user) return null;

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Admin</span>;
            case 'editor':
                return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Editor</span>;
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Usuário</span>;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in-up">

                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black bg-opacity-20 hover:bg-opacity-40 rounded-full text-white transition-all"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Content */}
                <div className="px-6 pb-8">

                    {/* Avatar */}
                    <div className="relative -mt-16 mb-4 flex justify-center">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                            {user.avatar || user.drive_photo_url ? (
                                <img
                                    src={user.avatar || user.drive_photo_url}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-gray-500">
                                        {user.first_name.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {user.first_name} {user.last_name}
                        </h2>
                        <div className="mt-2 text-sm text-gray-500 flex items-center justify-center space-x-2">
                            {getRoleBadge(user.role)}
                            {user.department && (
                                <span className="text-gray-600">• {user.department}</span>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4">

                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                                <FiMail className="w-5 h-5" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</p>
                                <p className="text-sm text-gray-900 truncate" title={user.email}>{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4">
                                <FiUser className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">ID do Usuário</p>
                                <p className="text-xs text-gray-700 font-mono mt-1">{user.id}</p>
                            </div>
                        </div>

                        {user.joined_at && (
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
                                    <FiCalendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Membro desde</p>
                                    <p className="text-sm text-gray-900">{formatDate(user.joined_at)}</p>
                                </div>
                            </div>
                        )}

                        {/* Bio or About - Placeholder if data existed */}
                        {user.bio && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 italic text-gray-600 text-sm">
                                "{user.bio}"
                            </div>
                        )}

                    </div>

                    {/* Actions (if needed later, e.g. "Edit User" for super admins) */}
                    {/* <div className="mt-8">
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Ver Atividades
            </button>
          </div> */}

                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
