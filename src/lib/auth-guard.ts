/**
 * Authentication Guard Middleware
 * 
 * Use this in API routes to ensure only authenticated and whitelisted users
 * can access write operations to Storyblok.
 * 
 * Usage:
 * 
 * export async function POST(request: Request) {
 *   try {
 *     await requireAuth()
 *   } catch (error) {
 *     return NextResponse.json({ error: error.message }, { status: 401 })
 *   }
 *   // ... proceed with authenticated logic
 * }
 */

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ADMIN_WHITELIST = (process.env.ADMIN_WHITELIST || '').split(',').map(e => e.trim())

/**
 * Require authentication and whitelist check
 * Throws error if not authenticated or not whitelisted
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('Unauthorized: No session found')
  }
  
  if (!session.user.email) {
    throw new Error('Unauthorized: No email in session')
  }
  
  if (!ADMIN_WHITELIST.includes(session.user.email)) {
    throw new Error(`Forbidden: Email ${session.user.email} is not whitelisted`)
  }
  
  return session
}

/**
 * Check if current user is authenticated (without throwing)
 * Returns session or null
 */
export async function getAuthSession() {
  try {
    return await getServerSession(authOptions)
  } catch {
    return null
  }
}

/**
 * Check if an email is whitelisted
 */
export function isEmailWhitelisted(email: string): boolean {
  return ADMIN_WHITELIST.includes(email)
}
