'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  instrument_id: string | null;
  instrument_name?: string;
  instrument_icon?: string;
  lessons: Lesson[];
  lessons_count: number;
  parent_id: string | null;
  sub_modules?: Module[];
  created_at: string;
}

interface Instrument {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    price: '',
    is_free: false,
    free_lesson_url: '',
    parent_id: '',
    instrument_id: '',
    teacherId: '',
    lessons: [] as { title: string; youtube_url: string; description: string; is_free_preview: boolean }[]
  });

  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    youtube_url: '',
    description: '',
    is_free_preview: false
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role && session.user.role !== 'teacher' && session.user.role !== 'admin') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchModules();
      fetchInstruments();
    }
  }, [session, status]);

  const fetchModules = async () => {
    try {
      const response = await fetch(`/api/modules?teacherId=${session?.user?.id}`);
      const data = await response.json();
      setModules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstruments = async () => {
    try {
      const response = await fetch('/api/instruments');
      const data = await response.json();
      setInstruments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar instrumentos:', error);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newModule.title) {
      alert('⚠️ Título do módulo é obrigatório');
      return;
    }

    if (!newModule.instrument_id) {
      alert('⚠️ Selecione um instrumento');
      return;
    }

    try {
      // Construir payload
      const payload: any = {
        title: newModule.title,
        description: newModule.description,
        price: parseFloat(newModule.price) || 0,
        is_free: newModule.is_free,
        free_lesson_url: newModule.free_lesson_url || null,
        instrument_id: newModule.instrument_id,
        parent_id: newModule.parent_id || null,
        lessons: newModule.lessons,
      };

      // Se for admin, enviar teacherId
      if (session?.user?.role === 'admin') {
        if (!newModule.teacherId) {
          alert('⚠️ Admin precisa selecionar um professor');
          return;
        }
        payload.teacherId = newModule.teacherId;
      }

      console.log('📦 Enviando payload:', payload);

      const response = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setNewModule({
          title: '',
          description: '',
          price: '',
          is_free: false,
          free_lesson_url: '',
          parent_id: '',
          instrument_id: '',
          teacherId: '',
          lessons: [],
        });
        fetchModules();
        alert(`✅ Módulo criado com ${data.lessons?.length || 0} aulas!`);
      } else {
        setError(data.error || data.details || 'Erro ao criar módulo');
        alert(`❌ ${data.error || data.details || 'Erro ao criar módulo'}`);
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao criar módulo');
      alert('❌ Erro ao criar módulo');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo?')) return;

    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchModules();
        alert('✅ Módulo excluído com sucesso!');
      } else {
        alert('❌ Erro ao excluir módulo');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao excluir módulo');
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return;

    try {
      const response = await fetch(`/api/modules/${moduleId}/lessons?lessonId=${lessonId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchModules();
        alert('✅ Aula excluída com sucesso!');
      } else {
        alert('❌ Erro ao excluir aula');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao excluir aula');
    }
  };

  const addLessonToList = () => {
    if (!currentLesson.title || !currentLesson.youtube_url) {
      alert('⚠️ Preencha título e URL do YouTube da aula');
      return;
    }

    setNewModule({
      ...newModule,
      lessons: [...newModule.lessons, { ...currentLesson }]
    });

    setCurrentLesson({
      title: '',
      youtube_url: '',
      description: '',
      is_free_preview: false
    });
  };

  const removeLessonFromList = (index: number) => {
    const updatedLessons = newModule.lessons.filter((_, i) => i !== index);
    setNewModule({ ...newModule, lessons: updatedLessons });
  };

  const renderModule = (module: Module, level: number = 0) => {
    const isSubModule = level > 0;
    const paddingLeft = level * 30;

    return (
      <div
        key={module.id}
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginLeft: paddingLeft,
          marginTop: '10px',
          borderLeft: isSubModule ? '4px solid #8e44ad' : '4px solid #4a90e2',
          width: '100%',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '15px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isSubModule && <span style={{ fontSize: '1.2rem' }}>📁</span>}
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {isSubModule ? 'Sub-módulo: ' : ''}{module.title}
                {module.is_free && (
                  <span style={{ marginLeft: '10px', fontSize: '0.7rem', background: '#27ae60', color: 'white', padding: '2px 10px', borderRadius: '15px' }}>
                    🎁 Grátis
                  </span>
                )}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
              {module.instrument_icon && (
                <span style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '2px 10px', borderRadius: '12px' }}>
                  {module.instrument_icon} {module.instrument_name || 'Instrumento'}
                </span>
              )}
            </div>
            <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem' }}>{module.description}</p>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: '#4a90e2', fontWeight: 'bold' }}>R$ {module.price}</span>
              <span style={{ color: '#666' }}>📹 {module.lessons?.length || 0} aulas</span>
              {module.free_lesson_url && <span style={{ color: '#f39c12' }}>🎬 Aula gratuita</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDeleteModule(module.id)}
              style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              🗑️ Excluir
            </button>
          </div>
        </div>

        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#555', fontSize: '1rem' }}>📹 Aulas:</h4>
          {module.lessons?.length === 0 ? (
            <p style={{ color: '#999', fontSize: '0.9rem' }}>Nenhuma aula adicionada ainda</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {module.lessons?.map((lesson) => (
                <div key={lesson.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  borderRadius: '5px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div>
                    <strong>{lesson.order_number}.</strong> {lesson.title}
                    {lesson.is_free_preview && (
                      <span style={{ marginLeft: '10px', fontSize: '0.65rem', background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                        🔓 Grátis
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <a href={lesson.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', textDecoration: 'none', fontSize: '0.85rem' }}>
                      ▶️ Ver
                    </a>
                    <button
                      onClick={() => handleDeleteLesson(module.id, lesson.id)}
                      style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {module.sub_modules && module.sub_modules.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#8e44ad', fontSize: '1rem' }}>📁 Sub-módulos:</h4>
              {module.sub_modules.map((sub: any) => renderModule(sub, level + 1))}
            </div>
          )}
        </div>
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
        <h2>⏳ Carregando...</h2>
      </div>
    );
  }

  const moduleList = Array.isArray(modules) ? modules : [];
  const mainModules = moduleList.filter(m => !m.parent_id);
  const totalLessons = moduleList.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalRevenue = moduleList.reduce((acc, m) => acc + (parseFloat(String(m.price)) || 0), 0);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px 16px',
      width: '100%',
      minHeight: '100vh',
    }}>
      {/* Cabeçalho */}
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
            {session?.user?.role === 'admin' ? '👑 Painel Admin' : '👨‍🏫 Painel do Professor'}
          </h1>
          <p style={{ color: '#666', marginTop: '5px', fontSize: '0.9rem' }}>
            Bem-vindo, {session?.user?.name}!
            {session?.user?.role === 'admin' && <span style={{ color: '#8e44ad', marginLeft: '10px' }}>(Modo Admin)</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/teacher/live')}
            style={{ padding: '10px 20px', background: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            🎥 Aulas ao Vivo
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fde8e8',
          border: '1px solid #e74c3c',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '15px',
          color: '#c0392b',
        }}>
          <strong>❌ Erro:</strong> {error}
        </div>
      )}

      {/* Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px',
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>📚 Módulos</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4a90e2', margin: '10px 0 0 0' }}>
            {mainModules.length}
          </p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>📹 Aulas</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#27ae60', margin: '10px 0 0 0' }}>
            {totalLessons}
          </p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>💰 Receita</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f39c12', margin: '10px 0 0 0' }}>
            R$ {totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Botão Criar Módulo */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          marginBottom: '20px',
          padding: '12px 24px',
          background: '#4a90e2',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.95rem',
          width: '100%',
          maxWidth: '300px',
        }}
      >
        ➕ Criar Módulo
      </button>

      {/* Lista de Módulos */}
      {mainModules.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '40px 20px',
          borderRadius: '10px',
          textAlign: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontSize: '1rem', color: '#666' }}>📚 Você ainda não criou nenhum módulo</p>
          <p style={{ color: '#999', marginTop: '10px', fontSize: '0.9rem' }}>
            Clique em "Criar Módulo" para começar
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {mainModules.map(module => renderModule(module, 0))}
        </div>
      )}

      {/* Modal Criar Módulo */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            padding: '24px 20px',
            borderRadius: '12px',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>
              {session?.user?.role === 'admin' ? '👑 Criar Módulo (Admin)' : '📚 Criar Módulo'}
            </h2>

            <form onSubmit={handleCreateModule}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  Título do Módulo *
                </label>
                <input
                  type="text"
                  required
                  value={newModule.title}
                  onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  Descrição
                </label>
                <textarea
                  value={newModule.description}
                  onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    minHeight: '80px',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  🎵 Instrumento *
                </label>
                <select
                  required
                  value={newModule.instrument_id}
                  onChange={(e) => setNewModule({...newModule, instrument_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="">Selecione um instrumento</option>
                  {instruments.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.icon} {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo para Admin selecionar professor */}
              {session?.user?.role === 'admin' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                    👨‍🏫 Professor *
                  </label>
                  <input
                    type="text"
                    placeholder="ID do professor (ex: 123e4567-e89b-12d3-a456-426614174000)"
                    value={newModule.teacherId}
                    onChange={(e) => setNewModule({...newModule, teacherId: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '0.95rem',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px' }}>
                    Cole o ID do professor que será o responsável pelo módulo
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newModule.price}
                  onChange={(e) => setNewModule({...newModule, price: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={newModule.is_free}
                    onChange={(e) => setNewModule({...newModule, is_free: e.target.checked})}
                  />
                  📢 Módulo gratuito
                </label>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  📁 Módulo Pai (opcional)
                </label>
                <select
                  value={newModule.parent_id}
                  onChange={(e) => setNewModule({...newModule, parent_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="">Nenhum (módulo principal)</option>
                  {modules.filter((m: any) => !m.parent_id).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px' }}>
                  Selecione um módulo pai para criar um sub-módulo
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '0.9rem' }}>
                  🎬 URL da Aula Grátis (Preview)
                </label>
                <input
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  value={newModule.free_lesson_url}
                  onChange={(e) => setNewModule({...newModule, free_lesson_url: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '0.95rem',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px' }}>
                  Alunos poderão assistir esta aula antes de comprar
                </p>
              </div>

              {/* Aulas */}
              <div style={{
                borderTop: '2px solid #eee',
                paddingTop: '20px',
                marginTop: '20px',
              }}>
                <h3 style={{ fontSize: '1.1rem' }}>📹 Aulas do Módulo</h3>

                {newModule.lessons.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    {newModule.lessons.map((lesson, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#e8f5e9',
                        borderRadius: '5px',
                        marginBottom: '5px',
                      }}>
                        <div>
                          <strong>{index + 1}.</strong> {lesson.title}
                          {lesson.is_free_preview && (
                            <span style={{ marginLeft: '10px', fontSize: '0.65rem', background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                              🔓 Preview
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLessonFromList(index)}
                          style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>➕ Adicionar Aula</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '10px',
                  }}>
                    <input
                      type="text"
                      placeholder="Título"
                      value={currentLesson.title}
                      onChange={(e) => setCurrentLesson({...currentLesson, title: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '0.95rem',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="URL do YouTube"
                      value={currentLesson.youtube_url}
                      onChange={(e) => setCurrentLesson({...currentLesson, youtube_url: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '0.95rem',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={currentLesson.description}
                      onChange={(e) => setCurrentLesson({...currentLesson, description: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontSize: '0.95rem',
                      }}
                    />
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}>
                      <input
                        type="checkbox"
                        checked={currentLesson.is_free_preview}
                        onChange={(e) => setCurrentLesson({...currentLesson, is_free_preview: e.target.checked})}
                      />
                      <span>🔓 Aula gratuita (preview)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addLessonToList}
                      style={{
                        padding: '10px',
                        background: '#4a90e2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                      }}
                    >
                      ➕ Adicionar à Lista
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
                flexWrap: 'wrap',
              }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '12px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                  }}
                >
                  ✅ Criar Módulo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewModule({
                      title: '',
                      description: '',
                      price: '',
                      is_free: false,
                      free_lesson_url: '',
                      parent_id: '',
                      instrument_id: '',
                      teacherId: '',
                      lessons: []
                    });
                    setCurrentLesson({
                      title: '',
                      youtube_url: '',
                      description: '',
                      is_free_preview: false
                    });
                    setError(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}