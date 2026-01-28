'use client';

import React from 'react';
import Link from 'next/link';
import { HiHeart, HiShoppingBag, HiDocumentText, HiClock, HiAcademicCap } from 'react-icons/hi';
import { FiEdit2 } from 'react-icons/fi';
import { useI18n } from '@/contexts/I18nContext';

interface QuickLinkProps {
    title: string;
    subtitle: string;
    icon: any;
    href: string;
    iconBgColor: string;
    iconColor: string;
}

function QuickLinkCard({
    title,
    subtitle,
    icon: Icon,
    href,
    iconBgColor,
    iconColor,
}: QuickLinkProps) {
    return (
        <Link
            href={href}
            className="group bg-white hover:bg-gray-50 border-0 rounded-3xl p-5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg flex items-center h-[100px]"
        >
            <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform ${iconBgColor}`}
            >
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div>
                <h4 className="font-bold text-gray-900 text-lg mb-0.5">{title}</h4>
                <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
            </div>
        </Link>
    );
}

import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';

export default function QuickLinksWidget() {
    const { t } = useI18n();
    const { hasPermission } = useEffectivePermissions();

    // Dynamically translated list with IDs
    const links = [
        {
            id: 'ponto',
            title: t('menu.ponto'),
            subtitle: t('dashboard.registerPoint'),
            icon: HiClock,
            href: '/ponto',
            iconBgColor: 'bg-blue-50',
            iconColor: 'text-blue-500'
        },
        {
            id: 'reembolso',
            title: t('menu.reembolso'),
            subtitle: t('dashboard.requests'),
            icon: HiShoppingBag,
            href: '/reembolso',
            iconBgColor: 'bg-orange-50',
            iconColor: 'text-orange-500'
        },
        {
            id: 'contracheque',
            title: t('menu.contracheque'),
            subtitle: t('dashboard.payslips'),
            icon: HiDocumentText,
            href: '/contracheque',
            iconBgColor: 'bg-green-50',
            iconColor: 'text-green-500'
        },
        {
            id: 'academy',
            title: t('menu.academy'),
            subtitle: t('dashboard.courses'),
            icon: HiAcademicCap,
            href: '/academy',
            iconBgColor: 'bg-purple-50',
            iconColor: 'text-purple-500'
        }
    ];

    // Filter links based on permission
    const filteredLinks = links.filter(link => hasPermission(link.id));

    if (filteredLinks.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 text-lg">{t('dashboard.quickLinks')}</h3>
                <FiEdit2 className="text-gray-300 w-4 h-4 cursor-pointer hover:text-gray-500" title={t('common.edit')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 flex-1">
                {filteredLinks.map((link) => (
                    <QuickLinkCard key={link.href} {...link} />
                ))}
            </div>
        </div>
    );
}
