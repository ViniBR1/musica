'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractYouTubeId } from '@/lib/youtube';

interface Lesson {
  id: string;
  title: string;
  youtube_url: string;
  description: string;
  is_free_preview: boolean;
  order_number: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  price: number;
  teacher_id: string;
  is_free: boolean;
  free_lesson_url: string | null;
  lessons: Lesson[];
  lessons_count: number;
  created_at: string;
}

export default function ModuleLessonsPage({ params }: { params: { moduleId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchModuleAndCheckPurchase();
  }, [params.moduleId, status]);

  const fetchModuleAndCheckPurchase = async () => {
    try {
      console.log('📡 Buscando módulo:', params.moduleId);
      
      const moduleResponse = await fetch(`/api/modules/${params.moduleId}`);
      const moduleData = await moduleResponse.json();
      console.log('📦 Módulo:', moduleData);
      
      setModule(moduleData);
      setLessons(moduleData.lessons || []);
      
      const firstFreeLesson = moduleData.lessons?.find((l: Lesson) => l.is_free_preview);
      if (firstFreeLesson) {
        setSelectedLesson(firstFreeLesson);
      } else if (moduleData.lessons?.length > 0) {
        setSelectedLesson(moduleData.lessons[0]);
      }

      if (session?.user?.id) {
        const purchaseResponse = await fetch(`/api/purchases?studentId=${session.user.id}`);
        const purchases = await purchaseResponse.json();
        const hasPurchased = purchases.some((p: any) => p.id === params.moduleId);
        setIsPurchased(hasPurchased);
        console.log('✅ Comprado?', hasPurchased);
      }
    } catch (error) {
      console.error('Erro ao carregar módulo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  if (!module) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>❌ Módulo não encontrado</h2>
      </div>
    );
  }

  const freeLessons = lessons.filter(l => l.is_free_preview);
  const lockedLessons = lessons.filter(l => !l.is_free_preview);
  const selectedVideoId = selectedLesson ? extractYouTubeId(selectedLesson.youtube_url) : null;
  const embedUrl = selectedVideoId ? `https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0&modestbranding=1` : null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Cabeçalho */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '10px' 
      }}>
        <div>
          <button
            onClick={() => router.push('/student/dashboard')}
            style={{ 
              padding: '8px 20px', 
              background: '#666', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            ← Voltar
          </button>
          <h1 style={{ color: '#1a1a2e', fontSize: '1.5rem', margin: '0' }}>{module.title}</h1>
          <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem' }}>
            {module.description}
          </p>
        </div>
        {!isPurchased && (
          <button
            onClick={() => router.push(`/student/purchase/${module.id}`)}
            style={{ 
              padding: '10px 24px', 
              background: '#4a90e2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            🛒 Comprar Curso - R$ {parseFloat(String(module.price)).toFixed(2)}
          </button>
        )}
      </div>

      {/* LAYOUT PRINCIPAL: VÍDEO + LISTA DE AULAS LADO A LADO */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: '20px'
      }}>
        {/* COLUNA ESQUERDA - PLAYER DE VÍDEO */}
        <div>
          {selectedLesson && embedUrl ? (
            <div style={{ 
              background: '#000',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
              aspectRatio: '16/9'
            }}>
              <iframe
                src={embedUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
                title={selectedLesson.title}
              />
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                padding: '10px 20px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Aula {lessons.findIndex(l => l.id === selectedLesson.id) + 1} de {lessons.length}
                  </span>
                  <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                    {selectedLesson.title}
                  </span>
                  {selectedLesson.is_free_preview && (
                    <span style={{ 
                      marginLeft: '10px', 
                      fontSize: '0.65rem', 
                      background: '#27ae60', 
                      color: 'white', 
                      padding: '2px 10px', 
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      🔓 Grátis
                    </span>
                  )}
                </div>
                {!isPurchased && !selectedLesson.is_free_preview && (
                  <button
                    onClick={() => router.push(`/student/purchase/${module.id}`)}
                    style={{
                      padding: '4px 14px',
                      background: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    🔓 Comprar para assistir
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ 
              background: '#1a1a2e',
              borderRadius: '10px',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'white',
              aspectRatio: '16/9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎸</div>
              <h3 style={{ margin: '0', color: '#ccc' }}>
                {lessons.length > 0 ? 'Selecione uma aula para assistir' : 'Nenhuma aula disponível'}
              </h3>
              <p style={{ color: '#666', marginTop: '5px' }}>
                {lessons.length > 0 ? 'Clique em uma aula na lista ao lado' : 'Este módulo ainda não tem aulas'}
              </p>
            </div>
          )}

          {/* Status do curso - abaixo do vídeo */}
          <div
            style={{
              marginTop: '15px',
              padding: '12px 15px',
              borderRadius: '8px',
              background: isPurchased ? '#e8f5e9' : '#fff3e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              {isPurchased ? (
                <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  ✅ Você tem acesso a todas as aulas!
                </span>
              ) : (
                <span style={{ color: '#e65100', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  🎯 {freeLessons.length} aulas gratuitas • {lockedLessons.length} bloqueadas
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Total: {lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA - LISTA DE AULAS */}
        <div style={{ 
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Cabeçalho da lista */}
          <div style={{
            padding: '15px 20px',
            background: '#f8f9fa',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold', color: '#1a1a2e' }}>
              📋 Aulas ({lessons.length})
            </span>
            {!isPurchased && freeLessons.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#27ae60' }}>
                {freeLessons.length} grátis
              </span>
            )}
          </div>

          {/* Lista com scroll */}
          <div style={{
            overflowY: 'auto',
            flex: 1,
            padding: '8px'
          }}>
            {lessons.map((lesson, index) => {
              const canWatch = isPurchased || lesson.is_free_preview;
              const isSelected = selectedLesson?.id === lesson.id;

              return (
                <div
                  key={lesson.id}
                  onClick={() => canWatch && handleSelectLesson(lesson)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    marginBottom: '4px',
                    background: isSelected ? '#e3f2fd' : 'transparent',
                    borderRadius: '8px',
                    cursor: canWatch ? 'pointer' : 'default',
                    borderLeft: isSelected ? '4px solid #4a90e2' : (canWatch ? '4px solid #27ae60' : '4px solid #e74c3c'),
                    opacity: canWatch ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        background: isSelected ? '#4a90e2' : (canWatch ? '#27ae60' : '#ccc'),
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ 
                        fontWeight: isSelected ? 'bold' : 'normal', 
                        color: '#1a1a2e', 
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {lesson.title}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {lesson.is_free_preview && (
                          <span style={{ 
                            fontSize: '0.55rem', 
                            background: '#27ae60', 
                            color: 'white', 
                            padding: '1px 6px', 
                            borderRadius: '10px',
                            display: 'inline-block'
                          }}>
                            🔓 Grátis
                          </span>
                        )}
                        {!isPurchased && !lesson.is_free_preview && (
                          <span style={{ 
                            fontSize: '0.55rem', 
                            background: '#e74c3c', 
                            color: 'white', 
                            padding: '1px 6px', 
                            borderRadius: '10px',
                            display: 'inline-block'
                          }}>
                            🔒 Bloqueado
                          </span>
                        )}
                        {isPurchased && (
                          <span style={{ 
                            fontSize: '0.55rem', 
                            background: '#4a90e2', 
                            color: 'white', 
                            padding: '1px 6px', 
                            borderRadius: '10px',
                            display: 'inline-block'
                          }}>
                            ✅
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, marginLeft: '8px' }}>
                    {canWatch && lesson.youtube_url ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectLesson(lesson);
                        }}
                        style={{
                          padding: '3px 12px',
                          background: isSelected ? '#4a90e2' : '#ff0000',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? '#357abd' : '#cc0000'}
                        onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? '#4a90e2' : '#ff0000'}
                      >
                        {isSelected ? '▶️' : '▶️'}
                      </button>
                    ) : (
                      !isPurchased &&
                      !lesson.is_free_preview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/student/purchase/${module.id}`);
                          }}
                          style={{
                            padding: '3px 10px',
                            background: '#4a90e2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                          }}
                        >
                          🔓
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé da lista - chamada para comprar */}
          {!isPurchased && lockedLessons.length > 0 && (
            <div style={{
              padding: '12px 15px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textAlign: 'center',
              borderTop: '1px solid #eee'
            }}>
              <button
                onClick={() => router.push(`/student/purchase/${module.id}`)}
                style={{
                  padding: '6px 16px',
                  background: 'white',
                  color: '#4a90e2',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                }}
              >
                🛒 Desbloquear {lockedLessons.length} aulas
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Aulas gratuitas em destaque (abaixo do layout) */}
      {!isPurchased && freeLessons.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#e8f5e9', 
          borderRadius: '8px',
          border: '1px solid #27ae60'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#2e7d32' }}>
            🔓 Aulas gratuitas disponíveis:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {freeLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => handleSelectLesson(lesson)}
                style={{
                  padding: '6px 16px',
                  background: selectedLesson?.id === lesson.id ? '#27ae60' : 'white',
                  color: selectedLesson?.id === lesson.id ? 'white' : '#27ae60',
                  border: selectedLesson?.id === lesson.id ? 'none' : '1px solid #27ae60',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ▶️ {lesson.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé - chamada para comprar (se houver aulas bloqueadas) */}
      {!isPurchased && lessons.length > 0 && lockedLessons.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '10px', 
          textAlign: 'center',
          color: 'white'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
            🎯 Desbloqueie todas as {lockedLessons.length} aulas!
          </h3>
          <p style={{ margin: '0 0 15px 0', opacity: 0.9, fontSize: '0.9rem' }}>
            Compre o curso completo e tenha acesso a todas as aulas
          </p>
          <button
            onClick={() => router.push(`/student/purchase/${module.id}`)}
            style={{
              padding: '12px 40px',
              background: 'white',
              color: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🛒 Comprar Curso - R$ {parseFloat(String(module.price)).toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}