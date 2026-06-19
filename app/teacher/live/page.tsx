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

interface Module {
  id: string;
  title: string;
  description: string;
  price: number;
  teacher_id: string;
  is_free: boolean;
  free_lesson_url: string | null;
  lessons: any[];
  lessons_count: number;
  created_at: string;
}

export default function TeacherLive() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState('screen');
  const [viewers, setViewers] = useState(0);
  const [peerReady, setPeerReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [newRoom, setNewRoom] = useState({
    title: '',
    description: '',
    module_id: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'teacher') {
      router.push('/login');
      return;
    }

    fetchData();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [session, status]);

  const fetchData = async () => {
    try {
      const roomsRes = await fetch(`/api/live-rooms?teacherId=${session?.user?.id}`);
      const roomsData = await roomsRes.json();
      setRooms(roomsData);

      const active = roomsData.find((r: LiveRoom) => r.status === 'active');
      if (active) {
        setActiveRoom(active);
        setIsBroadcasting(true);
      }

      const modulesRes = await fetch(`/api/modules?teacherId=${session?.user?.id}`);
      const modulesData = await modulesRes.json();
      setModules(modulesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBroadcast = async () => {
    setErrorMessage('');
    setIsConnecting(true);

    try {
      // 1. Capturar stream
      let stream: MediaStream;

      try {
        if (broadcastMode === 'screen') {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor', cursor: 'always' },
            audio: true,
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        }
      } catch (mediaError) {
        if (broadcastMode === 'camera') {
          setErrorMessage('⚠️ Câmera não disponível. Usando compartilhamento de tela.');
          setBroadcastMode('screen');
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor', cursor: 'always' },
            audio: true,
          });
        } else {
          throw new Error((mediaError as Error).message);
        }
      }

      streamRef.current = stream;
      setPeerReady(false);

      // 2. Criar sala no banco
      const response = await fetch('/api/live-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });

      const roomData = await response.json();

      if (!response.ok) {
        throw new Error(roomData.error || 'Erro ao criar sala');
      }

      // 3. Conectar PeerJS
      const peer = new Peer(roomData.peer_id, {
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
        console.log('✅ PeerJS conectado! ID:', id);
        setPeerReady(true);
        setIsConnecting(false);
        setIsBroadcasting(true);
        setActiveRoom(roomData);
        setShowModal(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }

        alert(`✅ Transmissão iniciada!\n\n📋 Código: ${roomData.room_code}`);
      });

      peer.on('call', (call) => {
        console.log('📹 Aluno chamando!');
        setViewers((prev) => prev + 1);
        
        if (streamRef.current) {
          call.answer(streamRef.current);
        } else {
          console.error('❌ Stream não disponível');
        }
      });

      peer.on('error', (err) => {
        console.error('❌ Peer erro:', err);
        setErrorMessage(`❌ ${err.message}`);
        setIsConnecting(false);
      });

    } catch (error) {
      console.error('❌ Erro:', error);
      setErrorMessage((error as Error).message);
      setIsConnecting(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    }
  };

  const stopBroadcast = async () => {
    if (!confirm('Encerrar transmissão?')) return;

    try {
      await fetch(`/api/live-rooms?roomId=${activeRoom?.id}`, {
        method: 'DELETE',
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      setIsBroadcasting(false);
      setActiveRoom(null);
      setViewers(0);
      setPeerReady(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      fetchData();
      alert('✅ Transmissão encerrada!');
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('❌ Erro ao encerrar');
    }
  };

  const copyRoomCode = () => {
    if (activeRoom?.room_code) {
      navigator.clipboard.writeText(activeRoom.room_code);
      alert(`✅ Código copiado: ${activeRoom.room_code}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#1a1a2e' }}>🎥 Transmissão ao Vivo</h1>
          {isBroadcasting && (
            <p style={{ color: '#27ae60', fontSize: '0.9rem' }}>
              🟢 Status: {peerReady ? 'Conectado' : 'Conectando...'} | 👀 {viewers} espectadores
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push('/teacher/dashboard')}
            style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            ← Voltar
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

      {isBroadcasting && activeRoom ? (
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '10px', margin: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ color: '#27ae60', margin: 0 }}>🟢 AO VIVO</h2>
              <p style={{ margin: '5px 0' }}><strong>{activeRoom.title}</strong></p>
              <p style={{ margin: '0', color: '#666' }}>
                Código: <strong>{activeRoom.room_code}</strong>
                <button
                  onClick={copyRoomCode}
                  style={{ marginLeft: '10px', padding: '4px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  📋 Copiar
                </button>
              </p>
            </div>
            <button
              onClick={stopBroadcast}
              style={{ padding: '12px 24px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ⏹️ Encerrar
            </button>
          </div>

          <div style={{ marginTop: '20px', background: '#000', borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1a1a2e' }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          style={{ margin: '20px 0', padding: '16px 32px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          🟢 Iniciar Transmissão
        </button>
      )}

      {errorMessage && (
        <div style={{ background: '#fde8e8', border: '2px solid #e74c3c', padding: '15px', borderRadius: '8px', margin: '10px 0', color: '#c0392b' }}>
          <strong>{errorMessage}</strong>
          <button onClick={() => setErrorMessage('')} style={{ marginLeft: '10px', padding: '4px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {isConnecting && (
        <div style={{ background: '#fff3cd', border: '2px solid #f39c12', padding: '15px', borderRadius: '8px', margin: '10px 0', textAlign: 'center' }}>
          <strong>⏳ Conectando ao servidor...</strong>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', maxWidth: '550px', width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>📡 Iniciar Transmissão</h2>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Título *</label>
              <input
                type="text"
                required
                value={newRoom.title}
                onChange={(e) => setNewRoom({ ...newRoom, title: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
                placeholder="Ex: Aula sobre técnicas de baixo"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Descrição</label>
              <textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', minHeight: '80px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Módulo</label>
              <select
                value={newRoom.module_id}
                onChange={(e) => setNewRoom({ ...newRoom, module_id: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              >
                <option value="">Nenhum módulo</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>Modo de Transmissão</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" onClick={() => setBroadcastMode('camera')} style={{ padding: '15px', background: broadcastMode === 'camera' ? '#4a90e2' : '#f5f5f5', color: broadcastMode === 'camera' ? 'white' : '#333', border: broadcastMode === 'camera' ? '2px solid #4a90e2' : '2px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                  📷 Câmera
                </button>
                <button type="button" onClick={() => setBroadcastMode('screen')} style={{ padding: '15px', background: broadcastMode === 'screen' ? '#4a90e2' : '#f5f5f5', color: broadcastMode === 'screen' ? 'white' : '#333', border: broadcastMode === 'screen' ? '2px solid #4a90e2' : '2px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                  📺 Compartilhar Tela
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={startBroadcast} disabled={isConnecting} style={{ flex: 1, padding: '12px', background: isConnecting ? '#ccc' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: isConnecting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isConnecting ? '🔄 Conectando...' : '🟢 Iniciar'}
              </button>
              <button onClick={() => { setShowModal(false); setNewRoom({ title: '', description: '', module_id: '' }); }} style={{ padding: '12px 24px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}