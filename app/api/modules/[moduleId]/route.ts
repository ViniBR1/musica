import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request, { params }: { params: { moduleId: string } }) {
  try {
    const { moduleId } = params;

    const moduleResult = await query(
      `SELECT * FROM modules WHERE id = $1`,
      [moduleId]
    );

    if (moduleResult.length === 0) {
      return Response.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    const module = moduleResult[0];

    const lessons = await query(
      `SELECT id, title, youtube_url, description, is_free_preview, order_number
       FROM lessons 
       WHERE module_id = $1 
       ORDER BY order_number`,
      [moduleId]
    );

    const instrument = await query(
      'SELECT name, icon FROM instruments WHERE id = $1',
      [module.instrument_id]
    );

    const completeModule = {
      ...module,
      lessons: lessons || [],
      lessons_count: lessons?.length || 0,
      instrument_name: instrument[0]?.name || null,
      instrument_icon: instrument[0]?.icon || null
    };

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

    await query('DELETE FROM modules WHERE id = $1', [moduleId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao deletar módulo:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}