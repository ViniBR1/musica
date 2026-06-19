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
  teacher_name?: string;
  teacher_email?: string;
  module_title?: string;
  created_at: string;
}

export default function StudentLive() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const [roomCode, setRoomCode] = useState('');

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

  const watchRoom = async (room: LiveRoom) => {
    setErrorMessage('');
    setDebugInfo('');
    setIsConnecting(true);
    setDebugInfo('🔄 Iniciando conexão...');

    try {
      setSelectedRoom(room);

      // Gerar ID único para o aluno
      const studentPeerId = `student-${session?.user?.id}-${Date.now()}`;

      setDebugInfo(`📡 Conectando ao servidor...`);

      // Conectar ao PeerJS
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
        setDebugInfo(`✅ Conectado ao servidor (ID: ${id})`);
        setDebugInfo(`📞 Chamando professor: ${room.peer_id}`);

        try {
          // Chamar o professor - NÃO enviar stream do aluno
          const call = peer.call(room.peer_id, undefined as any);
          callRef.current = call;

          call.on('stream', (remoteStream) => {
            setDebugInfo('📹 Stream recebido!');
            console.log('📹 Stream recebido!');
            setIsConnecting(false);
            setIsWatching(true);
            
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
              videoRef.current.play().catch(() => console.log('Auto-play bloqueado'));
            }
          });

          call.on('close', () => {
            setDebugInfo('❌ Transmissão encerrada');
            stopWatching();
          });

          call.on('error', (err) => {
            console.error('❌ Erro na chamada:', err);
            setErrorMessage(`❌ ${err.message || 'Falha na conexão'}`);
            setDebugInfo(`❌ ${err.message}`);
            setIsConnecting(false);
          });

        } catch (callError) {
          console.error('❌ Erro ao fazer call:', callError);
          setErrorMessage(`❌ ${(callError as Error).message}`);
          setDebugInfo(`❌ Erro no call: ${(callError as Error).message}`);
          setIsConnecting(false);
        }
      });

      peer.on('error', (err) => {
        console.error('❌ Peer erro:', err);
        setErrorMessage(`❌ ${err.message || 'Tente novamente'}`);
        setDebugInfo(`❌ ${err.message}`);
        setIsConnecting(false);
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      setErrorMessage((error as Error).message || '❌ Erro ao conectar');
      setDebugInfo(`❌ ${(error as Error).message}`);
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
    setDebugInfo('');
    fetchRooms();
  };

  const joinByCode = async () => {
    if (!roomCode.trim()) {
      alert('Digite o código da sala');
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const room = rooms.find((r) => r.room_code === code);

    if (!room) {
      alert('❌ Sala não encontrada. Verifique o código.');
      return;
    }

    if (room.status !== 'active') {
      alert('❌ Esta transmissão já foi encerrada.');
      return;
    }

    watchRoom(room);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  const activeRooms = rooms.filter((r) => r.status === 'active');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', color: '#1a1a2e' }}>🎥 Assistir Aulas ao Vivo</h1>
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

      {debugInfo && (
        <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', margin: '10px 0', fontSize: '0.9rem', color: '#0d47a1' }}>
          <strong>🔍 Debug:</strong> {debugInfo}
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', margin: '20px 0', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>🔑 Entrar com código</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Ex: A7B3C9D2"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '1.1rem', minWidth: '200px' }}
          />
          <button onClick={joinByCode} style={{ padding: '10px 24px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            🔗 Entrar
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ background: '#fde8e8', border: '2px solid #e74c3c', padding: '15px', borderRadius: '8px', margin: '10px 0', color: '#c0392b' }}>
          <strong>❌ {errorMessage}</strong>
          <button onClick={() => setErrorMessage('')} style={{ marginLeft: '10px', padding: '4px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {isConnecting && (
        <div style={{ background: '#fff3cd', border: '2px solid #f39c12', padding: '15px', borderRadius: '8px', margin: '10px 0', textAlign: 'center' }}>
          <strong>⏳ Conectando à transmissão...</strong>
        </div>
      )}

      {isWatching && selectedRoom && (
        <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9', position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1a1a2e' }}
          />
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

      <div style={{ marginTop: '30px' }}>
        <h2>📡 Salas Ativas ({activeRooms.length})</h2>

        {activeRooms.length === 0 ? (
          <div style={{ background: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>🎥 Nenhuma transmissão ao vivo no momento</p>
            <p style={{ color: '#999' }}>Aguarde seu professor iniciar a transmissão</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {activeRooms.map((room) => (
              <div key={room.id} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 12px', background: '#27ae60', color: 'white', borderRadius: '15px', fontSize: '0.8rem' }}>🟢 AO VIVO</span>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>👨‍🏫 {room.teacher_name}</span>
                </div>

                <h3 style={{ margin: '10px 0 5px 0' }}>{room.title}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>{room.description}</p>
                {room.module_title && <p style={{ color: '#4a90e2', fontSize: '0.9rem' }}>📚 {room.module_title}</p>}
                <p style={{ color: '#999', fontSize: '0.8rem' }}>Código: <strong>{room.room_code}</strong></p>
                <p style={{ color: '#999', fontSize: '0.7rem' }}>Peer ID: {room.peer_id}</p>
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
    </div>
  );
}