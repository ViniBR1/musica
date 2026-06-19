'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou senha inválidos');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/session');
      const session = await response.json();

      if (session?.user?.role) {
        switch (session.user.role) {
          case 'admin': router.push('/admin/dashboard'); break;
          case 'teacher': router.push('/teacher/dashboard'); break;
          case 'student': router.push('/student/dashboard'); break;
          default: router.push('/');
        }
      }
    } catch (error) {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/student/dashboard' });
    } catch (error) {
      setError('Erro ao fazer login com Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Elementos decorativos */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(74,144,226,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(118,75,162,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          padding: '48px 40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #4a90e2 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 30px rgba(74, 144, 226, 0.3)',
          }}>
            <span style={{ fontSize: '2.5rem' }}>🎸</span>
          </div>
          <h1 style={{ color: '#1a1a2e', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Curso de Contrabaixo
          </h1>
          <p style={{ color: '#666', marginTop: '8px', fontSize: '0.95rem' }}>
            Faça login para acessar sua conta
          </p>
        </div>

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          style={{
            width: '100%',
            padding: '14px',
            background: 'white',
            color: '#333',
            border: '2px solid #e8ecf1',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease',
            opacity: isGoogleLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isGoogleLoading) {
              e.currentTarget.style.borderColor = '#4a90e2';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(74,144,226,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGoogleLoading) {
              e.currentTarget.style.borderColor = '#e8ecf1';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {isGoogleLoading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          margin: '20px 0',
        }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e8ecf1' }} />
          <span style={{ fontSize: '0.85rem', color: '#999', fontWeight: 500 }}>ou</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e8ecf1' }} />
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              color: '#333',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-modern"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              color: '#333',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-modern"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fde8e8',
                color: '#c0392b',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: '16px',
                textAlign: 'center',
                fontSize: '0.9rem',
                border: '1px solid #f5c6cb',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e8ecf1',
          }}
        >
          <p style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>
            🧪 Credenciais de teste
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem', color: '#555' }}>
            <div><span style={{ fontWeight: 600 }}>👑 Admin:</span> admin@admin.com</div>
            <div><span style={{ fontWeight: 600 }}>🔑 Senha:</span> admin123</div>
            <div><span style={{ fontWeight: 600 }}>👨‍🏫 Professor:</span> teacher@teacher.com</div>
            <div><span style={{ fontWeight: 600 }}>🔑 Senha:</span> teacher123</div>
            <div><span style={{ fontWeight: 600 }}>👨‍🎓 Aluno:</span> student@student.com</div>
            <div><span style={{ fontWeight: 600 }}>🔑 Senha:</span> student123</div>
          </div>
        </div>
      </div>
    </div>
  );
}