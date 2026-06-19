import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    console.log('📡 Criando novo professor...');

    const session = await getServerSession();

    if (!session) {
      console.log('❌ Sessão não encontrada');
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      console.log(`❌ Usuário não é admin: ${session.user.role}`);
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    console.log('📦 Dados recebidos:', data);

    const { name, email, password, role } = data;

    if (!name || !email || !password) {
      return Response.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      return Response.json({ error: 'Este email já está em uso' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role || 'teacher']
    );

    console.log(`✅ Professor criado: ${result[0].email}`);
    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar professor:', error);
    return Response.json({ error: 'Erro interno', details: (error as Error).message }, { status: 500 });
  }
}