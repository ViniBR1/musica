'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center', color: 'white', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '10px' }}>🎸</h1>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Curso de Contrabaixo</h1>
        <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '40px' }}>
          Aprenda contrabaixo com os melhores professores. Aulas em vídeo, ao vivo e muito mais!
        </p>

        {session ? (
          <Link
            href={
              session.user?.role === 'student'
                ? '/student/dashboard'
                : session.user?.role === 'teacher'
                ? '/teacher/dashboard'
                : '/admin/dashboard'
            }
          >
            <button
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Ir para o Dashboard
            </button>
          </Link>
        ) : (
          <Link href="/login">
            <button
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Começar Agora
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}