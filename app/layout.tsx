import type { Metadata } from 'next';
import Providers from './providers';
import InstallButton from '@/components/InstallButton';

export const metadata: Metadata = {
  title: 'Curso de Contrabaixo',
  description: 'Aprenda contrabaixo com os melhores professores - Aulas em vídeo, ao vivo e muito mais!',
  manifest: '/manifest.json',
  themeColor: '#4a90e2',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Contrabaixo',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Contrabaixo" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4a90e2" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f0f2f5' }}>
        <Providers>
          {children}
          {/* Botão de instalação PWA - Flutuante */}
          <div style={{ 
            position: 'fixed', 
            bottom: '30px', 
            right: '30px', 
            zIndex: 9999,
            '@media (max-width: 480px)': {
              bottom: '15px',
              right: '15px',
            }
          }}>
            <InstallButton />
          </div>
        </Providers>

        {/* Script para registro do Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Registrar Service Worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('✅ Service Worker registrado:', registration);
                    })
                    .catch(function(error) {
                      console.log('❌ Erro ao registrar Service Worker:', error);
                    });
                });
              }

              // Detectar se está executando como PWA
              if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('📱 Executando como PWA');
              }

              // Detectar instalação
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                console.log('📲 App pode ser instalado');
              });

              // Detectar instalação bem-sucedida
              window.addEventListener('appinstalled', () => {
                console.log('🎉 App instalado com sucesso!');
              });
            `
          }}
        />
      </body>
    </html>
  );
}