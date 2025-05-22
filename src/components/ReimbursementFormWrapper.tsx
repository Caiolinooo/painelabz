'use client';

import React, { useEffect } from 'react';
import ReimbursementForm from './ReimbursementForm';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Wrapper component for ReimbursementForm that handles auto-population
 * of user profile data without causing conflicts with authentication contexts
 */
export default function ReimbursementFormWrapper() {
  const { profile } = useSupabaseAuth();

  return <ReimbursementForm profile={profile} />;
}
