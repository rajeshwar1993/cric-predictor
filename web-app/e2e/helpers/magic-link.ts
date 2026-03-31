import { getAdminClient } from "./supabase-admin";

/**
 * Generate a magic link URL for a test user via the Supabase admin API.
 *
 * The admin `generateLink` call produces an action_link that points to the
 * Supabase auth server. When the browser navigates to it, Supabase verifies
 * the token and redirects to the app's `/auth/callback` route with a `code`
 * query parameter (PKCE flow). The callback route calls
 * `exchangeCodeForSession` to complete the login.
 *
 * For e2e tests the simplest approach is to return the raw action_link and
 * let the browser follow the redirect chain naturally — exactly as a real
 * user would experience it.
 */
export async function generateMagicLink(email: string): Promise<string> {
  const sb = getAdminClient();
  const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";

  const { data, error } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(`generateMagicLink(${email}): ${error.message}`);
  }

  // The action_link points to the Supabase auth server.
  // Navigating to it triggers the full PKCE redirect flow:
  //   action_link -> Supabase verifies token -> redirects to /auth/callback?code=...
  return data.properties.action_link;
}
