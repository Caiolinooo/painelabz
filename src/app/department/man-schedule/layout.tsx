'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';

export default function ManScheduleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MainLayout>
            {children}
        </MainLayout>
    );
}
