import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { verifyCredentials } from '@/lib/auth';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await verifyCredentials(credentials.email, credentials.password);
          
          if (user) {
            console.log('✅ Login bem-sucedido:', {
              id: user.id,
              email: user.email,
              role: user.role,
            });
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
    
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await query('SELECT * FROM users WHERE email = $1', [user.email]);
          
          if (existingUser.length === 0) {
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
    
    async jwt({ token, user }) {
      console.log('🔐 JWT antes:', { id: token.id, role: token.role });
      
      if (user) {
        token.id = user.id;
        token.role = user.role || 'student';
        token.email = user.email;
        token.name = user.name;
      }
      
      console.log('🔐 JWT depois:', { id: token.id, role: token.role });
      return token;
    },
    
    async session({ session, token }) {
      console.log('📝 Session antes:', { 
        id: session.user?.id, 
        role: session.user?.role 
      });
      
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      
      console.log('📝 Session depois:', { 
        id: session.user?.id, 
        role: session.user?.role 
      });
      
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Ativar debug para ver o que está acontecendo
});

export { handler as GET, handler as POST };