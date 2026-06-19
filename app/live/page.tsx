'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Peer from 'peerjs';

export default function LivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [broadcastMode, setBroadcastMode] = useState('screen');
  const [roomCode, setRoomCode] = useState('');
  const [peerId, setPeerId] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'teacher') {
      router.push('/login');
      return;
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [session, status]);

  const startBroadcast = async () => {
    setErrorMessage('');
    setIsConnecting(true);

    try {
      let stream: MediaStream;

      try {
        if (broadcastMode === 'screen') {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
            },
            audio: true,
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        }
      } catch (mediaError) {
        if (broadcastMode === 'camera') {
          setErrorMessage('⚠️ Câmera não disponível. Usando compartilhamento de tela.');
          setBroadcastMode('screen');
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
            },
            audio: true,
          });
        } else {
          throw new Error((mediaError as Error).message);
        }
      }

      streamRef.current = stream;

      // Gerar ID único para o Peer
      const teacherPeerId = `teacher-${session?.user?.id}-${Date.now()}`;
      setPeerId(teacherPeerId);

      // Gerar código da sala
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(roomCode);

      // Criar Peer com ID
      const peer = new Peer(teacherPeerId, {
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
        console.log('✅ Peer conectado:', id);
        setIsConnecting(false);
        setIsBroadcasting(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }

        alert(`✅ Transmissão iniciada!\n\n📋 Código: ${roomCode}\n\nCompartilhe o código com seus alunos.`);
      });

      peer.on('call', (call) => {
        console.log('📹 Aluno chamando!');
        if (streamRef.current) {
          call.answer(streamRef.current);
        }
      });

      peer.on('error', (err) => {
        console.error('❌ Erro:', err);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      setIsBroadcasting(false);
      setRoomCode('');
      setPeerId('');

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      alert('✅ Transmissão encerrada!');
    } catch (error) {
      console.error('❌ Erro:', error);
      alert('❌ Erro ao encerrar');
    }
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      alert(`✅ Código copiado: ${roomCode}`);
    }
  };

  if (status === 'loading') {
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
              🟢 Transmitindo | Código: <strong>{roomCode}</strong>
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

      {isBroadcasting ? (
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '10px', margin: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ color: '#27ae60', margin: 0 }}>🟢 AO VIVO</h2>
              <p style={{ margin: '5px 0' }}>
                <strong>Código da Sala:</strong> {roomCode}
                <button
                  onClick={copyRoomCode}
                  style={{ marginLeft: '10px', padding: '4px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                  📋 Copiar
                </button>
              </p>
              <p style={{ margin: '5px 0', fontSize: '0.8rem', color: '#666' }}>
                Peer ID: {peerId}
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
          onClick={startBroadcast}
          disabled={isConnecting}
          style={{ margin: '20px 0', padding: '16px 32px', background: isConnecting ? '#ccc' : '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: isConnecting ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}
        >
          {isConnecting ? '🔄 Conectando...' : '🟢 Iniciar Transmissão'}
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
    </div>
  );
}