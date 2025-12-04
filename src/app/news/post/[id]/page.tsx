'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function PostRedirect() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    useEffect(() => {
        if (id) {
            router.replace(`/news-feed?post_id=${id}`);
        } else {
            router.replace('/news-feed');
        }
    }, [router, id]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecionando para a publicação...</p>
            </div>
        </div>
    );
}
