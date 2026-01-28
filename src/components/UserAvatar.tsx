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
    const [imgLoaded, setImgLoaded] = useState(false);

    // 1. Determine Avatar URL
    let avatarUrl = profile?.drive_photo_url || profile?.avatar || user?.user_metadata?.avatar_url;

    // 2. Filter out known logo URLs
    if (avatarUrl) {
        const lowerUrl = avatarUrl.toLowerCase();
        const isLogo = lowerUrl.includes('logo.png') ||
            lowerUrl.includes('lc1_azul.png') ||
            lowerUrl.includes('logo_azul') ||
            (config?.logo && lowerUrl.includes(config.logo.toLowerCase()));

        if (isLogo) avatarUrl = null;
    }

    // 3. Initials
    const firstInitial = profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U';
    const lastInitial = profile?.last_name?.charAt(0) || '';

    // Reset state if url changes
    useEffect(() => {
        setImgError(false);
        setImgLoaded(false);
    }, [avatarUrl]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Background Initials (Visible if no image, or image error, or image loading) */}
            {(!avatarUrl || imgError || !imgLoaded) && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold z-0">
                    {firstInitial}{lastInitial}
                </div>
            )}

            {/* Foreground Image */}
            {avatarUrl && !imgError && (
                <img
                    src={avatarUrl}
                    alt="Profile"
                    className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
}
