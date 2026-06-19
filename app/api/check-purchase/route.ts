import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const studentId = searchParams.get('studentId');

    if (!moduleId || !studentId) {
      return Response.json({ error: 'Parâmetros incompletos' }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM purchases WHERE student_id = $1 AND module_id = $2 AND status = $3',
      [studentId, moduleId, 'approved']
    );

    return Response.json({ purchased: result.length > 0 });
  } catch (error) {
    console.error('❌ Erro ao verificar compra:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}