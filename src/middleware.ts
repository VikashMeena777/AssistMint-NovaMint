import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Auth session handling ONLY where it's needed. Marketing pages, public
  // business pages, and API routes are served without the middleware (and
  // its Supabase getUser round trip) — this keeps static pages instant.
  // Dashboard/onboarding need the session check; login/signup need the
  // signed-in redirect.
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/login',
    '/signup',
  ],
};
