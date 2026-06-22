import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

// GET - Listar salas ativas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const moduleId = searchParams.get('moduleId');

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

    if (moduleId) {
      sql += ` AND lr.module_id = $2`;
      params.push(moduleId);
    }

    sql += ` ORDER BY lr.created_at DESC`;

    const rooms = await query(sql, params);
    return Response.json(rooms);
  } catch (error) {
    console.error('❌ Erro ao listar salas:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar sala de transmissão
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

    // Verificar se o módulo pertence ao professor
    if (module_id) {
      const moduleCheck = await query(
        'SELECT id, title FROM modules WHERE id = $1 AND teacher_id = $2',
        [module_id, session.user.id]
      );
      if (moduleCheck.length === 0) {
        return Response.json(
          { error: 'Módulo não encontrado ou não pertence a você' },
          { status: 404 }
        );
      }
    }

    const roomCode = uuidv4().substring(0, 8).toUpperCase();
    const peerId = `teacher-${session.user.id}-${Date.now()}`;

    const result = await query(
      `INSERT INTO live_rooms (teacher_id, title, description, module_id, room_code, peer_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING *`,
      [session.user.id, title, description, module_id || null, roomCode, peerId, session.user.id]
    );

    // Registrar no módulo
    if (module_id) {
      await query(
        `UPDATE modules SET last_live_id = $1 WHERE id = $2`,
        [result[0].id, module_id]
      );
    }

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Salvar URL da gravação
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== 'teacher') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const data = await request.json();
    const { recording_url } = data;

    if (!roomId || !recording_url) {
      return Response.json(
        { error: 'ID da sala e URL da gravação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a sala pertence ao professor
    const roomCheck = await query(
      'SELECT module_id FROM live_rooms WHERE id = $1 AND teacher_id = $2',
      [roomId, session.user.id]
    );

    if (roomCheck.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    // Atualizar status e salvar gravação
    await query(
      `UPDATE live_rooms 
       SET recording_url = $1, status = 'recorded', recorded_at = NOW()
       WHERE id = $2 AND teacher_id = $3`,
      [recording_url, roomId, session.user.id]
    );

    // Associar ao módulo para alunos verem
    if (roomCheck[0].module_id) {
      await query(
        `INSERT INTO module_live_recordings (module_id, live_room_id, recording_url)
         VALUES ($1, $2, $3)
         ON CONFLICT (module_id, live_room_id) DO UPDATE SET recording_url = $3`,
        [roomCheck[0].module_id, roomId, recording_url]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao salvar URL da gravação:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Fechar sala
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

    // Verificar se o usuário é o criador da sala
    const roomCheck = await query(
      'SELECT * FROM live_rooms WHERE id = $1',
      [roomId]
    );

    if (roomCheck.length === 0) {
      return Response.json({ error: 'Sala não encontrada' }, { status: 404 });
    }

    if (roomCheck[0].created_by !== session.user.id && session.user.role !== 'admin') {
      return Response.json(
        { error: 'Você não tem permissão para fechar esta sala' },
        { status: 401 }
      );
    }

    await query(
      `UPDATE live_rooms SET status = 'finished' WHERE id = $1`,
      [roomId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao fechar sala:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}