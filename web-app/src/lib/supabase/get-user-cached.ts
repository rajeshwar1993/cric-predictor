import { cache } from "react";
import { createClient } from "./server";

/**
 * Cached version of supabase.auth.getUser().
 * React.cache() deduplicates within a single server request —
 * even if layout.tsx and page.tsx both call this, the Supabase Auth
 * round-trip only happens once.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
