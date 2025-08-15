// src/middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types';

const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
const protectedRoutes = ['/admin', '/dashboard', '/api/user'];
const roleRoutes = ['superadmin', 'admin', 'hr', 'employee', 'client'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthRoute = authRoutes.some(route => path.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  // Skip middleware for public API routes
  if (path.startsWith('/api') && !isProtectedRoute) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Redirect authenticated users away from auth routes to their role-specific dashboard
  if (isAuthRoute && token) {
    const role = token.role as UserRole || 'employee';
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
  }

  // Protect routes that require authentication
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Role-based route protection
  if (token && path.startsWith('/dashboard')) {
    const pathRole = path.split('/')[2];
    const userRole = token.role as UserRole;

    // If trying to access a role-specific dashboard
    if (pathRole && roleRoutes.includes(pathRole)) {
      // Redirect to their own dashboard if trying to access another role's dashboard
      if (pathRole !== userRole) {
        return NextResponse.redirect(new URL(`/dashboard/${userRole}`, request.url));
      }
    }
    // If accessing just /dashboard, redirect to their role dashboard
    else if (!pathRole) {
      return NextResponse.redirect(new URL(`/dashboard/${userRole}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/api/user/:path*',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password'
  ],
};