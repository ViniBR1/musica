import sql from '../lib/neon.js';
import bcrypt from 'bcryptjs';

async function fixUsers() {
  console.log('🔧 Corrigindo usuários e senhas...');

  try {
    // Verificar se os usuários existem
    const existingUsers = await sql('SELECT id, email, role FROM users');
    console.log('📊 Usuários existentes:', existingUsers);

    // Hash das senhas
    const adminHash = await bcrypt.hash('admin123', 10);
    const teacherHash = await bcrypt.hash('teacher123', 10);
    const studentHash = await bcrypt.hash('student123', 10);

    console.log('🔐 Hash gerado com sucesso');

    // Inserir ou atualizar usuários
    await sql`
      INSERT INTO users (email, password, name, role) 
      VALUES 
        ('admin@admin.com', ${adminHash}, 'Administrador', 'admin'),
        ('teacher@teacher.com', ${teacherHash}, 'Professor', 'teacher'),
        ('student@student.com', ${studentHash}, 'Aluno', 'student')
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
    `;

    console.log('✅ Usuários atualizados com sucesso!');

    // Mostrar todos os usuários
    const users = await sql('SELECT id, email, name, role FROM users');
    console.log('\n📋 Lista de usuários:');
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.role}) - ID: ${u.id}`);
    });

    console.log('\n📝 Credenciais de teste:');
    console.log('  👑 Admin:    admin@admin.com / admin123');
    console.log('  👨‍🏫 Professor: teacher@teacher.com / teacher123');
    console.log('  👨‍🎓 Aluno:    student@student.com / student123');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixUsers();