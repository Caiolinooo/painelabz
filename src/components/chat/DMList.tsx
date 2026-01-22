import React from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi';

interface DMConversation {
    id: string;
    participants: {
        id: string;
        name: string;
        avatar?: string;
        status: string;
    }[];
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    unreadCount: number;
}

interface DMListProps {
    conversations: DMConversation[];
    selectedId?: string;
    currentUserId: string;
    onSelect: (conversation: DMConversation) => void;
    onStartDM: () => void;
}

export default function DMList({ conversations, selectedId, currentUserId, onSelect, onStartDM }: DMListProps) {
    const getOtherParticipant = (conv: DMConversation) => {
        return conv.participants.find(p => p.id !== currentUserId) || conv.participants[0];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'away': return 'bg-yellow-500';
            case 'dnd': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Mensagens Diretas</h3>
                <button
                    onClick={onStartDM}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                    title="Nova conversa"
                >
                    <FiMessageCircle className="w-4 h-4" />
                </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto py-2">
                {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <FiMessageCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">Nenhuma conversa ainda</p>
                        <button
                            onClick={onStartDM}
                            className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            Iniciar conversa
                        </button>
                    </div>
                ) : (
                    conversations.map(conv => {
                        const other = getOtherParticipant(conv);
                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors ${selectedId === conv.id ? 'bg-white/10' : ''}`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
                                        {other.avatar ? (
                                            <img src={other.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <span className="text-sm font-bold text-white">{other.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e1f22] ${getStatusColor(other.status)}`}></div>
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-200 truncate">{other.name}</span>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-zinc-500">{formatTime(conv.lastMessage.createdAt)}</span>
                                        )}
                                    </div>
                                    {conv.lastMessage && (
                                        <p className="text-xs text-zinc-500 truncate">{conv.lastMessage.content}</p>
                                    )}
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-bold text-white">{conv.unreadCount}</span>
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
