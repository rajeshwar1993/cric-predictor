import { MOCK_NOTIFICATIONS } from "../data/notifications";
import { MOCK_USER } from "../data/profiles";

// Configurable mock state
let _mockConfig = {
  user: { id: MOCK_USER.id, email: MOCK_USER.email } as { id: string; email: string } | null,
  notifications: MOCK_NOTIFICATIONS as any[],
  scenarios: [] as any[],
  predictions: [] as any[],
  profile: MOCK_USER as any,
};

export function configureMockSupabase(config: Partial<typeof _mockConfig>) {
  _mockConfig = { ..._mockConfig, ...config };
}

function createQueryBuilder(table: string) {
  let result: any[] = [];

  if (table === "notifications") result = [..._mockConfig.notifications];
  else if (table === "scenarios") result = [..._mockConfig.scenarios];
  else if (table === "predictions") result = [..._mockConfig.predictions];
  else if (table === "profiles") result = _mockConfig.profile ? [_mockConfig.profile] : [];

  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => {
      result = result.filter((r) => r[col] === val);
      return builder;
    },
    neq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: (n: number) => { result = result.slice(0, n); return builder; },
    single: () => Promise.resolve({ data: result[0] || null, error: null }),
    then: (resolve: any) => resolve({ data: result, error: null }),
  };

  // Make builder thenable
  builder[Symbol.for("nodejs.util.promisify.custom")] = () =>
    Promise.resolve({ data: result, error: null });

  return builder;
}

export function createClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: _mockConfig.user },
        error: null,
      }),
      onAuthStateChange: (_event: string, _callback: any) => ({
        data: {
          subscription: { unsubscribe: () => {} },
        },
      }),
    },
    from: (table: string) => createQueryBuilder(table),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  };
}
