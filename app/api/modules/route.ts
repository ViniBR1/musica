import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const instrumentId = searchParams.get('instrumentId');

    // Query SIMPLIFICADA - sem sub-módulos na primeira busca
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

    // Só buscar módulos PRINCIPAIS (parent_id IS NULL) para o dashboard
    conditions.push(` m.parent_id IS NULL`);

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` GROUP BY m.id, i.name, i.icon ORDER BY m.created_at DESC`;

    console.log('📡 Buscando módulos principais...');
    const modules = await query(sql, params);
    console.log(`✅ ${modules.length} módulos principais encontrados`);

    // Buscar sub-módulos separadamente para cada módulo principal
    const modulesWithSub = await Promise.all(
      modules.map(async (module: any) => {
        // Buscar aulas do módulo
        const lessons = await query(
          `SELECT id, title, youtube_url, description, is_free_preview, order_number
           FROM lessons 
           WHERE module_id = $1 
           ORDER BY order_number`,
          [module.id]
        );

        // Buscar SUB-MÓDULOS (apenas os que têm parent_id = module.id)
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
          [module.id]
        );

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

        return {
          ...module,
          lessons: lessons || [],
          lessons_count: lessons?.length || 0,
          sub_modules: subModulesWithLessons || [],
          teacher_name: teacher[0]?.name || 'Professor',
        };
      })
    );

    console.log(`📁 ${modulesWithSub.length} módulos com sub-módulos processados`);

    return Response.json(modulesWithSub);
  } catch (error) {
    console.error('❌ Erro ao listar módulos:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('📡 Criando módulo...');

    const session = await getServerSession();

    if (!session) {
      console.log('❌ Sessão não encontrada');
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!session.user) {
      console.log('❌ Usuário não encontrado na sessão');
      return Response.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    console.log('👤 Usuário logado:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    let userRole = session.user.role;
    let userId = session.user.id;

    if (!userRole || !userId) {
      console.log('⚠️ Role ou ID undefined, buscando no banco...');
      const userData = await query(
        'SELECT id, role FROM users WHERE email = $1',
        [session.user.email]
      );
      
      if (userData.length > 0) {
        userId = userData[0].id;
        userRole = userData[0].role;
        console.log('✅ Dados do banco:', { id: userId, role: userRole });
      } else {
        console.log('❌ Usuário não encontrado no banco');
        return Response.json({ error: 'Usuário não encontrado' }, { status: 401 });
      }
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      console.log(`❌ Role inválido: ${userRole}`);
      return Response.json(
        { error: `Apenas professores e administradores podem criar módulos. Seu role: ${userRole}` },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log('📦 Dados recebidos:', JSON.stringify(data, null, 2));

    const {
      title,
      description,
      price,
      is_free,
      free_lesson_url,
      instrument_id,
      lessons: lessonsData,
      parent_id,
      teacherId,
    } = data;

    if (!title) {
      return Response.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    if (!instrument_id) {
      return Response.json({ error: 'Selecione um instrumento' }, { status: 400 });
    }

    let teacher_id: string;

    if (userRole === 'admin') {
      if (!teacherId) {
        return Response.json(
          { error: 'Admin precisa selecionar um professor para criar o módulo' },
          { status: 400 }
        );
      }
      teacher_id = teacherId;
    } else {
      teacher_id = userId;
    }

    console.log(`👨‍🏫 Criando módulo para professor: ${teacher_id}`);
    console.log(`📁 Parent ID: ${parent_id || 'Nenhum (módulo principal)'}`);

    const modulePrice = parseFloat(price) || 0;

    const result = await query(
      `INSERT INTO modules (title, description, price, teacher_id, is_free, free_lesson_url, instrument_id, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description,
        modulePrice,
        teacher_id,
        is_free || false,
        free_lesson_url || null,
        instrument_id || null,
        parent_id || null,
      ]
    );

    const newModule = result[0];
    console.log(`✅ Módulo criado: ${newModule.id}`);
    console.log(`📁 Parent ID salvo: ${newModule.parent_id || 'Nenhum'}`);

    const insertedLessons = [];
    if (lessonsData && lessonsData.length > 0) {
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
            orderNumber,
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
      instrument_icon: instrument[0]?.icon || null,
    };

    console.log(`🎉 Módulo criado com ${insertedLessons.length} aulas`);
    return Response.json(completeModule, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar módulo:', error);
    return Response.json(
      { error: 'Erro interno', details: (error as Error).message },
      { status: 500 }
    );
  }
}