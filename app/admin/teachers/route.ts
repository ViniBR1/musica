import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { name, email, password, role } = data;

    if (!name || !email || !password) {
      return Response.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    // Verificar se email já existe
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      return Response.json({ error: 'Este email já está em uso' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email, hashedPassword, name, role || 'teacher']
    );

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar professor:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}