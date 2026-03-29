/**
 * PII sanitization utilities for analytics and logging.
 *
 * Strips known personally identifiable information fields from
 * event properties and log metadata. Supabase UUIDs (userId, group_id,
 * match_id) are NOT PII -- they are opaque identifiers.
 */

const PII_FIELDS = new Set([
  "email",
  "display_name",
  "displayName",
  "date_of_birth",
  "dateOfBirth",
  "phone",
  "ip",
  "ip_address",
  "user_agent",
  "user_agent_full",
]);

/**
 * Strips known PII fields from a properties object.
 * Returns a new object -- does not mutate the input.
 */
export function sanitizeProperties<T extends Record<string, unknown>>(
  properties: T
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!PII_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

/**
 * Hash a string identifier using SHA-256.
 * Used for pre-auth events where we need a consistent but opaque identifier
 * (e.g., hashing an email before the user has a Supabase user.id).
 *
 * `crypto.subtle` is available in both Node.js 18+ and all modern browsers.
 */
export async function hashIdentifier(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
