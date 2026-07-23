'use client';

import React, { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/Layout/MainLayout';
import UserProfileView from '@/components/Profile/UserProfileView';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function PublicProfilePage(props: PageProps) {
    const params = use(props.params);
    const { user: currentUser } = useSupabaseAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            if (!params.id) return;

            try {
                setLoading(true);
                // Fetch basic info from users_unified public view if possible, or use RPC/Table
                // Assuming RLS allows reading basic info of other users or this is an admin/internal tool
                // For now, let's try direct select. If RLS fails, we might need an edge function or more open RLS.
                const { data, error } = await supabase
                    .from('users_unified')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    setError(true);
                } else if (data) {
                    setProfile(data);
                } else {
                    setError(true); // Not found
                }
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [params.id]);

    if (error) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Usuário não encontrado</h2>
                    <p className="text-gray-500 mb-6">O perfil que você está procurando não existe ou você não tem permissão para vê-lo.</p>
                    <Link href="/dashboard" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Voltar para o Início
                    </Link>
                </div>
            </MainLayout>
        );
    }

    // Redirect to "My Profile" if viewing own profile
    if (!loading && profile && currentUser && profile.id === currentUser.id) {
        return (
            <MainLayout>
                <div className="p-6">
                    <div className="mb-6">
                        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors w-fit">
                            <FiArrowLeft /> Voltar
                        </Link>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-center text-blue-800">
                        Este é o seu perfil público. <Link href="/profile" className="font-semibold underline">Clique aqui para editar</Link>.
                    </div>
                    <UserProfileView user={profile} isOwnProfile={true} isLoading={false} />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6">
                <div className="mb-6">
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors w-fit">
                        <FiArrowLeft /> Voltar
                    </Link>
                </div>
                <UserProfileView user={profile} isOwnProfile={false} isLoading={loading} />
            </div>
        </MainLayout>
    );
}
