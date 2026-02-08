import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/posts', '/import', '/settings', '/api/posts', '/api/publishing', '/api/import', '/api/ai']

// Public routes that don't require auth
const publicRoutes = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (isProtectedRoute) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || !token.email) {
      // Redirect to login for non-API routes
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
      }
      
      // Return 401 for API routes
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check whitelist
    const whitelist = (process.env.ADMIN_WHITELIST || '').split(',').map(e => e.trim())
    if (!whitelist.includes(token.email as string)) {
      // Forbidden
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(loginUrl)
      }
      
      return NextResponse.json({ error: 'Forbidden: Email not whitelisted' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
