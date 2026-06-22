'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  label: string;
  href: string;
  icon?: string;
}

export default function MobileMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!session) return null;

  const getMenuItems = (): MenuItem[] => {
    switch (session.user?.role) {
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin/dashboard', icon: '👑' },
          { label: 'Usuários', href: '/admin/users', icon: '👤' },
          { label: 'Módulos', href: '/admin/modules', icon: '📚' },
        ];
      case 'teacher':
        return [
          { label: 'Dashboard', href: '/teacher/dashboard', icon: '📊' },
          { label: 'Módulos', href: '/teacher/modules', icon: '📚' },
          { label: 'Aulas ao Vivo', href: '/teacher/live', icon: '🎥' },
        ];
      default:
        return [
          { label: 'Dashboard', href: '/student/dashboard', icon: '📊' },
          { label: 'Meus Cursos', href: '/student/courses', icon: '📚' },
          { label: 'Aulas ao Vivo', href: '/student/live', icon: '🎥' },
        ];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <>
      {/* Botão do Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 100,
          background: '#1a1a2e',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        className="mobile-menu-button"
      >
        ☰
      </button>

      {/* Overlay do Menu */}
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 98,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              background: 'white',
              zIndex: 99,
              boxShadow: '4px 0 30px rgba(0,0,0,0.1)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            {/* Cabeçalho do Menu */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #eee',
            }}>
              <div>
                <span style={{ fontSize: '1.2rem' }}>🎸</span>
                <span style={{ fontWeight: 'bold', marginLeft: '8px', color: '#1a1a2e' }}>
                  Contrabaixo
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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

            {/* Usuário */}
            <div style={{
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '10px',
              marginBottom: '20px',
            }}>
              <p style={{ fontWeight: 'bold', margin: 0, color: '#1a1a2e' }}>
                {session.user?.name}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '5px 0 0 0' }}>
                {session.user?.email}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#999', margin: '3px 0 0 0' }}>
                {session.user?.role === 'admin' ? '👑 Admin' :
                 session.user?.role === 'teacher' ? '👨‍🏫 Professor' : '👨‍🎓 Aluno'}
              </p>
            </div>

            {/* Itens do Menu */}
            <nav style={{ flex: 1 }}>
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: '#333',
                    textDecoration: 'none',
                    transition: 'background 0.2s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Botão Sair */}
            <button
              onClick={handleLogout}
              style={{
                padding: '12px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginTop: 'auto',
              }}
            >
              🚪 Sair
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @media (min-width: 768px) {
          .mobile-menu-button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}