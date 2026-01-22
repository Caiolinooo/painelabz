import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiUsers, FiMonitor } from 'react-icons/fi';

interface VideoCallProps {
    channelId: string;
    onLeave: () => void;
    initialVideoEnabled?: boolean;
}

interface PeerConnection {
    userId: string;
    connection: RTCPeerConnection;
    stream?: MediaStream;
}

interface PeerStatus {
    muted: boolean;
    videoOff: boolean;
    userName?: string;
    avatarUrl?: string;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        // Free TURN servers for better NAT traversal
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
};

export default function VideoCall({ channelId, onLeave, initialVideoEnabled = true }: VideoCallProps) {
    const { user, profile } = useSupabaseAuth();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<PeerConnection[]>([]);
    const [peerStatuses, setPeerStatuses] = useState<{ [userId: string]: PeerStatus }>({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(!initialVideoEnabled);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const displayName = (() => {
        const p = profile as any;
        const name = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
        return name || (user as any)?.name || (user as any)?.email || 'Usuário';
    })();
    const avatarUrl = (profile as any)?.drive_photo_url || (profile as any)?.avatar || null;

    // Refs for tracking state inside callbacks
    const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<any>(null);

    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        // Only setup signaling, do NOT start media automatically
        return () => {
            cleanup();
        };
    }, []);

    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
        }
    }, [isMuted, isVideoOff, localStream]);

    const handleJoinClick = async () => {
        await startLocalStream(true);
    };

    const startLocalStream = async (retryWithVideo = true) => {
        setPermissionError(null);

        // Check if we're on HTTPS (required for mediaDevices on mobile)
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (!isSecure) {
            setPermissionError(
                '⚠️ Conexão não segura (HTTP). Para acessar câmera e microfone em dispositivos móveis, o site precisa estar em HTTPS. ' +
                'Por favor, acesse via https:// ou peça ao administrador para configurar SSL.'
            );
            return;
        }

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setPermissionError(
                '⚠️ Seu navegador não suporta acesso a câmera/microfone. ' +
                'Por favor, use um navegador moderno como Chrome, Firefox ou Safari.'
            );
            return;
        }

        try {
            const constraints = {
                audio: true,
                video: retryWithVideo
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            localStreamRef.current = stream;

            // Initial track state
            stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            stream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            setHasJoined(true);
            joinCall();
        } catch (err: any) {
            console.error('Error accessing media devices:', err);

            // Fallback: If video failed (e.g. NotFoundError), try audio only if we haven't already
            if (retryWithVideo && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
                console.log('Video device not found, retrying with audio only...');
                setIsVideoOff(true); // Force video off state
                await startLocalStream(false);
                return;
            }

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('🚫 Permissão negada. Toque no ícone de cadeado na barra de endereço e permita o acesso à câmera e microfone.');
            } else if (err.name === 'NotFoundError') {
                setPermissionError('🎤 Nenhum microfone encontrado. Conecte um dispositivo de áudio para participar.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setPermissionError('📱 Câmera ou microfone em uso por outro aplicativo. Feche outros apps e tente novamente.');
            } else if (err.name === 'OverconstrainedError') {
                setPermissionError('⚙️ Configuração de dispositivo não suportada. Tentando modo compatível...');
                if (retryWithVideo) {
                    await startLocalStream(false);
                    return;
                }
            } else {
                setPermissionError('❌ Não foi possível acessar seus dispositivos. ' + (err.message || 'Verifique as permissões do navegador.'));
            }
        }
    };

    const joinCall = () => {
        // Setup Supabase Realtime for Signaling
        const channel = supabase.channel(`call:${channelId}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
                if (payload.userId === user?.id) return;
                console.log('Received offer from', payload.userId);
                await handleOffer(payload);
            })
            .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
                if (payload.userId === user?.id) return;
                console.log('Received answer from', payload.userId);
                await handleAnswer(payload);
            })
            .on('broadcast', { event: 'candidate' }, async ({ payload }: any) => {
                if (payload.userId === user?.id) return;
                console.log('Received candidate from', payload.userId);
                await handleCandidate(payload);
            })
            .on('broadcast', { event: 'user-joined' }, async ({ payload }: any) => {
                if (payload.userId === user?.id) return;
                console.log('User joined:', payload.userId);

                // IMPORTANT: Introduce a small random delay to avoid collision in perfectly simultaneous joins (though unlikely in manual join)
                // But mainly, the existing user initiates connection to the new user.
                initiateConnection(payload.userId);

                // Also broadcast our status again to ensure they have it
                broadcastStatus(isMuted, isVideoOff);
            })
            .on('broadcast', { event: 'user-left' }, ({ payload }: any) => {
                removePeer(payload.userId);
            })
            .on('broadcast', { event: 'peer-update' }, ({ payload }: any) => {
                if (payload.userId === user?.id) return;
                setPeerStatuses(prev => ({
                    ...prev,
                    [payload.userId]: {
                        muted: payload.muted,
                        videoOff: payload.videoOff,
                        userName: payload.userName,
                        avatarUrl: payload.avatarUrl
                    }
                }));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Joined signaling channel');
                    // Announce presence
                    channel.send({
                        type: 'broadcast',
                        event: 'user-joined',
                        payload: { userId: user?.id }
                    });

                    // Announce initial status
                    channel.send({
                        type: 'broadcast',
                        event: 'peer-update',
                        payload: {
                            userId: user?.id,
                            muted: isMuted,
                            videoOff: isVideoOff,
                            userName: displayName,
                            avatarUrl: avatarUrl
                        }
                    });
                }
            });
    };

    const initiateConnection = async (targetUserId: string) => {
        if (peersRef.current[targetUserId]) return; // Already connected

        console.log('Initiating connection to', targetUserId);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current[targetUserId] = pc;

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log('Received remote track from', targetUserId);
            addPeerStream(targetUserId, pc, event.streams[0]);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'candidate',
                    payload: {
                        targetUserId,
                        userId: user?.id,
                        candidate: event.candidate
                    }
                });
            }
        };

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channelRef.current?.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
                targetUserId,
                userId: user?.id,
                sdp: offer
            }
        });
    };

    const handleOffer = async (payload: any) => {
        // Determine if offer is for me (if targeting specific user logic existed) or broadcast
        // For simplicity in mesh, respond if not already connected acting as answerer
        const { userId: remoteUserId, sdp } = payload;

        // In a mesh, offers usually direct. Here we assume offers are specific.
        // If using broadcast for offers, we need logic to avoid processing wrong offers.
        // However, for this simple implementation, let's assume we check targetUserId if provided, or accept.
        if (payload.targetUserId && payload.targetUserId !== user?.id) return;

        console.log('Handling offer from', remoteUserId);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current[remoteUserId] = pc;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        pc.ontrack = (event) => {
            console.log('Received remote track (answerer) from', remoteUserId);
            addPeerStream(remoteUserId, pc, event.streams[0]);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'candidate',
                    payload: {
                        targetUserId: remoteUserId,
                        userId: user?.id,
                        candidate: event.candidate
                    }
                });
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channelRef.current?.send({
            type: 'broadcast',
            event: 'answer',
            payload: {
                targetUserId: remoteUserId,
                userId: user?.id,
                sdp: answer
            }
        });
    };

    const handleAnswer = async (payload: any) => {
        const { userId: remoteUserId, sdp, targetUserId } = payload;
        if (targetUserId && targetUserId !== user?.id) return;

        const pc = peersRef.current[remoteUserId];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    };

    const handleCandidate = async (payload: any) => {
        const { userId: remoteUserId, candidate, targetUserId } = payload;
        if (targetUserId && targetUserId !== user?.id) return;

        const pc = peersRef.current[remoteUserId];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const addPeerStream = (userId: string, connection: RTCPeerConnection, stream: MediaStream) => {
        setPeers(prev => {
            const existing = prev.find(p => p.userId === userId);
            if (existing) return prev; // Avoid dups
            return [...prev, { userId, connection, stream }];
        });
    };

    const removePeer = (userId: string) => {
        if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
        }
        setPeers(prev => prev.filter(p => p.userId !== userId));
    };

    const cleanup = () => {
        // Close local stream
        localStreamRef.current?.getTracks().forEach(track => track.stop());

        // Close peer connections
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};

        // Leave Supabase channel
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'user-left',
                payload: { userId: user?.id }
            });
            supabase.removeChannel(channelRef.current);
        }
    };

    // Actions
    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        broadcastStatus(newMutedState, isVideoOff);
    };

    const toggleVideo = () => {
        const newVideoState = !isVideoOff;
        setIsVideoOff(newVideoState);
        broadcastStatus(isMuted, newVideoState);
    };

    const broadcastStatus = (muted: boolean, videoOff: boolean) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'peer-update',
            payload: {
                userId: user?.id,
                muted: muted,
                videoOff: videoOff,
                userName: displayName,
                avatarUrl: avatarUrl
            }
        });
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const videoTrack = screenStream.getVideoTracks()[0];

                // Replace video track in all connections
                Object.values(peersRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(videoTrack);
                });

                videoTrack.onended = () => {
                    stopScreenShare();
                };

                setLocalStream(screenStream); // Update local preview
                setIsScreenSharing(true);
            } catch (e) {
                console.error(e);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = async () => {
        // Revert to camera
        try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = cameraStream.getVideoTracks()[0];

            Object.values(peersRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(videoTrack);
            });

            setLocalStream(cameraStream);
            if (localVideoRef.current) localVideoRef.current.srcObject = cameraStream;
            setIsScreenSharing(false);

            // Re-apply mute state
            cameraStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        } catch (e) {
            console.error(e);
        }
    };

    if (!hasJoined) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#111319] text-white p-6">
                <div className="bg-[#1e1f22] p-8 rounded-2xl shadow-2xl border border-white/5 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <FiVideo className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-slate-100">Pronto para participar?</h2>
                    <p className="text-zinc-400 mb-8">
                        Você está entrando na chamada. Clique no botão abaixo para permitir o acesso à câmera e microfone.
                    </p>

                    {permissionError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm mb-6 flex items-start text-left">
                            <FiPhoneOff className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                            <span>{permissionError}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleJoinClick}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                        >
                            <FiVideo className="w-5 h-5" />
                            Entrar com Vídeo
                        </button>
                        <button
                            onClick={() => startLocalStream(false)}
                            className="w-full bg-[#2b2d31] hover:bg-[#35373c] text-zinc-300 font-semibold py-3.5 px-6 rounded-lg transition-all border border-white/5 flex items-center justify-center gap-2"
                        >
                            <FiMic className="w-5 h-5" />
                            Entrar apenas com Áudio
                        </button>
                    </div>

                    <button
                        onClick={onLeave}
                        className="mt-6 text-zinc-500 hover:text-zinc-300 text-sm underline underline-offset-4 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#111319] text-white relative overflow-hidden">
            {/* Grid of Users */}
            <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
                {/* Local User */}
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video shadow-lg border-2 border-indigo-500/50 group">
                    {permissionError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 p-4 text-center">
                            <FiPhoneOff className="w-10 h-10 text-red-300 mb-2" />
                            <p className="text-white text-sm font-medium mb-3">{permissionError}</p>
                            <button
                                onClick={() => setRetryCount(p => p + 1)}
                                className="bg-white text-red-900 px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-200 transition-colors"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : isVideoOff ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                            {avatarUrl ? (
                                <img src={avatarUrl} className="w-20 h-20 rounded-full object-cover shadow-2xl border-2 border-white/10" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
                                    {displayName.charAt(0)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}

                    {!permissionError && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1.5 rounded-full backdrop-blur-sm max-w-[80%] border border-white/10">
                            {avatarUrl ? (
                                <img src={avatarUrl} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                                    {displayName.charAt(0)}
                                </div>
                            )}
                            <span className="text-xs font-medium truncate text-white shadow-sm">
                                Você {isMuted && '(Mudo)'}
                            </span>
                        </div>
                    )}

                    {/* Controls Overlay (Hover) */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-3 rounded-full transition-all transform hover:scale-110 ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-white text-gray-900'}`}
                            title={isMuted ? "Desmutar" : "Mutar"}
                        >
                            {isMuted ? <FiMicOff /> : <FiMic />}
                        </button>
                        <button
                            onClick={() => setIsVideoOff(!isVideoOff)}
                            className={`p-3 rounded-full transition-all transform hover:scale-110 ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-white text-gray-900'}`}
                            title={isVideoOff ? "Ligar Câmera" : "Desligar Câmera"}
                        >
                            {isVideoOff ? <FiVideoOff /> : <FiVideo />}
                        </button>
                        <button
                            onClick={() => onLeave()}
                            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110"
                            title="Sair da chamada"
                        >
                            <FiPhoneOff />
                        </button>
                    </div>
                </div>

                {/* Remote Users */}
                {peers.map(peer => {
                    const status = peerStatuses[peer.userId] || { muted: false, videoOff: false };
                    return (
                        <div key={peer.userId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video shadow-lg border border-white/10">
                            {status.videoOff ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                                        <FiUsers className="w-10 h-10 text-gray-500" />
                                    </div>
                                </div>
                            ) : (
                                <RemoteVideo stream={peer.stream} />
                            )}

                            <div className="absolute top-2 right-2 flex gap-2">
                                {status.muted && (
                                    <div className="bg-red-500/90 text-white p-1.5 rounded-full shadow-sm">
                                        <FiMicOff className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm max-w-[80%]">
                                {status.avatarUrl ? (
                                    <img src={status.avatarUrl} className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                                        {(status.userName || '?').charAt(0)}
                                    </div>
                                )}
                                <span className="text-sm font-medium truncate text-white shadow-sm">
                                    {status.userName || 'Usuário'}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {peers.length === 0 && (
                    <div className="flex items-center justify-center h-full col-span-full opacity-50 text-gray-400">
                        <div className="text-center">
                            <FiUsers className="w-12 h-12 mx-auto mb-2" />
                            <p>Esperando outros entrarem...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-4 px-4 z-20">
                <button onClick={toggleMute} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {isMuted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
                </button>
                <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {isVideoOff ? <FiVideoOff className="w-6 h-6" /> : <FiVideo className="w-6 h-6" />}
                </button>
                <button onClick={toggleScreenShare} className={`p-4 rounded-full transition-colors ${isScreenSharing ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <FiMonitor className="w-6 h-6" />
                </button>
                <button onClick={onLeave} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors ml-4">
                    <FiPhoneOff className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}

function RemoteVideo({ stream }: { stream?: MediaStream }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}
