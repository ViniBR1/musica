import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const instrumentId = searchParams.get('instrumentId');

    let sql = `
      SELECT 
        m.*,
        i.name as instrument_name,
        i.icon as instrument_icon,
        COUNT(l.id) as lessons_count
      FROM modules m
      LEFT JOIN instruments i ON m.instrument_id = i.id
      LEFT JOIN lessons l ON m.id = l.module_id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (teacherId) {
      conditions.push(` m.teacher_id = $${params.length + 1}`);
      params.push(teacherId);
    }

    if (instrumentId) {
      conditions.push(` m.instrument_id = $${params.length + 1}`);
      params.push(instrumentId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` GROUP BY m.id, i.name, i.icon ORDER BY m.created_at DESC`;

    console.log('📡 Buscando módulos...');
    const modules = await query(sql, params);
    console.log(`✅ ${modules.length} módulos encontrados`);

    const modulesWithLessons = await Promise.all(
      modules.map(async (module: any) => {
        const lessons = await query(
          `SELECT id, title, youtube_url, description, is_free_preview, order_number
           FROM lessons 
           WHERE module_id = $1 
           ORDER BY order_number`,
          [module.id]
        );
        return { ...module, lessons: lessons || [] };
      })
    );

    return Response.json(modulesWithLessons);
  } catch (error) {
    console.error('❌ Erro ao listar módulos:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('📡 Recebendo requisição para criar módulo...');

    const session = await getServerSession();

    if (!session || session.user.role !== 'teacher') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    console.log('📦 Dados recebidos:', JSON.stringify(data, null, 2));

    const { 
      title, 
      description, 
      price, 
      is_free, 
      free_lesson_url, 
      teacherId, 
      instrument_id,
      lessons: lessonsData,
      parent_id
    } = data;

    if (!title) {
      return Response.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    const teacher_id = teacherId || session.user.id;
    const modulePrice = parseFloat(price) || 0;

    const result = await query(
      `INSERT INTO modules (title, description, price, teacher_id, is_free, free_lesson_url, instrument_id, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, modulePrice, teacher_id, is_free || false, free_lesson_url || null, instrument_id || null, parent_id || null]
    );

    const newModule = result[0];
    console.log(`✅ Módulo criado com ID: ${newModule.id}`);

    const insertedLessons = [];
    if (lessonsData && lessonsData.length > 0) {
      console.log(`📹 Adicionando ${lessonsData.length} aulas...`);

      for (let i = 0; i < lessonsData.length; i++) {
        const lesson = lessonsData[i];
        const orderNumber = i + 1;

        const lessonResult = await query(
          `INSERT INTO lessons (module_id, title, youtube_url, description, is_free_preview, order_number)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            newModule.id,
            lesson.title,
            lesson.youtube_url,
            lesson.description || '',
            lesson.is_free_preview || false,
            orderNumber
          ]
        );
        insertedLessons.push(lessonResult[0]);
        console.log(`  ✅ Aula ${orderNumber}: ${lesson.title}`);
      }
    }

    const moduleLessons = await query(
      `SELECT id, title, youtube_url, description, is_free_preview, order_number
       FROM lessons 
       WHERE module_id = $1 
       ORDER BY order_number`,
      [newModule.id]
    );

    const instrument = await query(
      'SELECT name, icon FROM instruments WHERE id = $1',
      [newModule.instrument_id]
    );

    const completeModule = {
      ...newModule,
      lessons: moduleLessons || [],
      lessons_count: moduleLessons?.length || 0,
      instrument_name: instrument[0]?.name || null,
      instrument_icon: instrument[0]?.icon || null
    };

    console.log(`🎉 Módulo criado com ${insertedLessons.length} aulas`);
    return Response.json(completeModule, { status: 201 });

  } catch (error) {
    console.error('❌ Erro ao criar módulo:', error);
    return Response.json({ error: 'Erro interno', details: (error as Error).message }, { status: 500 });
  }
}