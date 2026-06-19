'use client';

import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) {
      setShowButton(false);
      return;
    }

    // Evento de instalação (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
      console.log('✅ PWA pronto para instalação!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verificar se o banner foi fechado anteriormente
    const bannerFechado = localStorage.getItem('pwa-banner-fechado');
    if (bannerFechado === 'true') {
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge/Android - mostra o prompt nativo
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('✅ App instalado!');
        setShowButton(false);
        setShowBanner(false);
        alert('🎉 App instalado com sucesso!');
      } else {
        alert('❌ Instalação cancelada');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback para iOS ou outros navegadores
      alert('📱 Para instalar: Clique nos 3 pontinhos (⋮) → "Adicionar à tela inicial"');
      setShowBanner(true);
    }
  };

  const fecharBanner = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-fechado', 'true');
  };

  // BANNER INFERIOR (estilo preto moderno)
  if (showBanner && showButton) {
    return (
      <div 
        className="pwa-banner"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1a1a1a',
          color: 'white',
          padding: '16px 20px',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderTop: '1px solid #333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.5rem' }}>📲</span>
          </div>
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: 0 }}>
              🎸 Curso de Contrabaixo
            </p>
            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
              Instale o app na tela inicial do seu celular
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleInstall}
            style={{
              background: 'white',
              color: '#1a1a1a',
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              transition: 'background 0.3s',
              flex: 1,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <span>📲</span>
            Instalar
          </button>
          <button
            onClick={fecharBanner}
            style={{
              background: 'transparent',
              color: '#888',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              fontSize: '1.2rem',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // BOTÃO FLUTUANTE (quando o banner está fechado)
  if (showButton && !showBanner) {
    return (
      <button
        onClick={handleInstall}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          background: '#1a1a1a',
          color: 'white',
          padding: '14px 24px',
          borderRadius: '50px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          border: '1px solid #333',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 40,
          fontSize: '0.95rem',
          fontWeight: 600,
          transition: 'transform 0.3s, box-shadow 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>📲</span>
        Instalar App
      </button>
    );
  }

  return null;
}