'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar se é dispositivo móvel
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Evento de instalação (Android/Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('✅ App é instalável!');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Evento de instalação bem-sucedida
    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      alert('🎉 App instalado com sucesso!');
    };

    window.addEventListener('appinstalled', installedHandler);

    // Para mobile, sempre mostrar o botão (fallback)
    if (isMobileDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          alert('🎉 App instalado com sucesso!');
        } else {
          alert('❌ Instalação cancelada');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Erro na instalação:', error);
        showManualInstructions();
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    setShowAndroidInstructions(true);
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  const closeAndroidInstructions = () => {
    setShowAndroidInstructions(false);
  };

  // Se já estiver instalado, mostra um badge
  if (isInstalled) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#e8f5e9',
        borderRadius: '50px',
        fontSize: '0.85rem',
        color: '#2e7d32',
        border: '1px solid #a5d6a7',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <span>✅</span>
        App instalado
      </div>
    );
  }

  // Para mobile, sempre mostrar (mesmo se não for instalável)
  if (!isInstallable && !isMobile) {
    return null;
  }

  return (
    <>
      {/* Botão Flutuante */}
      {isVisible && (
        <button
          onClick={handleInstall}
          style={{
            padding: isInstallable ? '16px 28px' : '14px 24px',
            background: isInstallable 
              ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
              : 'linear-gradient(135deg, #4a90e2 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '1rem',
            fontWeight: 'bold',
            boxShadow: isInstallable
              ? '0 8px 30px rgba(39, 174, 96, 0.5)'
              : '0 8px 30px rgba(74, 144, 226, 0.5)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            animation: 'pulse 2s infinite',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>📲</span>
          <span>{isInstallable ? 'Instalar Agora!' : 'Instalar App'}</span>
          {isInstallable && (
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 12px',
              borderRadius: '20px',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Disponível
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </button>
      )}

      {/* MODAL iOS */}
      {showIOSInstructions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: 'white',
            padding: '35px',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <button
              onClick={closeIOSInstructions}
              style={{
                position: 'absolute',
                top: '12px',
                right: '18px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '3rem' }}>📲</span>
              <h2 style={{ margin: '10px 0 5px 0', color: '#1a1a2e' }}>
                Instalar no iPhone
              </h2>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Siga os passos abaixo para instalar o app
              </p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px',
                marginBottom: '10px',
                background: '#f8f9fa',
                borderRadius: '10px',
              }}>
                <span style={{
                  background: '#4a90e2',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>1</span>
                <span style={{ color: '#333' }}>
                  Toque no ícone <strong>⬆️ Compartilhar</strong>
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px',
                marginBottom: '10px',
                background: '#f8f9fa',
                borderRadius: '10px',
              }}>
                <span style={{
                  background: '#4a90e2',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>2</span>
                <span style={{ color: '#333' }}>
                  Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '10px',
              }}>
                <span style={{
                  background: '#27ae60',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>3</span>
                <span style={{ color: '#333' }}>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito
                </span>
              </div>
            </div>

            <button
              onClick={closeIOSInstructions}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #4a90e2 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              Entendi! Vou instalar 👍
            </button>
          </div>
        </div>
      )}

      {/* MODAL Android (Fallback) */}
      {showAndroidInstructions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: 'white',
            padding: '35px',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <button
              onClick={closeAndroidInstructions}
              style={{
                position: 'absolute',
                top: '12px',
                right: '18px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '3rem' }}>📲</span>
              <h2 style={{ margin: '10px 0 5px 0', color: '#1a1a2e' }}>
                Instalar App
              </h2>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                O app pode ser instalado de duas formas
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '15px',
                marginBottom: '12px',
                background: '#f8f9fa',
                borderRadius: '10px',
                borderLeft: '4px solid #4a90e2',
              }}>
                <p style={{ margin: '0', fontWeight: 'bold', color: '#1a1a2e' }}>
                  Opção 1:
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#555' }}>
                  Clique no botão <strong>"Instalar Agora!"</strong> na tela
                </p>
              </div>

              <div style={{
                padding: '15px',
                background: '#fff3e0',
                borderRadius: '10px',
                borderLeft: '4px solid #f39c12',
              }}>
                <p style={{ margin: '0', fontWeight: 'bold', color: '#1a1a2e' }}>
                  Opção 2 (Manual):
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#555' }}>
                  1. Abra o menu do navegador
                </p>
                <p style={{ margin: '0', color: '#555' }}>
                  2. Toque em <strong>"Adicionar à tela inicial"</strong>
                </p>
              </div>
            </div>

            <button
              onClick={closeAndroidInstructions}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              Entendi! 👍
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }
      `}</style>
    </>
  );
}