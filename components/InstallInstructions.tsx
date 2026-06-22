'use client';

import { useState, useEffect } from 'react';

export default function InstallInstructions() {
  const [show, setShow] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

    if (!installed) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (isInstalled || !show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={() => setShow(false)}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          padding: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
            📱 Instalar App
          </h2>
          <button
            onClick={() => setShow(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#999',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>
            Instale o app na tela inicial do seu celular para acesso rápido!
          </p>

          <div
            style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: '#1a1a2e',
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                1
              </span>
              <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
                Abra o Chrome e acesse o site
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: '#1a1a2e',
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                2
              </span>
              <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
                Clique nos 3 pontinhos (⋮) no canto superior
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: '#1a1a2e',
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                3
              </span>
              <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
                Selecione <strong>"Adicionar à tela inicial"</strong>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: '#1a1a2e',
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                4
              </span>
              <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
                Clique em <strong>"Adicionar"</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShow(false)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1a1a2e',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
            }}
          >
            Entendi, obrigado!
          </button>
        </div>
      </div>
    </div>
  );
}