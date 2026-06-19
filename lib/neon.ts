import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada!');
  throw new Error('DATABASE_URL não definida');
}

console.log('✅ Conectando ao Neon...');
const sql = neon(databaseUrl, {
  fetchOptions: {
    timeout: 30000,
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