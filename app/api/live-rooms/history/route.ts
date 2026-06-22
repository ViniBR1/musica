import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

// GET - Histórico de lives do usuário
export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 400 });
    }

    // Buscar lives que o usuário assistiu ou criou
    const history = await query(
      `SELECT 
        lr.*,
        u.name as teacher_name,
        u.email as teacher_email
       FROM live_rooms lr
       JOIN users u ON lr.teacher_id = u.id
       WHERE lr.status = 'finished' 
         AND (lr.created_by = $1 OR lr.id IN (
           SELECT room_id FROM live_room_views WHERE user_id = $1
         ))
       ORDER BY lr.created_at DESC
       LIMIT 30`,
      [userId]
    );

    return Response.json(history);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Registrar que um usuário assistiu uma live
export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return Response.json({ error: 'ID da sala não fornecido' }, { status: 400 });
    }

    const data = await request.json();
    const { userId } = data;

    if (!userId) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 400 });
    }

    // Verificar se a sala existe
    const roomCheck = await query(
      'SELECT id FROM live_rooms WHERE id = $1',
      [roomId]
    );

    if (roomCheck.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    // Verificar se já registrou
    const existingView = await query(
      'SELECT id FROM live_room_views WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (existingView.length === 0) {
      // Criar tabela se não existir
      await query(`
        CREATE TABLE IF NOT EXISTS live_room_views (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID REFERENCES live_rooms(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(room_id, user_id)
        )
      `);

      // Registrar visualização
      await query(
        `INSERT INTO live_room_views (room_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_id) DO NOTHING`,
        [roomId, userId]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao registrar visualização:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}