import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Admin whitelist - only these emails can access the app
const ADMIN_WHITELIST = (process.env.ADMIN_WHITELIST || '').split(',').map(e => e.trim())

if (ADMIN_WHITELIST.length === 0) {
  console.warn('⚠️  ADMIN_WHITELIST is not configured. No users will be able to log in.')
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        console.log('Sign-in denied: No email provided')
        return false
      }
      if (!ADMIN_WHITELIST.includes(user.email)) {
        console.log(`Sign-in denied: Email ${user.email} not in whitelist`)
        return false
      }
      console.log(`Sign-in successful: ${user.email}`)
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
