'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import NewsPostCard from '@/components/news/NewsPostCard';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { NewsPost } from '@/types/news';
import { fetchWithToken } from '@/lib/tokenStorage';

export default function SinglePostPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useSupabaseAuth();
    const [post, setPost] = useState<NewsPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const postId = params.id as string;

    useEffect(() => {
        const loadPost = async () => {
            if (!postId) return;

            try {
                setLoading(true);
                // Usar a API existente que suporta GET por ID
                const response = await fetchWithToken(`/api/news/posts/${postId}`);

                if (!response.ok) {
                    throw new Error('Post não encontrado ou erro ao carregar');
                }

                const data = await response.json();
                setPost(data);
            } catch (err) {
                console.error('Erro ao carregar post:', err);
                setError('Não foi possível carregar a publicação.');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [postId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
                <div className="text-red-500 mb-4 font-medium">{error || 'Post não encontrado'}</div>
                <button
                    onClick={() => router.push('/news')}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    <span>Voltar para Notícias</span>
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => router.push('/news')}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span>Voltar para o Feed</span>
                </button>

                <NewsPostCard
                    post={post}
                    userId={user?.id}
                    onPostUpdated={(updated) => setPost(updated)}
                    onDelete={() => router.push('/news')}
                />
            </div>
        </div>
    );
}
