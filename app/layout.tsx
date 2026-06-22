import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import InstallButton from '@/components/InstallButton';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'Curso de Contrabaixo',
  description: 'Aprenda contrabaixo com os melhores professores - Aulas em vídeo, ao vivo e muito mais!',
  manifest: '/manifest.json',
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
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#f0f2f5',
        WebkitTapHighlightColor: 'transparent',
        overscrollBehavior: 'none',
        minHeight: '100vh',
      }}>
        <Providers>
          {children}
          <InstallButton />
        </Providers>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) {
                    console.log('✅ Service Worker registrado!', reg);
                  })
                  .catch(function(err) {
                    console.log('❌ Erro ao registrar SW:', err);
                  });
              }

              if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('📱 Executando como PWA');
              }

              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                console.log('📲 App pode ser instalado');
              });

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