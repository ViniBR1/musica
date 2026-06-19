import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request, { params }: { params: { moduleId: string } }) {
  try {
    const { moduleId } = params;

    // Buscar módulo
    const moduleResult = await query(
      `SELECT * FROM modules WHERE id = $1`,
      [moduleId]
    );

    if (moduleResult.length === 0) {
      return Response.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    const module = moduleResult[0];

    // Buscar aulas
    const lessons = await query(
      `SELECT id, title, youtube_url, description, is_free_preview, order_number
       FROM lessons 
       WHERE module_id = $1 
       ORDER BY order_number`,
      [moduleId]
    );

    const completeModule = {
      ...module,
      lessons: lessons || [],
      lessons_count: lessons?.length || 0
    };

    return Response.json(completeModule);
  } catch (error) {
    console.error('❌ Erro ao buscar módulo:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { moduleId: string } }) {
  try {
    const session = await getServerSession(authOptions);

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