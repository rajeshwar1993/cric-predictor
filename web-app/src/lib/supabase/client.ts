import { createBrowserClient } from "@supabase/ssr";

// TODO: Add Database generic once types are generated from running Supabase local:
// npx supabase gen types typescript --local > src/types/database.generated.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
