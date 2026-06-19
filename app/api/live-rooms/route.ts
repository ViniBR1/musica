import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    let sql = `
      SELECT 
        lr.*,
        u.name as teacher_name,
        u.email as teacher_email,
        m.title as module_title
      FROM live_rooms lr
      JOIN users u ON lr.teacher_id = u.id
      LEFT JOIN modules m ON lr.module_id = m.id
      WHERE lr.status = 'active'
    `;

    const params: any[] = [];

    if (teacherId) {
      sql += ` AND lr.teacher_id = $1`;
      params.push(teacherId);
    }

    sql += ` ORDER BY lr.created_at DESC`;

    const rooms = await query(sql, params);
    return Response.json(rooms);
  } catch (error) {
    console.error('❌ Erro ao listar salas:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== 'teacher') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, module_id } = data;

    if (!title) {
      return Response.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    const roomCode = uuidv4().substring(0, 8).toUpperCase();
    const peerId = `teacher-${session.user.id}-${Date.now()}`;

    const result = await query(
      `INSERT INTO live_rooms (teacher_id, title, description, module_id, room_code, peer_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [session.user.id, title, description, module_id || null, roomCode, peerId]
    );

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    await query(`UPDATE live_rooms SET status = 'finished' WHERE id = $1`, [roomId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao fechar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}