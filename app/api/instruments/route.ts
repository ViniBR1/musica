import { query } from '@/lib/neon';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    const instruments = await query(
      'SELECT * FROM instruments ORDER BY name'
    );
    return Response.json(instruments);
  } catch (error) {
    console.error('❌ Erro ao listar instrumentos:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { name, icon, description } = data;

    if (!name) {
      return Response.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO instruments (name, icon, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, icon || '🎵', description || '']
    );

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar instrumento:', error);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}