'use client';

import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

    if (installed) {
      setShowInstall(false);
      return;
    }

    console.log('📲 Inicializando PWA...');

    // Evento de instalação (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
      console.log('✅ PWA pronto para instalação!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: se o evento não disparar, mostrar o botão
    const timer = setTimeout(() => {
      if (!deferredPrompt && !installed) {
        console.log('⚠️ Evento beforeinstallprompt não disparou. Mostrando botão.');
        setShowInstall(true);
      }
    }, 3000);

    // Para iOS e navegadores sem suporte
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if ((isIOS || isSafari) && !installed) {
      setShowInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        // Mostrar o prompt de instalação
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        
        if (result.outcome === 'accepted') {
          setIsInstalled(true);
          setShowInstall(false);
          alert('🎉 App instalado com sucesso!');
        } else {
          alert('❌ Instalação cancelada');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Erro na instalação:', error);
        showManualInstructions();
      }
    } else {
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      alert(
        '📱 Para instalar no iPhone/iPad:\n\n' +
        '1. Toque no ícone de compartilhar (⬆️)\n' +
        '2. Role para baixo e toque em "Adicionar à Tela de Início"\n' +
        '3. Toque em "Adicionar"'
      );
    } else {
      alert(
        '📱 Para instalar o app:\n\n' +
        '1. Clique nos 3 pontinhos (⋮) no canto superior\n' +
        '2. Selecione "Adicionar à tela inicial"\n' +
        '3. Clique em "Adicionar"'
      );
    }
  };

  // Se já estiver instalado, não mostra nada
  if (isInstalled) {
    return null;
  }

  // Se não deve mostrar, não mostra
  if (!showInstall) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #4a90e2 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '50px',
        border: 'none',
        boxShadow: '0 8px 30px rgba(74, 144, 226, 0.5)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        fontSize: '0.95rem',
        fontWeight: 'bold',
        transition: 'transform 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(74, 144, 226, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(74, 144, 226, 0.5)';
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>📲</span>
      Instalar App
    </button>
  );
}