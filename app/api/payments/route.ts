import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  try {
    console.log('📡 Processando pagamento...');
    
    const session = await getServerSession();

    if (!session) {
      console.log('❌ Sessão não encontrada');
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('👤 Usuário:', session.user.email, 'ID:', session.user.id);

    const data = await request.json();
    console.log('📦 Dados recebidos:', data);
    
    const { moduleId, studentId } = data;
    const userId = studentId || session.user.id;

    const moduleCheck = await query('SELECT * FROM modules WHERE id = $1', [moduleId]);
    if (moduleCheck.length === 0) {
      console.log('❌ Módulo não encontrado:', moduleId);
      return Response.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }
    console.log('✅ Módulo encontrado:', moduleCheck[0].title);

    const existingPurchase = await query(
      'SELECT * FROM purchases WHERE student_id = $1 AND module_id = $2 AND status = $3',
      [userId, moduleId, 'approved']
    );

    if (existingPurchase.length > 0) {
      console.log('⚠️ Aluno já comprou este módulo');
      return Response.json({ 
        success: true, 
        message: 'Você já possui este curso!',
        alreadyPurchased: true
      });
    }

    const paymentId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await query(
      `INSERT INTO purchases (student_id, module_id, payment_id, status, created_at)
       VALUES ($1, $2, $3, 'approved', NOW())
       RETURNING *`,
      [userId, moduleId, paymentId]
    );

    console.log('✅ Compra registrada com sucesso!', result[0]);

    const verifyPurchase = await query(
      'SELECT * FROM purchases WHERE student_id = $1 AND module_id = $2',
      [userId, moduleId]
    );
    console.log('🔍 Verificação da compra:', verifyPurchase);

    return Response.json({
      success: true,
      message: '✅ Compra realizada com sucesso!',
      purchase: result[0]
    });

  } catch (error) {
    console.error('❌ Erro no pagamento:', error);
    return Response.json({ 
      error: 'Erro interno', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}