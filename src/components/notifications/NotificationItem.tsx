import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { FiHeart, FiMessageCircle, FiUserPlus, FiClipboard, FiInfo, FiBell } from 'react-icons/fi';

export interface AppNotification {
    id: string;
    read_at?: string | null;
    type: string;
    actor?: { first_name?: string; last_name?: string; avatar?: string | null; drive_photo_url?: string | null; };
    metadata?: any;
    resource_id?: string;
    message?: string;
    title?: string;
    created_at: string;
    link?: string;
    action_url?: string;
}

interface NotificationItemProps {
    notification: AppNotification;
    onRead: (id: string) => void;
    onClick: (notification: AppNotification) => void;
}

// Known logo URL patterns to filter out — these are company assets, not user photos
const LOGO_PATTERNS = ['logo.png', 'lc1_azul.png', 'logo_azul', '/icons/icon-192', '/images/logo'];

function ActorAvatar({ actor, typeIcon }: {
    actor?: AppNotification['actor'];
    typeIcon: React.ReactNode;
}) {
    const [imgError, setImgError] = useState(false);

    // Resolve avatar URL and filter out company logos
    let avatarUrl = actor?.avatar || actor?.drive_photo_url || null;
    if (avatarUrl) {
        const lower = avatarUrl.toLowerCase();
        if (LOGO_PATTERNS.some(p => lower.includes(p))) {
            avatarUrl = null;
        }
    }

    const firstInitial = actor?.first_name?.charAt(0)?.toUpperCase() || null;
    const lastInitial = actor?.last_name?.charAt(0)?.toUpperCase() || '';

    // No actor at all → show big type icon as the avatar
    if (!actor) {
        return (
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm">
                {typeIcon}
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 relative bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center">
            {/* Initials — always rendered as background fallback */}
            <span className="text-white text-sm font-bold z-0 select-none">
                {firstInitial}{lastInitial}
            </span>
            {/* Photo — overlaid on top; hidden on error */}
            {avatarUrl && !imgError && (
                <img
                    src={avatarUrl}
                    alt={actor.first_name || 'Avatar'}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onClick }) => {
    const { t, locale } = useI18n();
    const isRead = !!notification.read_at;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isRead) onRead(notification.id);
        onClick(notification);
    };

    const getIcon = (large = false) => {
        const sz = large ? 'w-5 h-5 text-white' : 'w-4 h-4 text-white';
        const cls = large ? 'p-2 rounded-full w-full h-full flex items-center justify-center' : 'p-1 rounded-full';
        switch (notification.type) {
            case 'like': return <div className={`bg-red-500 ${cls}`}><FiHeart className={sz} /></div>;
            case 'comment': return <div className={`bg-blue-500 ${cls}`}><FiMessageCircle className={sz} /></div>;
            case 'invite': return <div className={`bg-green-500 ${cls}`}><FiUserPlus className={sz} /></div>;
            case 'evaluation': return <div className={`bg-purple-500 ${cls}`}><FiClipboard className={sz} /></div>;
            case 'system': return <div className={`bg-gray-500 ${cls}`}><FiInfo className={sz} /></div>;
            case 'purchase_order': return <div className={`bg-orange-500 ${cls}`}><FiClipboard className={sz} /></div>;
            case 'news_post': return <div className={`bg-sky-500 ${cls}`}><FiBell className={sz} /></div>;
            default: return <div className={`bg-blue-400 ${cls}`}><FiBell className={sz} /></div>;
        }
    };

    const formatTime = (dateString: string) => {
        const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
        if (diff < 1) return locale === 'pt-BR' ? 'Agora' : 'Now';
        if (diff < 60) return `${diff}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        return `${Math.floor(diff / 1440)}d`;
    };

    const actorName = notification.actor
        ? `${notification.actor.first_name || ''} ${notification.actor.last_name || ''}`.trim()
        : null;

    const getMessage = () => {
        const meta = notification.metadata as any;
        if (meta?.type) {
            const number = meta.poNumber || (notification.resource_id ? `#${notification.resource_id.slice(0, 8)}` : '');
            let value = meta.value;
            if (value && !isNaN(Number(value))) {
                value = Number(value).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', { style: 'currency', currency: 'BRL' });
            }
            switch (meta.type) {
                case 'po_created': return t('notifications.po_created', { number, provider: meta.provider, value });
                case 'po_approval_request': return t('notifications.po_approval_request', { number, provider: meta.provider, value });
                case 'po_approved': return t('notifications.po_approved', { number, provider: meta.provider, value });
                case 'po_rejected': return t('notifications.po_rejected', { number, provider: meta.provider, value });
            }
        }
        return notification.message || notification.title;
    };

    return (
        <div
            onClick={handleClick}
            className={`relative flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${!isRead ? 'bg-blue-50/50' : ''}`}
        >
            <div className="relative flex-shrink-0">
                <ActorAvatar actor={notification.actor} typeIcon={getIcon(true)} />
                {/* Type badge overlaid — only when there is a real actor */}
                {actorName && (
                    <div className="absolute -bottom-1 -right-1 shadow-sm">
                        {getIcon(false)}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 line-clamp-2">
                    {actorName && <span className="font-semibold text-gray-900 mr-1">{actorName}</span>}
                    <span className={actorName ? 'text-gray-600' : 'font-medium text-gray-900'}>
                        {getMessage()}
                    </span>
                </p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {formatTime(notification.created_at)}
                    {!isRead && <span className="w-2 h-2 bg-blue-500 rounded-full ml-1" />}
                </p>
            </div>
        </div>
    );
};

export default NotificationItem;
