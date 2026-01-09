import React from 'react';
import { FiBell, FiHeart, FiMessageCircle, FiUserPlus, FiInfo, FiCheckCircle, FiClock, FiClipboard } from 'react-icons/fi';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onClick: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onClick }) => {
    const isRead = !!notification.read_at;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isRead) {
            onRead(notification.id);
        }
        onClick(notification);
    };

    const getIcon = () => {
        const className = "w-4 h-4 text-white";
        switch (notification.type) {
            case 'like': return <div className="bg-red-500 p-1 rounded-full"><FiHeart className={className} /></div>;
            case 'comment': return <div className="bg-blue-500 p-1 rounded-full"><FiMessageCircle className={className} /></div>;
            case 'invite': return <div className="bg-green-500 p-1 rounded-full"><FiUserPlus className={className} /></div>;
            case 'evaluation': return <div className="bg-purple-500 p-1 rounded-full"><FiClipboard className={className} /></div>;
            case 'system': return <div className="bg-gray-500 p-1 rounded-full"><FiInfo className={className} /></div>;
            default: return <div className="bg-blue-400 p-1 rounded-full"><FiBell className={className} /></div>;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 60000); // minutes

        if (diff < 1) return 'Agora';
        if (diff < 60) return `${diff}m`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h`;
        return `${Math.floor(diff / 1440)}d`;
    };

    const actorName = notification.actor
        ? `${notification.actor.first_name} ${notification.actor.last_name}`
        : null;

    const actorAvatar = notification.actor?.avatar;

    return (
        <div
            onClick={handleClick}
            className={`relative flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${!isRead ? 'bg-blue-50/50' : ''
                }`}
        >
            <div className="relative flex-shrink-0">
                {actorAvatar ? (
                    <img
                        src={actorAvatar}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                        {actorName ? actorName.charAt(0) : '?'}
                    </div>
                )}
                <div className="absolute -bottom-1 -right-1 shadow-sm">
                    {getIcon()}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-900 line-clamp-2">
                        {actorName && <span className="font-semibold text-gray-900 mr-1">{actorName}</span>}
                        <span className={actorName ? "text-gray-600" : "font-medium text-gray-900"}>
                            {notification.message || notification.title}
                        </span>
                    </p>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {formatTime(notification.created_at)}
                    {!isRead && <span className="w-2 h-2 bg-blue-500 rounded-full ml-1" />}
                </p>
            </div>
        </div>
    );
};

export default NotificationItem;
