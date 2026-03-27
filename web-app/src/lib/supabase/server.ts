import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureServerTransport } from "@/lib/posthog/register-server-transport";

ensureServerTransport();

// TODO: Add Database generic once types are generated from running Supabase local
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — ignore.
            // Proxy will refresh the session on the next request.
          }
        },
      },
    }
  );
}
