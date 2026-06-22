'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Peer from 'peerjs';

interface LiveRoom {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  module_id: string | null;
  room_code: string;
  peer_id: string;
  status: string;
  is_aluno: boolean;
  created_by: string;
  recording_url: string | null;
  recorded_at: string | null;
  teacher_name?: string;
  teacher_email?: string;
  module_title?: string;
  created_at: string;
}

export default function StudentLive() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [history, setHistory] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRecorded, setShowRecorded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'student') {
      router.push('/login');
      return;
    }

    fetchRooms();
    fetchHistory();

    return () => {
      if (callRef.current) {
        callRef.current.close();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [session, status]);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/live-rooms');
      const data = await response.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/live-rooms/history?userId=${session?.user?.id}`);
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistory([]);
    }
  };

  const watchRoom = async (room: LiveRoom) => {
    setErrorMessage('');
    setIsConnecting(true);

    try {
      setSelectedRoom(room);

      // Se for uma gravação, abrir em nova aba
      if (room.status === 'recorded' && room.recording_url) {
        window.open(room.recording_url, '_blank');
        setIsConnecting(false);
        // Registrar que assistiu
        await fetch(`/api/live-rooms/${room.id}/watch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session?.user?.id }),
        });
        return;
      }

      // Live ao vivo - usar PeerJS
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
        const call = peer.call(room.peer_id, undefined as any);
        callRef.current = call;

        call.on('stream', (remoteStream) => {
          setIsConnecting(false);
          setIsWatching(true);

          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().catch(() => {});
          }

          // Registrar que o aluno assistiu
          fetch(`/api/live-rooms/${room.id}/watch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session?.user?.id }),
          }).catch(() => {});
        });

        call.on('close', () => {
          stopWatching();
        });

        call.on('error', (err) => {
          setErrorMessage(`❌ ${err.message || 'Falha na conexão'}`);
          setIsConnecting(false);
        });
      });

      peer.on('error', (err) => {
        setErrorMessage(`❌ ${err.message || 'Tente novamente'}`);
        setIsConnecting(false);
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      setErrorMessage((error as Error).message || '❌ Erro ao conectar');
      setIsConnecting(false);
      setSelectedRoom(null);
    }
  };

  const stopWatching = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWatching(false);
    setSelectedRoom(null);
    setIsConnecting(false);
    fetchRooms();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  const activeRooms = rooms.filter((r) => r.status === 'active');
  const recordedRooms = history.filter((r) => r.status === 'recorded');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '2rem', color: '#1a1a2e' }}>🎥 Aulas ao Vivo</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            📜 Histórico
          </button>
          <button
            onClick={async () => {
              await signOut({ redirect: false });
              router.push('/login');
            }}
            style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Assistindo ao vivo */}
      {isWatching && selectedRoom && (
        <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9', position: 'relative' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: '8px', color: 'white' }}>
              🟢 AO VIVO - {selectedRoom.title}
            </div>
            <button onClick={stopWatching} style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              ❌ Sair
            </button>
          </div>
        </div>
      )}

      {/* Salas Ativas */}
      <div style={{ marginTop: '30px' }}>
        <h2>📡 Transmissões ao Vivo ({activeRooms.length})</h2>

        {activeRooms.length === 0 ? (
          <div style={{ background: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>🎥 Nenhuma transmissão ao vivo no momento</p>
            <p style={{ color: '#999' }}>Aguarde seu professor iniciar uma aula ao vivo</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {activeRooms.map((room) => (
              <div key={room.id} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 12px', background: '#27ae60', color: 'white', borderRadius: '15px', fontSize: '0.8rem' }}>
                    🟢 AO VIVO
                  </span>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>👨‍🏫 {room.teacher_name}</span>
                </div>

                <h3 style={{ margin: '10px 0 5px 0' }}>{room.title}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{room.description}</p>
                {room.module_title && <p style={{ color: '#4a90e2', fontSize: '0.9rem' }}>📚 {room.module_title}</p>}
                <p style={{ color: '#999', fontSize: '0.8rem' }}>Código: <strong>{room.room_code}</strong></p>
                <button
                  onClick={() => watchRoom(room)}
                  disabled={isConnecting}
                  style={{ width: '100%', marginTop: '10px', padding: '10px', background: isConnecting ? '#ccc' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: isConnecting ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
                >
                  {isConnecting ? '⏳ Conectando...' : '▶️ Assistir'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      {showHistory && (
        <div style={{ marginTop: '30px' }}>
          <h2>📜 Histórico de Lives</h2>

          {history.length === 0 ? (
            <div style={{ background: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ color: '#666' }}>Você ainda não participou de nenhuma live</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {history.map((room) => (
                <div key={room.id} style={{
                  background: 'white',
                  padding: '15px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{room.title}</h3>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                      👨‍🏫 {room.teacher_name} • {room.module_title ? `📚 ${room.module_title}` : ''}
                    </p>
                    <p style={{ margin: 0, color: '#999', fontSize: '0.8rem' }}>
                      {room.status === 'recorded' ? '🎬 Gravada' : '🟢 Ao Vivo'} • {new Date(room.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {room.status === 'recorded' && room.recording_url ? (
                      <button
                        onClick={() => watchRoom(room)}
                        style={{ padding: '8px 16px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                      >
                        ▶️ Assistir Gravação
                      </button>
                    ) : (
                      <span style={{ padding: '8px 16px', background: '#e8f5e9', color: '#27ae60', borderRadius: '5px' }}>
                        ✅ Assistiu
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}