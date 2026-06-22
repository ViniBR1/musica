'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { extractYouTubeId } from '@/lib/youtube';
import Peer from 'peerjs';

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  description: string;
  is_free_preview: boolean;
  order_number: number;
  module_id?: string;
  module_title?: string;
}

interface LiveRoom {
  id: string;
  title: string;
  description: string;
  room_code: string;
  peer_id: string;
  status: string;
  recording_url: string | null;
  teacher_name: string;
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  price: number;
  teacher_id: string;
  is_free: boolean;
  free_lesson_url: string | null;
  instrument_id: string | null;
  instrument_name?: string;
  instrument_icon?: string;
  lessons: Lesson[];
  lessons_count: number;
  sub_modules?: Module[];
  parent_id?: string | null;
  created_at: string;
  live_recordings?: LiveRoom[];
}

export default function ModuleLessonsPage({ params }: { params: { moduleId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [isWatchingLive, setIsWatchingLive] = useState(false);
  const [activeLive, setActiveLive] = useState<LiveRoom | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);

  const videoRef = useRef<HTMLDivElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchModuleAndCheckPurchase();
    fetchLiveRooms();
  }, [params.moduleId, status]);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (callRef.current) {
        callRef.current.close();
      }
    };
  }, []);

  const fetchLiveRooms = async () => {
    try {
      const response = await fetch(`/api/live-rooms?moduleId=${params.moduleId}`);
      const data = await response.json();
      setLiveRooms(data);
      
      const active = data.find((room: LiveRoom) => room.status === 'active');
      if (active) {
        setActiveLive(active);
      }
    } catch (error) {
      console.error('Erro ao buscar lives:', error);
    }
  };

  const fetchModuleAndCheckPurchase = async () => {
    try {
      console.log('📡 Buscando módulo:', params.moduleId);
      
      const moduleResponse = await fetch(`/api/modules/${params.moduleId}`);
      const moduleData = await moduleResponse.json();
      console.log('📦 Módulo:', moduleData);
      
      setModule(moduleData);

      const mainLessons = moduleData.lessons || [];
      const subLessons: Lesson[] = [];

      if (moduleData.sub_modules) {
        moduleData.sub_modules.forEach((sub: Module) => {
          const subLessonsWithModule = (sub.lessons || []).map((lesson: Lesson) => ({
            ...lesson,
            module_title: sub.title,
            module_id: sub.id,
          }));
          subLessons.push(...subLessonsWithModule);
        });
      }

      const all = [...mainLessons, ...subLessons];
      setAllLessons(all);

      const firstFreeLesson = all.find((l: Lesson) => l.is_free_preview);
      if (firstFreeLesson) {
        setSelectedLesson(firstFreeLesson);
      } else if (all.length > 0) {
        setSelectedLesson(all[0]);
      }

      if (session?.user?.id) {
        const purchaseResponse = await fetch(`/api/purchases?studentId=${session.user.id}`);
        const purchases = await purchaseResponse.json();
        const hasPurchased = purchases.some((p: any) => p.id === params.moduleId);
        setIsPurchased(hasPurchased);
        console.log('✅ Comprado?', hasPurchased);
      }
    } catch (error) {
      console.error('Erro ao carregar módulo:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = async () => {
    if (cameraEnabled) {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = false;
          localStreamRef.current?.removeTrack(track);
        });
      }
      setCameraEnabled(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: micEnabled,
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        
        if (callRef.current && stream) {
          callRef.current.addStream(stream);
        }
        
        setCameraEnabled(true);
      } catch (error) {
        console.error('❌ Erro ao ativar câmera:', error);
        alert('❌ Não foi possível acessar a câmera. Verifique as permissões.');
      }
    }
  };

  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micEnabled;
      });
    }
  };

  const watchLive = async (room: LiveRoom) => {
    if (room.status === 'recorded' && room.recording_url) {
      window.open(room.recording_url, '_blank');
      return;
    }

    if (room.status !== 'active') {
      alert('⚠️ Esta transmissão não está mais ativa.');
      return;
    }

    try {
      setIsWatchingLive(true);
      setActiveLive(room);

      const studentPeerId = `student-${session?.user?.id}-${Date.now()}`;

      const peer = new Peer(studentPeerId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('✅ Aluno conectado:', id);
        
        // CORRIGIDO: Sempre passar o stream ou undefined
        let call;
        if (localStreamRef.current) {
          call = peer.call(room.peer_id, localStreamRef.current);
        } else {
          call = peer.call(room.peer_id, undefined as any);
        }
        callRef.current = call;

        call.on('stream', (remoteStream) => {
          console.log('📹 Stream do professor recebido!');
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = remoteStream;
            liveVideoRef.current.play().catch(() => {});
          }
        });

        call.on('close', () => {
          alert('📹 Transmissão encerrada pelo professor');
          stopWatchingLive();
        });

        call.on('error', (err) => {
          console.error('❌ Erro na live:', err);
          alert('❌ Erro na conexão da live');
          stopWatchingLive();
        });
      });

      peer.on('error', (err) => {
        console.error('❌ Erro Peer:', err);
        alert('❌ Erro ao conectar à live');
        stopWatchingLive();
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      alert('❌ Erro ao assistir live');
      stopWatchingLive();
    }
  };

  const stopWatchingLive = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setIsWatchingLive(false);
    setIsParticipating(false);
    setActiveLive(null);
    setCameraEnabled(false);
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const toggleParticipation = async () => {
    if (!isWatchingLive) return;

    if (isParticipating) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (callRef.current) {
        callRef.current.removeStream(localStreamRef.current);
      }
      setCameraEnabled(false);
      setIsParticipating(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      alert('🔇 Você saiu da participação');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        
        localStreamRef.current = stream;
        
        if (callRef.current) {
          callRef.current.addStream(stream);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        
        setIsParticipating(true);
        setCameraEnabled(true);
        setMicEnabled(true);
        alert('🎥 Você está participando! Câmera e microfone ativados.');
      } catch (error) {
        console.error('❌ Erro ao participar:', error);
        alert('❌ Não foi possível acessar câmera/microfone. Verifique as permissões.');
      }
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    if (isMobile && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  if (!module) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>❌ Módulo não encontrado</h2>
      </div>
    );
  }

  const freeLessons = allLessons.filter(l => l.is_free_preview);
  const lockedLessons = allLessons.filter(l => !l.is_free_preview);
  const selectedVideoId = selectedLesson ? extractYouTubeId(selectedLesson.youtube_url) : null;
  const embedUrl = selectedVideoId ? `https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0&modestbranding=1` : null;

  const isDesktop = !isMobile;
  const totalLessons = allLessons.length;

  const mainModuleLessons: Lesson[] = [];
  const subModuleLessons: { [key: string]: Lesson[] } = {};

  allLessons.forEach((lesson) => {
    if (lesson.module_title) {
      if (!subModuleLessons[lesson.module_title]) {
        subModuleLessons[lesson.module_title] = [];
      }
      subModuleLessons[lesson.module_title].push(lesson);
    } else {
      mainModuleLessons.push(lesson);
    }
  });

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: isMobile ? '10px' : '20px',
      width: '100%',
      minHeight: '100vh',
    }}>
      {/* Cabeçalho */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: isMobile ? '10px' : '20px', 
        flexWrap: 'wrap', 
        gap: '10px' 
      }}>
        <button
          onClick={() => router.push('/student/dashboard')}
          style={{ 
            padding: isMobile ? '6px 16px' : '8px 20px', 
            background: '#666', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontSize: isMobile ? '0.85rem' : '1rem',
          }}
        >
          ← Voltar
        </button>
        <h1 style={{ 
          fontSize: isMobile ? '1.2rem' : '1.5rem', 
          color: '#1a1a2e', 
          margin: 0,
          flex: 1,
          textAlign: 'center',
        }}>
          {module.title}
        </h1>
        {!isPurchased && (
          <button
            onClick={() => router.push(`/student/purchase/${module.id}`)}
            style={{ 
              padding: isMobile ? '6px 16px' : '10px 24px', 
              background: '#4a90e2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: isMobile ? '0.8rem' : '1rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            🛒 R$ {parseFloat(String(module.price)).toFixed(2)}
          </button>
        )}
      </div>

      {/* LIVES DO MÓDULO */}
      {liveRooms.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: isMobile ? '12px' : '16px',
          background: isWatchingLive ? '#e8f5e9' : '#f3e5f5',
          borderRadius: '10px',
          border: isWatchingLive ? '2px solid #27ae60' : '2px solid #8e44ad',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>📺</span>
              <div>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', color: '#1a1a2e' }}>
                  {isWatchingLive ? '🟢 Ao Vivo' : 'Aulas ao Vivo'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                  {liveRooms.filter(r => r.status === 'active').length > 0 
                    ? `${liveRooms.filter(r => r.status === 'active').length} transmissão(ões) ativa(s)`
                    : `${liveRooms.filter(r => r.status === 'recorded').length} gravação(ões) disponível(eis)`
                  }
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isWatchingLive && liveRooms.filter(r => r.status === 'active').length > 0 && (
                <button
                  onClick={() => watchLive(liveRooms.find(r => r.status === 'active')!)}
                  style={{
                    padding: '8px 20px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  🟢 Assistir Ao Vivo
                </button>
              )}
              {isWatchingLive && (
                <>
                  <button
                    onClick={toggleParticipation}
                    style={{
                      padding: '8px 20px',
                      background: isParticipating ? '#e74c3c' : '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {isParticipating ? '🔇 Sair da Participação' : '🎤 Participar'}
                  </button>
                  {isParticipating && (
                    <>
                      <button
                        onClick={toggleCamera}
                        style={{
                          padding: '8px 16px',
                          background: cameraEnabled ? '#27ae60' : '#666',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {cameraEnabled ? '📷 Câmera Ligada' : '📷 Câmera Desligada'}
                      </button>
                      <button
                        onClick={toggleMic}
                        style={{
                          padding: '8px 16px',
                          background: micEnabled ? '#27ae60' : '#666',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {micEnabled ? '🎤 Microfone Ligado' : '🎤 Microfone Desligado'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={stopWatchingLive}
                    style={{
                      padding: '8px 20px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    ❌ Sair da Live
                  </button>
                </>
              )}
            </div>
          </div>

          {isWatchingLive && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isParticipating ? '2fr 1fr' : '1fr',
                gap: '12px',
              }}>
                <div style={{
                  background: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  position: 'relative',
                }}>
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '12px',
                    padding: '4px 12px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                  }}>
                    🟢 AO VIVO - {activeLive?.title}
                  </div>
                </div>

                {isParticipating && (
                  <div style={{
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    aspectRatio: '16/9',
                    position: 'relative',
                    border: '2px solid #27ae60',
                  }}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '12px',
                      padding: '2px 10px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      fontSize: '0.6rem',
                      borderRadius: '4px',
                    }}>
                      🎥 Você
                      {cameraEnabled ? ' 📷' : ''}
                      {micEnabled ? ' 🎤' : ' 🔇'}
                    </div>
                  </div>
                )}
              </div>

              {isParticipating && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#e8f5e9',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#2e7d32',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}>
                  <span>✅ Participando ativamente</span>
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: cameraEnabled ? '#27ae60' : '#999',
                    }} />
                    {cameraEnabled ? 'Câmera ligada' : 'Câmera desligada'}
                  </span>
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: micEnabled ? '#27ae60' : '#999',
                    }} />
                    {micEnabled ? 'Microfone ligado' : 'Microfone desligado'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isWatchingLive && liveRooms.filter(r => r.status === 'recorded').length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6a1b9a', marginBottom: '8px' }}>
                📹 Gravações disponíveis:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {liveRooms.filter(r => r.status === 'recorded').map((room) => (
                  <button
                    key={room.id}
                    onClick={() => room.recording_url && window.open(room.recording_url, '_blank')}
                    style={{
                      padding: '6px 14px',
                      background: '#e8d5f5',
                      color: '#4a148c',
                      border: '1px solid #8e44ad',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ▶️ {room.title}
                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                      ({new Date(room.created_at).toLocaleDateString()})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LAYOUT PRINCIPAL */}
      <div style={{ 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '20px',
      }}>
        {/* COLUNA DO VÍDEO */}
        <div style={{ 
          flex: isDesktop ? '2' : '1',
          width: isMobile ? '100%' : 'auto',
        }}>
          <div ref={videoRef}>
            {selectedLesson && embedUrl ? (
              <div style={{ 
                background: '#000',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '16/9',
              }}>
                <iframe
                  src={embedUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
                  title={selectedLesson.title}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  padding: isMobile ? '8px 12px' : '10px 20px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '5px',
                }}>
                  <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                    <span style={{ opacity: 0.7 }}>
                      Aula {allLessons.findIndex(l => l.id === selectedLesson.id) + 1} de {allLessons.length}
                    </span>
                    {selectedLesson.module_title && (
                      <span style={{ 
                        marginLeft: '8px',
                        fontSize: '0.6rem',
                        background: '#8e44ad',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        display: 'inline-block',
                        fontWeight: 'bold',
                      }}>
                        📁 {selectedLesson.module_title}
                      </span>
                    )}
                    <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                      {selectedLesson.title}
                    </span>
                    {selectedLesson.is_free_preview && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '0.6rem', 
                        background: '#27ae60', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        display: 'inline-block',
                      }}>
                        🔓 Grátis
                      </span>
                    )}
                  </div>
                  {!isPurchased && !selectedLesson.is_free_preview && (
                    <button
                      onClick={() => router.push(`/student/purchase/${module.id}`)}
                      style={{
                        padding: '4px 12px',
                        background: '#f39c12',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                      }}
                    >
                      🔓 Comprar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                background: '#1a1a2e',
                borderRadius: '10px',
                padding: '40px 20px',
                textAlign: 'center',
                color: 'white',
                aspectRatio: '16/9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '15px' }}>🎸</div>
                <h3 style={{ margin: '0', color: '#ccc', fontSize: isMobile ? '1rem' : '1.2rem' }}>
                  {allLessons.length > 0 ? 'Selecione uma aula' : 'Nenhuma aula disponível'}
                </h3>
                <p style={{ color: '#666', marginTop: '5px', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                  {allLessons.length > 0 ? 'Clique em uma aula na lista' : 'Este módulo ainda não tem aulas'}
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: isMobile ? '10px' : '15px',
              padding: isMobile ? '10px 12px' : '12px 15px',
              borderRadius: '8px',
              background: isPurchased ? '#e8f5e9' : '#fff3e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: isMobile ? '0.8rem' : '0.95rem',
            }}
          >
            <div>
              {isPurchased ? (
                <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
                  ✅ Você tem acesso a todas as aulas!
                </span>
              ) : (
                <span style={{ color: '#e65100', fontWeight: 'bold' }}>
                  🎯 {freeLessons.length} aulas gratuitas • {lockedLessons.length} bloqueadas
                </span>
              )}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: isMobile ? '0.7rem' : '0.85rem',
              color: '#666',
            }}>
              <span>
                📹 {allLessons.length} {allLessons.length === 1 ? 'aula' : 'aulas'}
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA DA LISTA DE AULAS */}
        <div style={{ 
          flex: isDesktop ? '1' : '1',
          width: isMobile ? '100%' : '380px',
          maxWidth: isMobile ? '100%' : '380px',
        }}>
          <div style={{ 
            background: 'white',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            maxHeight: isMobile ? '500px' : '700px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: isMobile ? '10px 15px' : '15px 20px',
              background: '#f8f9fa',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#1a1a2e', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                  📋 Aulas ({allLessons.length})
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#999' }}>
                {allLessons.filter(l => l.is_free_preview).length} grátis
              </div>
            </div>

            <div style={{
              overflowY: 'auto',
              flex: 1,
              padding: isMobile ? '6px' : '8px',
            }}>
              {mainModuleLessons.length > 0 && (
                <div>
                  <div style={{
                    padding: '8px 12px',
                    margin: '8px 0 4px 0',
                    background: '#4a90e2',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>
                      📘 {module.title}
                    </span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      color: 'rgba(255,255,255,0.8)',
                      marginLeft: 'auto',
                    }}>
                      {mainModuleLessons.length} aulas
                    </span>
                  </div>
                  {mainModuleLessons.map((lesson, index) => {
                    const canWatch = isPurchased || lesson.is_free_preview;
                    const isSelected = selectedLesson?.id === lesson.id;
                    const globalIndex = allLessons.findIndex(l => l.id === lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => canWatch && handleSelectLesson(lesson)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isMobile ? '8px 10px' : '10px 12px',
                          marginBottom: '4px',
                          marginLeft: '8px',
                          background: isSelected ? '#e3f2fd' : 'transparent',
                          borderRadius: '8px',
                          cursor: canWatch ? 'pointer' : 'default',
                          borderLeft: isSelected ? '4px solid #4a90e2' : (canWatch ? '4px solid #27ae60' : '4px solid #e74c3c'),
                          opacity: canWatch ? 1 : 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              background: isSelected ? '#4a90e2' : (canWatch ? '#27ae60' : '#ccc'),
                              color: 'white',
                              width: isMobile ? '22px' : '24px',
                              height: isMobile ? '22px' : '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: isMobile ? '0.6rem' : '0.65rem',
                              flexShrink: 0,
                            }}
                          >
                            {globalIndex + 1}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ 
                              fontWeight: isSelected ? 'bold' : 'normal', 
                              color: '#1a1a2e', 
                              fontSize: isMobile ? '0.8rem' : '0.85rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {lesson.title}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {lesson.is_free_preview && (
                                <span style={{ 
                                  fontSize: '0.5rem', 
                                  background: '#27ae60', 
                                  color: 'white', 
                                  padding: '1px 6px', 
                                  borderRadius: '10px',
                                  display: 'inline-block',
                                }}>
                                  🔓 Grátis
                                </span>
                              )}
                              {!isPurchased && !lesson.is_free_preview && (
                                <span style={{ 
                                  fontSize: '0.5rem', 
                                  background: '#e74c3c', 
                                  color: 'white', 
                                  padding: '1px 6px', 
                                  borderRadius: '10px',
                                  display: 'inline-block',
                                }}>
                                  🔒
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: '8px' }}>
                          {canWatch && lesson.youtube_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectLesson(lesson);
                              }}
                              style={{
                                padding: isMobile ? '2px 10px' : '3px 12px',
                                background: isSelected ? '#4a90e2' : '#ff0000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: isMobile ? '0.65rem' : '0.7rem',
                              }}
                            >
                              {isSelected ? '▶️' : '▶️'}
                            </button>
                          ) : (
                            !isPurchased &&
                            !lesson.is_free_preview && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/student/purchase/${module.id}`);
                                }}
                                style={{
                                  padding: isMobile ? '2px 8px' : '3px 10px',
                                  background: '#4a90e2',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: isMobile ? '0.6rem' : '0.65rem',
                                }}
                              >
                                🔓
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.keys(subModuleLessons).map((moduleTitle) => {
                const lessons = subModuleLessons[moduleTitle];

                return (
                  <div key={moduleTitle}>
                    <div style={{
                      padding: '8px 12px',
                      margin: '12px 0 4px 0',
                      background: '#8e44ad',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>
                        📁 {moduleTitle}
                      </span>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        color: 'rgba(255,255,255,0.8)',
                        marginLeft: 'auto',
                      }}>
                        {lessons.length} aulas
                      </span>
                    </div>
                    {lessons.map((lesson, index) => {
                      const canWatch = isPurchased || lesson.is_free_preview;
                      const isSelected = selectedLesson?.id === lesson.id;
                      const globalIndex = allLessons.findIndex(l => l.id === lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => canWatch && handleSelectLesson(lesson)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '8px 10px' : '10px 12px',
                            marginBottom: '4px',
                            marginLeft: '12px',
                            background: isSelected ? '#e3f2fd' : (canWatch ? '#faf5ff' : 'transparent'),
                            borderRadius: '8px',
                            cursor: canWatch ? 'pointer' : 'default',
                            borderLeft: isSelected ? '4px solid #4a90e2' : (canWatch ? '4px solid #8e44ad' : '4px solid #e74c3c'),
                            opacity: canWatch ? 1 : 0.5,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                background: isSelected ? '#4a90e2' : (canWatch ? '#8e44ad' : '#ccc'),
                                color: 'white',
                                width: isMobile ? '22px' : '24px',
                                height: isMobile ? '22px' : '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: isMobile ? '0.6rem' : '0.65rem',
                                flexShrink: 0,
                              }}
                            >
                              {globalIndex + 1}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ 
                                fontWeight: isSelected ? 'bold' : 'normal', 
                                color: '#1a1a2e', 
                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {lesson.title}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {lesson.is_free_preview && (
                                  <span style={{ 
                                    fontSize: '0.5rem', 
                                    background: '#27ae60', 
                                    color: 'white', 
                                    padding: '1px 6px', 
                                    borderRadius: '10px',
                                    display: 'inline-block',
                                  }}>
                                    🔓 Grátis
                                  </span>
                                )}
                                {!isPurchased && !lesson.is_free_preview && (
                                  <span style={{ 
                                    fontSize: '0.5rem', 
                                    background: '#e74c3c', 
                                    color: 'white', 
                                    padding: '1px 6px', 
                                    borderRadius: '10px',
                                    display: 'inline-block',
                                  }}>
                                    🔒
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0, marginLeft: '8px' }}>
                            {canWatch && lesson.youtube_url ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectLesson(lesson);
                                }}
                                style={{
                                  padding: isMobile ? '2px 10px' : '3px 12px',
                                  background: isSelected ? '#4a90e2' : '#ff0000',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: isMobile ? '0.65rem' : '0.7rem',
                                }}
                              >
                                {isSelected ? '▶️' : '▶️'}
                              </button>
                            ) : (
                              !isPurchased &&
                              !lesson.is_free_preview && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/student/purchase/${module.id}`);
                                  }}
                                  style={{
                                    padding: isMobile ? '2px 8px' : '3px 10px',
                                    background: '#4a90e2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: isMobile ? '0.6rem' : '0.65rem',
                                  }}
                                >
                                  🔓
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {allLessons.length === 0 && (
                <div style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: '#999',
                }}>
                  <p style={{ margin: 0 }}>📚 Nenhuma aula disponível</p>
                </div>
              )}
            </div>

            {!isPurchased && lockedLessons.length > 0 && (
              <div style={{
                padding: isMobile ? '10px' : '12px 15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textAlign: 'center',
                borderTop: '1px solid #eee',
              }}>
                <button
                  onClick={() => router.push(`/student/purchase/${module.id}`)}
                  style={{
                    padding: isMobile ? '6px 16px' : '6px 16px',
                    background: 'white',
                    color: '#4a90e2',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    fontWeight: 'bold',
                    width: '100%',
                  }}
                >
                  🛒 Desbloquear {lockedLessons.length} aulas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aulas gratuitas em destaque */}
      {!isPurchased && freeLessons.length > 0 && !isMobile && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#e8f5e9', 
          borderRadius: '8px',
          border: '1px solid #27ae60',
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#2e7d32' }}>
            🔓 Aulas gratuitas disponíveis:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {freeLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson)}
                style={{
                  padding: '6px 16px',
                  background: selectedLesson?.id === lesson.id ? '#27ae60' : 'white',
                  color: selectedLesson?.id === lesson.id ? 'white' : '#27ae60',
                  border: selectedLesson?.id === lesson.id ? 'none' : '1px solid #27ae60',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ▶️ {lesson.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isPurchased && lockedLessons.length > 0 && (
        <div style={{ 
          marginTop: isMobile ? '20px' : '30px', 
          padding: isMobile ? '15px' : '20px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '10px', 
          textAlign: 'center',
          color: 'white',
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '1rem' : '1.1rem' }}>
            🎯 Desbloqueie todas as {lockedLessons.length} aulas!
          </h3>
          <p style={{ margin: '0 0 12px 0', opacity: 0.9, fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
            Compre o curso completo e tenha acesso a todas as aulas
          </p>
          <button
            onClick={() => router.push(`/student/purchase/${module.id}`)}
            style={{
              padding: isMobile ? '10px 30px' : '12px 40px',
              background: 'white',
              color: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              fontWeight: 'bold',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🛒 Comprar Curso - R$ {parseFloat(String(module.price)).toFixed(2)}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}