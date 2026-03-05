'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Função para extrair ID do vídeo do YouTube
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

// Função para extrair ID do vídeo do Google Drive
const getGoogleDriveVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
};

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  initialPosition?: number;
  onProgress?: (currentTime: number, progressPercentage: number) => void;
  onComplete?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  initialPosition = 0,
  onProgress,
  onComplete,
  className = ''
}) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressReportRef = useRef<number>(0); // Track last reported time
  const onProgressRef = useRef(onProgress); // Stable ref for callbacks
  const onCompleteRef = useRef(onComplete);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer para esconder controles
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Keep refs in sync without re-triggering effects
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Fire progress at most every 5 seconds
  const fireProgress = useCallback((time: number, percentage: number) => {
    const now = Date.now();
    if (now - lastProgressReportRef.current >= 4500) { // ~5s with tolerance
      lastProgressReportRef.current = now;
      onProgressRef.current?.(time, percentage);
    }
  }, []);

  // Native video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      if (initialPosition > 0) {
        video.currentTime = initialPosition;
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      const percentage = video.duration > 0 ? (current / video.duration) * 100 : 0;
      fireProgress(current, percentage);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onCompleteRef.current?.();
    };

    const handleError = () => {
      setError(t('components.erroAoCarregarOVideo'));
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fireProgress]);

  // YouTube Player — NO callback in deps, use refs
  useEffect(() => {
    const youtubeVideoId = getYouTubeVideoId(src);
    if (!youtubeVideoId) return;

    const initYTPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player-container', {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          start: initialPosition > 0 ? Math.floor(initialPosition) : 0,
        },
        events: {
          onReady: (event: any) => {
            const playerDuration = event.target.getDuration();
            setDuration(playerDuration);
            setIsLoading(false);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);

              if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
              ytIntervalRef.current = setInterval(() => {
                if (ytPlayerRef.current?.getCurrentTime) {
                  const current = ytPlayerRef.current.getCurrentTime();
                  const playerDuration = ytPlayerRef.current.getDuration();
                  setCurrentTime(current);

                  const percentage = playerDuration > 0 ? (current / playerDuration) * 100 : 0;

                  // Use ref-based progress reporting with throttle
                  const now = Date.now();
                  if (now - lastProgressReportRef.current >= 4500) {
                    lastProgressReportRef.current = now;
                    onProgressRef.current?.(current, percentage);
                  }
                }
              }, 1000);

            } else {
              setIsPlaying(false);
              if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);

              if (event.data === window.YT.PlayerState.ENDED) {
                onCompleteRef.current?.();
              }
            }
          },
          onError: () => {
            setError(t('components.erroAoCarregarOVideo'));
            setIsLoading(false);
          }
        }
      });
    };

    // Load YouTube API if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    } else {
      initYTPlayer();
    }

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]); // ← DO NOT put initialPosition or t in deps! It causes recreate loops.

  // Google Drive progress tracking
  useEffect(() => {
    const driveVideoId = getGoogleDriveVideoId(src);
    if (!driveVideoId) return;

    if (initialPosition > 0 && currentTime === 0) {
      setCurrentTime(initialPosition);
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setCurrentTime((prev) => {
          const newTime = prev + 5;
          // Use ref-based callback
          const now = Date.now();
          if (now - lastProgressReportRef.current >= 4500) {
            lastProgressReportRef.current = now;
            onProgressRef.current?.(newTime, 0);
          }
          return newTime;
        });
      }
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      setShowControls(true);
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); } else { video.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar || duration === 0) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!isFullscreen) { container.requestFullscreen(); } else { document.exitFullscreen(); }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const youtubeVideoId = getYouTubeVideoId(src);
  const isYouTube = !!youtubeVideoId;
  const driveVideoId = getGoogleDriveVideoId(src);
  const isDrive = !!driveVideoId;

  // YouTube player
  if (isYouTube) {
    return (
      <div
        ref={containerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${className}`}
        style={{ paddingBottom: '56.25%', height: 0 }}
      >
        <div id="youtube-player-container" className="absolute top-0 left-0 w-full h-full border-0"></div>
      </div>
    );
  }

  // Google Drive player
  if (isDrive) {
    return (
      <div
        ref={containerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${className}`}
        style={{ paddingBottom: '56.25%', height: 0 }}
      >
        <iframe
          src={`https://drive.google.com/file/d/${driveVideoId}/preview`}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // Native video player
  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full"
        onClick={togglePlay}
        onLoadStart={() => setIsLoading(true)}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
          }`}
      >
        {/* Play button overlay */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-4 transition-all duration-200"
            >
              <PlayIcon className="w-12 h-12 text-white" />
            </button>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="w-full h-1 bg-white bg-opacity-30 rounded-full cursor-pointer mb-4"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-6 h-6" />
                  ) : (
                    <SpeakerWaveIcon className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white bg-opacity-30 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <Cog6ToothIcon className="w-6 h-6" />
                </button>

                {showSettings && (
                  <div className="absolute bottom-8 right-0 bg-black bg-opacity-90 rounded-lg p-2 min-w-32">
                    <div className="text-white text-sm mb-2">Velocidade</div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white hover:bg-opacity-20 ${playbackRate === rate ? 'text-blue-400' : 'text-white'
                          }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-6 h-6" />
                ) : (
                  <ArrowsPointingOutIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      {title && showControls && (
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white text-lg font-medium truncate">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
