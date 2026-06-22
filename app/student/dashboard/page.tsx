'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEmbedUrl } from '@/lib/youtube';

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  description: string;
  is_free_preview: boolean;
  order_number: number;
  module_id?: string;
  module_title?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  price: number;
  teacher_id: string;
  teacher_name?: string;
  is_free: boolean;
  free_lesson_url: string | null;
  instrument_id: string | null;
  instrument_name?: string;
  instrument_icon?: string;
  lessons: Lesson[];
  lessons_count: number;
  sub_modules?: Module[];
  parent_id?: string | null;
  created_at: string;
}

interface Instrument {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [purchasedModules, setPurchasedModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role && session.user.role !== 'student') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchInstruments();
    }
  }, [session, status]);

  useEffect(() => {
    if (selectedInstrument) {
      fetchData();
    }
  }, [selectedInstrument]);

  const fetchInstruments = async () => {
    try {
      const response = await fetch('/api/instruments');
      const data = await response.json();
      setInstruments(Array.isArray(data) ? data : []);
      
      const bass = data.find((i: Instrument) => i.name === 'Baixo');
      if (bass) {
        setSelectedInstrument(bass.id);
      } else if (data.length > 0) {
        setSelectedInstrument(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar instrumentos:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📡 Buscando dados do aluno...');
      console.log('🎵 Instrumento selecionado:', selectedInstrument);
      
      const url = selectedInstrument 
        ? `/api/modules?instrumentId=${selectedInstrument}`
        : '/api/modules';
      const modulesRes = await fetch(url);
      const modulesData = await modulesRes.json();
      setModules(Array.isArray(modulesData) ? modulesData : []);
      console.log(`📦 ${modulesData.length} módulos disponíveis`);

      const purchasesRes = await fetch(`/api/purchases?studentId=${session?.user?.id}`);
      const purchasesData = await purchasesRes.json();
      setPurchasedModules(Array.isArray(purchasesData) ? purchasesData : []);
      console.log(`📦 ${purchasesData.length} módulos comprados`);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setModules([]);
      setPurchasedModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (moduleId: string) => {
    try {
      router.push(`/student/purchase/${moduleId}`);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao iniciar compra');
    }
  };

  const handleWatchPreview = (module: Module) => {
    setSelectedModule(module);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedModule(null);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // Função para calcular total de aulas (incluindo sub-módulos)
  const getTotalLessons = (module: Module) => {
    const mainLessons = module.lessons?.length || 0;
    const subLessons = module.sub_modules?.reduce((acc, sub) => acc + (sub.lessons?.length || 0), 0) || 0;
    return mainLessons + subLessons;
  };

  // Função para calcular total de módulos (incluindo sub-módulos)
  const getTotalModules = (module: Module) => {
    return 1 + (module.sub_modules?.length || 0);
  };

  const renderModuleCard = (module: Module, isPurchased: boolean) => {
    const subModules = module.sub_modules || [];
    const hasSubModules = subModules.length > 0;
    const totalLessons = getTotalLessons(module);
    const totalModules = getTotalModules(module);
    const freeLessons = module.lessons?.filter((l: any) => l.is_free_preview).length || 0;
    const price = parseFloat(String(module.price)) || 0;

    return (
      <div
        key={module.id}
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          borderLeft: isPurchased ? '5px solid #27ae60' : '5px solid #4a90e2',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }}
        onClick={() => router.push(`/student/modules/${module.id}`)}
      >
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          {isPurchased ? (
            <span style={{ background: '#27ae60', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
              ✅ ADQUIRIDO
            </span>
          ) : module.is_free ? (
            <span style={{ background: '#f39c12', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
              🎁 GRÁTIS
            </span>
          ) : (
            <span style={{ background: '#4a90e2', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold' }}>
              DISPONÍVEL
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '80px' }}>
          {hasSubModules && <span style={{ fontSize: '1.5rem' }}>📁</span>}
          <h3 style={{ color: '#1a1a2e', margin: 0, fontSize: '1.1rem' }}>
            {module.title}
          </h3>
        </div>

        {module.instrument_icon && (
          <div style={{ marginBottom: '5px' }}>
            <span style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 10px', borderRadius: '12px' }}>
              {module.instrument_icon} {module.instrument_name || 'Instrumento'}
            </span>
          </div>
        )}

        <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {module.description}
        </p>

        {/* ESTATÍSTICAS DO CURSO */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '10px',
          marginTop: '12px',
          padding: '12px 0',
          borderTop: '1px solid #f0f0f0',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4a90e2' }}>
              {totalModules}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#888' }}>
              {totalModules === 1 ? 'Módulo' : 'Módulos'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>
              {totalLessons}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#888' }}>
              {totalLessons === 1 ? 'Aula' : 'Aulas'}
            </div>
          </div>
          {freeLessons > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f39c12' }}>
                {freeLessons}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>
                Grátis
              </div>
            </div>
          )}
          {hasSubModules && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#8e44ad' }}>
                {subModules.length}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>
                Sub-módulos
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4a90e2', marginTop: '12px', marginBottom: '10px' }}>
          {module.is_free ? '🎁 Gratuito' : `R$ ${price.toFixed(2)}`}
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
          {module.free_lesson_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWatchPreview(module);
              }}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '10px 12px',
                background: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              🎬 Preview
            </button>
          )}

          {isPurchased ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/student/modules/${module.id}`);
              }}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '10px 12px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              ▶️ Assistir Aulas
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePurchase(module.id);
              }}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '10px 12px',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
              }}
            >
              🛒 Comprar
            </button>
          )}
        </div>

        {/* SUB-MÓDULOS - Renderização */}
        {hasSubModules && (
          <div style={{ 
            marginTop: '15px', 
            paddingTop: '15px', 
            borderTop: '2px solid #f0f0f0',
            backgroundColor: '#faf5ff',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <p style={{ 
              fontSize: '0.8rem', 
              fontWeight: 'bold', 
              color: '#6a1b9a', 
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              📁 Sub-módulos ({subModules.length}):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {subModules.map((sub: any) => (
                <button
                  key={sub.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/student/modules/${sub.id}`);
                  }}
                  style={{
                    padding: '6px 14px',
                    background: '#e8d5f5',
                    color: '#4a148c',
                    border: '1px solid #8e44ad',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d1c4e9';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e8d5f5';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  📁 {sub.title}
                  {sub.lessons && sub.lessons.length > 0 && (
                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                      ({sub.lessons.length} aulas)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>⏳ Carregando...</h2>
          <p style={{ color: '#666' }}>Carregando seus cursos</p>
        </div>
      </div>
    );
  }

  const purchased = Array.isArray(purchasedModules) ? purchasedModules : [];
  const available = Array.isArray(modules) ? modules : [];
  const mainModules = available.filter((m: any) => !m.parent_id);
  const selectedPrice = selectedModule ? parseFloat(String(selectedModule.price)) || 0 : 0;

  // Calcular totais dos cursos disponíveis
  const totalAvailableModules = mainModules.reduce((acc, m) => acc + getTotalModules(m), 0);
  const totalAvailableLessons = mainModules.reduce((acc, m) => acc + getTotalLessons(m), 0);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px 16px',
      width: '100%',
      minHeight: '100vh',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1a1a2e', margin: 0 }}>
            👋 Olá, {session?.user?.name}!
          </h1>
          <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem' }}>
            Bem-vindo à sua área de aluno
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          🚪 Sair
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {instruments.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setSelectedInstrument(inst.id)}
            style={{
              padding: '8px 16px',
              background: selectedInstrument === inst.id ? '#4a90e2' : '#f5f5f5',
              color: selectedInstrument === inst.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>{inst.icon}</span>
            {inst.name}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px',
      }}>
        <button
          onClick={() => router.push('/student/live')}
          style={{
            padding: '20px',
            background: 'white',
            border: '2px solid #8e44ad',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }}>🎥</div>
          <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Aulas ao Vivo</div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
            Participe ao vivo
          </div>
        </button>

        <button
          onClick={() => alert('🔜 Em breve: Chat')}
          style={{
            padding: '20px',
            background: 'white',
            border: '2px solid #f39c12',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem' }}>💬</div>
          <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Chat</div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
            Com seu professor
          </div>
        </button>
      </div>

      {/* MEUS CURSOS */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <h2 style={{ color: '#1a1a2e', margin: 0, fontSize: '1.3rem' }}>
            📚 Meus Cursos ({purchased.length})
          </h2>
          {purchased.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              {purchased.reduce((acc, m) => acc + getTotalModules(m), 0)} módulos •{' '}
              {purchased.reduce((acc, m) => acc + getTotalLessons(m), 0)} aulas
            </div>
          )}
        </div>

        {purchased.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px 20px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          }}>
            <p style={{ fontSize: '1rem', color: '#666' }}>
              📚 Você ainda não comprou nenhum curso
            </p>
            <p style={{ color: '#999', marginTop: '10px', fontSize: '0.9rem' }}>
              Explore os cursos disponíveis abaixo
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {purchased.map((module) => renderModuleCard(module, true))}
          </div>
        )}
      </div>

      {/* CURSOS DISPONÍVEIS */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <h2 style={{ color: '#1a1a2e', margin: 0, fontSize: '1.3rem' }}>
            🎯 Cursos Disponíveis ({mainModules.filter((m: any) => !purchased.some((p: any) => p.id === m.id)).length})
          </h2>
          {mainModules.filter((m: any) => !purchased.some((p: any) => p.id === m.id)).length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              {totalAvailableModules} módulos • {totalAvailableLessons} aulas
            </div>
          )}
        </div>

        {mainModules.filter((m: any) => !purchased.some((p: any) => p.id === m.id)).length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px 20px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          }}>
            <p style={{ fontSize: '1rem', color: '#666' }}>
              🎉 Você já comprou todos os cursos disponíveis para este instrumento!
            </p>
            <p style={{ color: '#999', marginTop: '10px', fontSize: '0.9rem' }}>
              Selecione outro instrumento ou aguarde novos cursos
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {mainModules
              .filter((m: any) => !purchased.some((p: any) => p.id === m.id))
              .map((module: any) => renderModuleCard(module, false))}
          </div>
        )}
      </div>

      {/* Modal de Preview */}
      {showPreview && selectedModule && (
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
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            padding: '30px 20px',
            borderRadius: '16px',
            maxWidth: '90%',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{ color: '#1a1a2e', margin: 0, fontSize: '1.2rem' }}>
                🎬 Aula Grátis: {selectedModule.title}
              </h2>
              <button
                onClick={closePreview}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                ✕ Fechar
              </button>
            </div>

            <div style={{
              background: '#000',
              borderRadius: '10px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              marginBottom: '20px',
            }}>
              {selectedModule.free_lesson_url && (
                <iframe
                  src={getEmbedUrl(selectedModule.free_lesson_url) || selectedModule.free_lesson_url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
                />
              )}
            </div>

            <p style={{ color: '#666', fontSize: '0.95rem' }}>{selectedModule.description}</p>

            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #eee',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => {
                  closePreview();
                  handlePurchase(selectedModule.id);
                }}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '12px',
                  background: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                }}
              >
                🛒 Comprar Curso - R$ {selectedPrice.toFixed(2)}
              </button>
              <button
                onClick={closePreview}
                style={{
                  padding: '12px 24px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Continuar
              </button>
            </div>

            <p style={{
              fontSize: '0.8rem',
              color: '#999',
              marginTop: '10px',
              textAlign: 'center',
            }}>
              💡 Esta é uma aula gratuita para você conhecer o curso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}