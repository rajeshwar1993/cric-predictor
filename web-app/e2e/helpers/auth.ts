import type { Page } from "@playwright/test";
import { getAdminClient } from "./supabase-admin";
import { TEST_PASSWORD } from "../fixtures/test-users";

/**
 * Generate a valid Supabase session for a test user via password sign-in.
 * The user must have been created with createTestUser() first.
 */
export async function getSessionForUser(email: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`getSessionForUser(${email}): ${error.message}`);
  return data.session;
}

/**
 * Inject a Supabase auth session into a Playwright page's browser context.
 * Sets the auth cookie that the Next.js middleware expects.
 */
export async function loginAsBrowser(page: Page, email: string) {
  const session = await getSessionForUser(email);
  const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  // Supabase SSR @supabase/ssr stores session in chunked cookies:
  // sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, etc.
  // For a single token that fits in one chunk:
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: "bearer",
    user: session.user,
  });

  const domain = new URL(baseUrl).hostname;

  // Supabase SSR may chunk large cookies — use base64 encoding
  const encoded = Buffer.from(cookieValue).toString("base64");

  await page.context().addCookies([
    {
      name: `${cookieName}.0`,
      value: `base64-${encoded}`,
      domain,
      path: "/",
      httpOnly: false,
      secure: baseUrl.startsWith("https"),
      sameSite: "Lax",
    },
    // Set the onboarding cookie so middleware doesn't redirect
    {
      name: "bragg_onboarded",
      value: "1",
      domain,
      path: "/",
      httpOnly: true,
      secure: baseUrl.startsWith("https"),
      sameSite: "Lax",
    },
  ]);
}

/**
 * Login and navigate to a page in one step.
 */
export async function loginAndGoto(page: Page, email: string, path: string) {
  await loginAsBrowser(page, email);
  await page.goto(path);
}
