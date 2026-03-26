import { vi } from "vitest";

/**
 * Create a chainable Supabase query builder mock.
 * All methods return `this` for chaining, except terminal methods
 * (single, then) which resolve with the configured data.
 */
export function createMockQueryBuilder(
  resolvedData: any[] = [],
  resolvedError: any = null
) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: resolvedData?.[0] ?? null,
      error: resolvedError,
    }),
    // Make the builder awaitable for non-single queries
    then: (resolve: any) =>
      resolve({ data: resolvedData, error: resolvedError }),
  };
  return builder;
}

/**
 * Create a full Supabase client mock with configurable overrides.
 */
export function createMockSupabaseClient(overrides?: {
  from?: (table: string) => any;
  auth?: any;
  rpc?: any;
  channel?: any;
}) {
  return {
    auth: overrides?.auth ?? {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: overrides?.from ?? vi.fn(() => createMockQueryBuilder()),
    rpc: overrides?.rpc ?? vi.fn().mockResolvedValue({ error: null }),
    channel: overrides?.channel ??
      vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })),
    removeChannel: vi.fn(),
  };
}

/**
 * Helper to set up an authenticated user on a mock client.
 */
export function mockAuthenticatedUser(
  client: any,
  userId: string,
  email = "test@example.com"
) {
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email } },
    error: null,
  });
}

/**
 * Helper to set up an unauthenticated state on a mock client.
 */
export function mockUnauthenticated(client: any) {
  client.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}
