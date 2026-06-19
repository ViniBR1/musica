import { query } from './neon';
import bcrypt from 'bcryptjs';
import type { User } from '../types/index.js';

export async function verifyCredentials(
  email: string,
  password: string
): Promise<Omit<User, 'created_at'> | null> {
  try {
    console.log('🔍 Verificando credenciais para:', email);
    
    const result = await query(
      'SELECT id, email, name, role, password FROM users WHERE email = $1',
      [email]
    );

    console.log('📊 Resultado da query:', result.length > 0 ? 'Usuário encontrado' : 'Usuário NÃO encontrado');

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    console.log('👤 Usuário encontrado:', { 
      email: user.email, 
      role: user.role,
      name: user.name 
    });
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Senha válida?', isValid);

    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return null;
  }
}