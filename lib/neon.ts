import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada!');
  throw new Error('DATABASE_URL não definida');
}

console.log('✅ Conectando ao Neon...');

// AUMENTAR TIMEOUT para 60 segundos
const sql = neon(databaseUrl, {
  fetchOptions: {
    timeout: 60000, // 60 segundos
  },
});

export default sql;

export async function query(text: string, params?: any[]) {
  try {
    console.log('📡 Query:', text.substring(0, 100));
    const result = await sql(text, params);
    return result;
  } catch (error) {
    console.error('❌ Erro no banco:', error);
    throw error;
  }
}