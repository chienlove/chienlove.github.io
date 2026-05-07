import { createBrowserClient, createServerClient } from '@supabase/ssr';

/**
 * Supabase client cho trình duyệt (client-side)
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Supabase client cho server-side (SSR)
 */
export const createSupabaseServer = (ctx) => {
  const cookie = ctx.req.headers.cookie ?? '';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          const match = cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
          return match ? decodeURIComponent(match[2]) : undefined;
        },
        set() {},
        remove() {},
      },
      headers: ctx.req.headers,
    }
  );
};