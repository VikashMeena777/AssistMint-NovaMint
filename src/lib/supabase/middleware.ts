import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Build a redirect response that carries over any cookies the Supabase
// client set during this request (e.g. refreshed auth tokens) — otherwise
// the refreshed session is lost on redirect
function redirectWithCookies(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes — redirect to login if not authenticated
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup');

  if ((isDashboardRoute || isOnboardingRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return redirectWithCookies(url, supabaseResponse);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return redirectWithCookies(url, supabaseResponse);
  }

  // For authenticated users hitting dashboard or onboarding,
  // check if they have a restaurant set up
  if (user && (isDashboardRoute || isOnboardingRoute)) {
    // limit(1).maybeSingle() — owners can own multiple restaurants
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    const hasRestaurant = !!restaurant;

    // No restaurant → force to onboarding (unless already there)
    if (!hasRestaurant && !isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return redirectWithCookies(url, supabaseResponse);
    }

    // Has restaurant → don't let them revisit onboarding
    if (hasRestaurant && isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}
