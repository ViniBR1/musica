import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { verifyCredentials } from '@/lib/auth';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    // Provider de Credenciais (email/senha)
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔑 Tentando login com:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await verifyCredentials(credentials.email, credentials.password);
          
          if (user) {
            console.log('✅ Login bem-sucedido:', user.email, 'Role:', user.role);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        } catch (error) {
          console.error('❌ Erro no authorize:', error);
        }

        return null;
      },
    }),
    
    // Provider do Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn - Usuário:', user.email, 'Conta:', account?.provider);
      
      if (account?.provider === 'google') {
        try {
          // Verificar se o usuário já existe
          const existingUser = await query('SELECT * FROM users WHERE email = $1', [user.email]);
          
          if (existingUser.length === 0) {
            // Criar novo usuário se não existir
            console.log('👤 Criando novo usuário do Google:', user.email);
            
            const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
            const result = await query(
              `INSERT INTO users (email, password, name, role, created_at)
               VALUES ($1, $2, $3, 'student', NOW())
               RETURNING id, email, name, role`,
              [user.email, randomPassword, user.name || user.email?.split('@')[0] || 'Aluno']
            );
            
            user.id = result[0].id;
            user.role = 'student';
            user.name = result[0].name;
          } else {
            // Usuário já existe
            console.log('✅ Usuário já existe:', user.email);
            user.id = existingUser[0].id;
            user.role = existingUser[0].role || 'student';
            user.name = existingUser[0].name;
          }
          
          return true;
        } catch (error) {
          console.error('❌ Erro ao processar login Google:', error);
          return false;
        }
      }
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      console.log('🔐 JWT ANTES:', { id: token.id, role: token.role });
      
      if (user) {
        token.id = user.id;
        token.role = user.role || 'student';
        token.email = user.email;
        token.name = user.name;
      }
      
      console.log('🔐 JWT DEPOIS:', { id: token.id, role: token.role });
      return token;
    },
    
    async session({ session, token }) {
      console.log('📝 Session ANTES:', { 
        id: session.user?.id, 
        role: session.user?.role,
        sessionUser: session.user 
      });
      
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      
      console.log('📝 Session DEPOIS:', { 
        id: session.user?.id, 
        role: session.user?.role,
        sessionUser: session.user 
      });
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };