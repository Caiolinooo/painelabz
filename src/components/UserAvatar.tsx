import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';

interface UserAvatarProps {
    user: any;
    profile: any;
    className?: string; // For container styling
}

export default function UserAvatar({ user, profile, className = "" }: UserAvatarProps) {
    const { config } = useSiteConfig();
    const [imgError, setImgError] = useState(false);

    // 1. Determine Avatar URL
    let avatarUrl = profile?.drive_photo_url || profile?.avatar || user?.user_metadata?.avatar_url;

    // 2. Filter out known logo URLs
    if (avatarUrl) {
        const lowerUrl = avatarUrl.toLowerCase();
        const isLogo = lowerUrl.includes('logo.png') ||
            lowerUrl.includes('lc1_azul.png') ||
            lowerUrl.includes('logo_azul') ||
            lowerUrl.includes('abz_group') ||
            lowerUrl.includes('abz-group') ||
            (config?.logo && lowerUrl.includes(config.logo.toLowerCase())) ||
            (config?.sidebar_logo && lowerUrl.includes(config.sidebar_logo.toLowerCase()));

        if (isLogo) avatarUrl = null;
    }

    // 3. Initials
    const firstInitial = profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U';
    const lastInitial = profile?.last_name?.charAt(0) || '';

    // Reset error state if url changes
    useEffect(() => {
        setImgError(false);
    }, [avatarUrl]);

    return (
        <div className={`relative overflow-hidden rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ${className}`}>
            {/* Background Initials always rendered, but hidden by image if loaded */}
            {(!avatarUrl || imgError) && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0">
                    {firstInitial}{lastInitial}
                </div>
            )}

            {/* Foreground Image */}
            {avatarUrl && !imgError && (
                <img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt="Profile"
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
}
