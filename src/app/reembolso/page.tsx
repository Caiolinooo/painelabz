'use client';

import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import ReimbursementForm from '@/components/ReimbursementForm';

export default function ReembolsoPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <ReimbursementForm />
      </div>
    </MainLayout>
  );
}
