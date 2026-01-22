'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import {
  FiLoader,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiMoreHorizontal,
  FiX,
  FiArrowUp,
  FiUser
} from 'react-icons/fi';
import { HiHeart, HiShoppingBag } from 'react-icons/hi';
import Link from 'next/link';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useI18n } from '@/contexts/I18nContext';

// --- Subcomponents ---

function TopGradientCard({ user, profile, t }: { user: any; profile: any; t: any }) {
  const firstName =
    profile?.first_name?.split(' ')[0] ||
    user?.first_name?.split(' ')[0] ||
    user?.email?.split('@')[0]?.split('.')[0] ||
    'Fulanito';

  return (
    <div className="relative w-full bg-gradient-to-r from-white via-blue-50 to-blue-100 rounded-[2.5rem] p-8 md:p-12 mb-8 flex flex-col md:flex-row items-start justify-between min-h-[300px]">

      {/* Left Content */}
      <div className="flex-1 z-10 max-w-2xl mt-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          {t('dashboard.hello', { name: firstName })}
        </h1>
        <p className="text-gray-500 text-xl font-normal mb-8">
          {t('dashboard.welcomeMessage')}
        </p>

        <div className="flex items-center gap-4 w-full max-w-xl">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              className="block w-full pl-14 pr-6 py-4 bg-white border-0 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-lg transition-all"
            />
          </div>

          <Link href="/noticias" className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 hover:shadow-md transition-all border border-transparent hover:border-blue-100 shadow-[0_2px_20px_rgba(0,0,0,0.04)] flex-shrink-0" title="Nova Publicação">
            <FiPlus className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Right Content - Gray Placeholder Widget */}
      <div className="hidden md:block w-72 h-64 bg-gray-300/50 rounded-lg flex-shrink-0 mix-blend-multiply self-center mb-8 md:mb-0 md:mr-10">
      </div>
    </div>
  );
}

// FeaturedBanner, QuickLinkCard, and EventsWidget removed as they are now imported components

// --- Main Page Component ---

// --- Main Page Component ---
import DashboardNewsWidget from '@/components/dashboard/DashboardNewsWidget';
import QuickLinksWidget from '@/components/dashboard/QuickLinksWidget';
import EventsWidget from '@/components/dashboard/EventsWidget';

export default function Dashboard() {
  const { user, profile, isAuthenticated, isLoading } = useSupabaseAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <FiLoader className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <MainLayout>
      <div className="min-h-full bg-white pb-10">
        {/* Top Section contains the gradient */}
        <TopGradientCard user={user} profile={profile} t={t} />

        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Banner - Spans 5 (News) */}
            <div className="lg:col-span-5 min-h-[400px]">
              <DashboardNewsWidget />
            </div>

            {/* Center Column - Quick Links - Spans 4 */}
            <div className="lg:col-span-4">
              <QuickLinksWidget />
            </div>

            {/* Right Column - Events - Spans 3 */}
            <div className="lg:col-span-3 h-full">
              <EventsWidget />
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
