import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await query(
      `SELECT 
        lr.*,
        u.name as teacher_name,
        u.email as teacher_email,
        m.title as module_title
       FROM live_rooms lr
       JOIN users u ON lr.teacher_id = u.id
       LEFT JOIN modules m ON lr.module_id = m.id
       WHERE lr.id = $1`,
      [id]
    );

    if (result.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== 'teacher') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    const check = await query('SELECT * FROM live_rooms WHERE id = $1 AND teacher_id = $2', [
      id,
      session.user.id,
    ]);

    if (check.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    await query('DELETE FROM live_rooms WHERE id = $1', [id]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao deletar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}