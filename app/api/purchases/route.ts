import { query } from '@/lib/neon';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    console.log('📡 Buscando compras do aluno:', studentId);

    if (!studentId) {
      return Response.json({ error: 'ID do aluno não fornecido' }, { status: 400 });
    }

    // Query SIMPLIFICADA e CORRIGIDA - sem GROUP BY problemático
    const purchases = await query(
      `SELECT 
        m.id,
        m.title,
        m.description,
        m.price,
        m.teacher_id,
        m.is_free,
        m.free_lesson_url,
        m.created_at,
        p.created_at as purchase_date,
        p.status as purchase_status
       FROM purchases p 
       JOIN modules m ON p.module_id = m.id 
       WHERE p.student_id = $1 AND p.status = 'approved'
       ORDER BY p.created_at DESC`,
      [studentId]
    );

    console.log(`✅ ${purchases.length} compras aprovadas encontradas`);

    // Buscar as aulas separadamente para cada módulo
    const purchasesWithLessons = await Promise.all(
      purchases.map(async (purchase: any) => {
        const lessons = await query(
          `SELECT id, title, youtube_url, description, is_free_preview, order_number
           FROM lessons 
           WHERE module_id = $1 
           ORDER BY order_number`,
          [purchase.id]
        );
        return { ...purchase, lessons: lessons || [] };
      })
    );

    console.log(`✅ ${purchasesWithLessons.length} compras com aulas carregadas`);
    return Response.json(purchasesWithLessons);
  } catch (error) {
    console.error('❌ Erro ao listar compras:', error);
    return Response.json({ error: 'Erro interno', details: (error as Error).message }, { status: 500 });
  }
}