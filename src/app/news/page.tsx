'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/news-feed');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando para o novo feed...</p>
      </div>
    </div>
  );
}
