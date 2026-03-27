import { renderHook, waitFor } from "@testing-library/react";
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  createMockQueryBuilder,
} from "@/test/helpers/mock-supabase";
import { MOCK_USER } from "@/__mocks__/data";

const mockBrowserClient = createMockSupabaseClient();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockBrowserClient),
}));

// Must import after mock is set up
import { useAuth } from "./use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to unauthenticated by default
    mockBrowserClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockBrowserClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("returns user and profile when authenticated", async () => {
    mockAuthenticatedUser(mockBrowserClient, MOCK_USER.id, MOCK_USER.email);
    mockBrowserClient.from = vi.fn(() =>
      createMockQueryBuilder([MOCK_USER])
    );

    const { result } = renderHook(() => useAuth());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({ id: MOCK_USER.id, email: MOCK_USER.email });
    expect(result.current.profile).toEqual(MOCK_USER);
  });

  it("returns null user and profile when unauthenticated", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("starts in a loading state", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it("unsubscribes from auth state changes on unmount", async () => {
    const unsubscribe = vi.fn();
    mockBrowserClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockBrowserClient.auth.onAuthStateChange).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
