import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request, { params }: { params: { moduleId: string } }) {
  try {
    const { moduleId } = params;

    console.log('📡 Buscando módulo ID:', moduleId);

    // Buscar módulo principal
    const moduleResult = await query(
      `SELECT m.*, i.name as instrument_name, i.icon as instrument_icon
       FROM modules m
       LEFT JOIN instruments i ON m.instrument_id = i.id
       WHERE m.id = $1`,
      [moduleId]
    );

    if (moduleResult.length === 0) {
      console.log('❌ Módulo não encontrado:', moduleId);
      return Response.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    const module = moduleResult[0];
    console.log('✅ Módulo encontrado:', module.title);

    // Buscar aulas do módulo
    const lessons = await query(
      `SELECT id, title, youtube_url, description, is_free_preview, order_number
       FROM lessons 
       WHERE module_id = $1 
       ORDER BY order_number`,
      [moduleId]
    );
    console.log(`📹 ${lessons.length} aulas encontradas`);

    // Buscar SUB-MÓDULOS (módulos com parent_id = module.id)
    const subModules = await query(
      `SELECT 
        id, 
        title, 
        description, 
        price, 
        is_free, 
        free_lesson_url, 
        instrument_id,
        created_at
       FROM modules 
       WHERE parent_id = $1 
       ORDER BY created_at ASC`,
      [moduleId]
    );
    console.log(`📁 ${subModules.length} sub-módulos encontrados`);

    // Buscar aulas dos sub-módulos
    const subModulesWithLessons = await Promise.all(
      subModules.map(async (sub: any) => {
        const subLessons = await query(
          `SELECT id, title, youtube_url, description, is_free_preview, order_number
           FROM lessons 
           WHERE module_id = $1 
           ORDER BY order_number`,
          [sub.id]
        );
        
        const subInstrument = await query(
          'SELECT name, icon FROM instruments WHERE id = $1',
          [sub.instrument_id]
        );
        
        return { 
          ...sub, 
          lessons: subLessons || [],
          instrument_name: subInstrument[0]?.name || null,
          instrument_icon: subInstrument[0]?.icon || null,
        };
      })
    );

    // Buscar nome do professor
    const teacher = await query(
      'SELECT name FROM users WHERE id = $1',
      [module.teacher_id]
    );

    const completeModule = {
      ...module,
      lessons: lessons || [],
      lessons_count: lessons?.length || 0,
      sub_modules: subModulesWithLessons || [],
      teacher_name: teacher[0]?.name || 'Professor',
    };

    console.log(`🎉 Módulo completo com ${completeModule.sub_modules.length} sub-módulos`);

    return Response.json(completeModule);
  } catch (error) {
    console.error('❌ Erro ao buscar módulo:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { moduleId: string } }) {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== 'teacher') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { moduleId } = params;

    console.log('🗑️ Deletando módulo:', moduleId);

    // Verificar se o módulo pertence ao professor
    const moduleCheck = await query(
      'SELECT * FROM modules WHERE id = $1 AND teacher_id = $2',
      [moduleId, session.user.id]
    );

    if (moduleCheck.length === 0) {
      return Response.json({ error: 'Módulo não encontrado ou não pertence a você' }, { status: 404 });
    }

    // Deletar módulo (cascata vai deletar as aulas também)
    await query('DELETE FROM modules WHERE id = $1', [moduleId]);

    console.log('✅ Módulo deletado com sucesso');

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao deletar módulo:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}