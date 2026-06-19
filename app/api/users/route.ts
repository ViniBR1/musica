import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    console.log('📡 GET /api/users - Buscando usuários...');
    
    const session = await getServerSession();
    console.log('👤 Sessão completa:', JSON.stringify(session, null, 2));
    console.log('👤 Session user:', session?.user);
    console.log('👤 Role:', session?.user?.role);

    if (!session) {
      console.log('❌ Não autorizado - Sessão não encontrada');
      return Response.json({ error: 'Não autorizado - Sessão não encontrada' }, { status: 401 });
    }

    if (!session.user) {
      console.log('❌ Não autorizado - Usuário não encontrado na sessão');
      return Response.json({ error: 'Não autorizado - Usuário não encontrado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      console.log(`❌ Não autorizado - Role: ${session.user.role}`);
      return Response.json({ error: 'Não autorizado - Apenas administradores' }, { status: 401 });
    }

    const users = await query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );

    console.log(`✅ ${users.length} usuários encontrados`);
    
    return Response.json(users || []);
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}