import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

// POST - Registrar que o aluno assistiu a live
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    const { userId } = data;

    if (!userId) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 400 });
    }

    // Verificar se a sala existe
    const roomCheck = await query(
      `SELECT id, module_id, status FROM live_rooms WHERE id = $1`,
      [id]
    );

    if (roomCheck.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    // Registrar que o aluno assistiu
    await query(`
      CREATE TABLE IF NOT EXISTS live_room_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES live_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        watch_type VARCHAR(20) DEFAULT 'live',
        UNIQUE(room_id, user_id)
      )
    `);

    // Registrar visualização
    await query(
      `INSERT INTO live_room_views (room_id, user_id, watch_type)
       VALUES ($1, $2, 'live')
       ON CONFLICT (room_id, user_id) DO UPDATE SET watched_at = NOW()`,
      [id, userId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao registrar visualização:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET - Verificar se o aluno já assistiu a live
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    const view = await query(
      'SELECT * FROM live_room_views WHERE room_id = $1 AND user_id = $2',
      [id, userId]
    );

    return Response.json({ watched: view.length > 0 });
  } catch (error) {
    console.error('❌ Erro ao verificar visualização:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}