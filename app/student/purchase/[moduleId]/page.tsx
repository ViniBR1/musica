'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Module } from '@/types';

export default function PurchasePage({ params }: { params: { moduleId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchModule();
  }, [params.moduleId, status]);

  const fetchModule = async () => {
    try {
      console.log('📡 Buscando módulo para compra:', params.moduleId);
      
      const response = await fetch(`/api/modules/${params.moduleId}`);
      const data = await response.json();
      
      console.log('📦 Dados do módulo:', data);
      
      if (response.ok) {
        setModule(data);
      } else {
        setError(data.error || 'Módulo não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar módulo:', error);
      setError('Erro ao carregar módulo');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      console.log('🛒 Processando compra do módulo:', params.moduleId);
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: params.moduleId,
          studentId: session?.user?.id,
        }),
      });

      const data = await response.json();
      console.log('📦 Resposta da compra:', data);

      if (response.ok) {
        if (data.alreadyPurchased) {
          alert('ℹ️ Você já possui este curso!');
        } else {
          alert('✅ Compra realizada com sucesso!');
        }
        router.push('/student/dashboard');
      } else {
        alert(`❌ ${data.error || 'Falha na compra'}`);
      }
    } catch (error) {
      console.error('Erro na compra:', error);
      alert('❌ Erro ao processar compra. Tente novamente.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '3rem', margin: 0 }}>❌</h1>
          <h2 style={{ color: '#e74c3c' }}>Módulo não encontrado</h2>
          <p style={{ color: '#666' }}>{error || 'O módulo que você procura não existe.'}</p>
          <button
            onClick={() => router.push('/student/dashboard')}
            style={{
              marginTop: '20px',
              padding: '12px 30px',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            ← Voltar para dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', color: '#1a1a2e', margin: 0 }}>🛒</h1>
          <h2 style={{ color: '#1a1a2e' }}>Confirmar Compra</h2>
          <p style={{ color: '#666' }}>Revise os detalhes antes de finalizar</p>
        </div>

        <div
          style={{
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ color: '#1a1a2e', margin: 0 }}>{module.title}</h3>
          <p style={{ color: '#666', marginTop: '10px' }}>{module.description}</p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px solid #ddd',
            }}
          >
            <span style={{ color: '#666' }}>Preço:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4a90e2' }}>
              R$ {module.price}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
            }}
          >
            <span style={{ color: '#666' }}>Aulas:</span>
            <span style={{ color: '#4a90e2' }}>{module.lessons?.length || 0} aulas</span>
          </div>
        </div>

        <div
          style={{
            padding: '15px',
            background: '#e8f5e9',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '5px 0', color: '#2e7d32' }}>✅ Acesso imediato</p>
          <p style={{ margin: '5px 0', color: '#2e7d32' }}>✅ Aulas completas</p>
          <p style={{ margin: '5px 0', color: '#2e7d32' }}>✅ Suporte do professor</p>
          <p style={{ margin: '5px 0', color: '#2e7d32' }}>✅ Acesso vitalício</p>
        </div>

        <button
          onClick={handlePurchase}
          disabled={purchasing}
          style={{
            width: '100%',
            padding: '16px',
            background: purchasing ? '#ccc' : '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: purchasing ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s',
          }}
        >
          {purchasing ? '⏳ Processando...' : '💰 Finalizar Compra'}
        </button>

        <button
          onClick={() => router.push('/student/dashboard')}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '12px',
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          ← Voltar para dashboard
        </button>
      </div>
    </div>
  );
}