import sql from './lib/neon.js';

async function checkUser() {
  try {
    const result = await sql('SELECT id, email, name, role FROM users WHERE email = $1', ['teacher@teacher.com']);
    console.log('📊 Usuário encontrado:', result);
    
    if (result.length === 0) {
      console.log('❌ Usuário não encontrado!');
      console.log('🔧 Rode: npm run setup-db');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkUser();