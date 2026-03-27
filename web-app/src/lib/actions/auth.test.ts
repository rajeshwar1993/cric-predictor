import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
} from "@/test/helpers/mock-supabase";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: any[]) => mockRedirect(...args),
}));

import { signInWithMagicLink, signOut } from "./auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.auth.signInWithOtp.mockResolvedValue({ error: null });
  mockClient.auth.signOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// signInWithMagicLink
// ---------------------------------------------------------------------------
describe("signInWithMagicLink", () => {
  it("returns error for empty email", async () => {
    const result = await signInWithMagicLink("", "Test User");
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
    expect(mockClient.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns error for email without @", async () => {
    const result = await signInWithMagicLink("notanemail", "Test User");
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
  });

  it("returns error for email longer than 254 chars", async () => {
    const longEmail = "a".repeat(246) + "@test.com"; // 255 chars total
    const result = await signInWithMagicLink(longEmail, "Test User");
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
  });

  it("sends magic link with valid email and display name", async () => {
    const result = await signInWithMagicLink("test@example.com", "Test User");
    expect(result).toEqual({ success: true });
    expect(mockClient.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        options: expect.objectContaining({
          data: { display_name: "Test User" },
        }),
      })
    );
  });

  it("truncates display name to 30 chars", async () => {
    const longName = "A".repeat(50);
    await signInWithMagicLink("test@example.com", longName);
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.data.display_name).toHaveLength(30);
  });

  it("uses email prefix when display name is empty", async () => {
    await signInWithMagicLink("test@example.com", "");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.data.display_name).toBe("test");
  });

  it("sanitizes safe redirect path", async () => {
    await signInWithMagicLink("test@example.com", "User", "/dashboard");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).toContain(
      encodeURIComponent("/dashboard")
    );
  });

  it("strips protocol-relative URL redirect (//evil.com)", async () => {
    await signInWithMagicLink("test@example.com", "User", "//evil.com");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).not.toContain("evil.com");
  });

  it("strips absolute URL redirect", async () => {
    await signInWithMagicLink("test@example.com", "User", "https://evil.com");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).not.toContain("evil.com");
  });

  it("maps known rate limit error", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: { message: "Email rate limit exceeded" },
    });

    const result = await signInWithMagicLink("test@example.com", "User");
    expect(result).toEqual({
      success: false,
      error: "Too many requests. Please wait a moment and try again.",
    });
  });

  it("maps known 60-second cooldown error", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: {
        message:
          "For security purposes, you can only request this once every 60 seconds",
      },
    });

    const result = await signInWithMagicLink("test@example.com", "User");
    expect(result).toEqual({
      success: false,
      error: "Please wait 60 seconds before requesting another link.",
    });
  });

  it("returns generic error for unknown errors", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: { message: "Some random internal error" },
    });

    const result = await signInWithMagicLink("test@example.com", "User");
    expect(result).toEqual({
      success: false,
      error: "Unable to send magic link. Please try again.",
    });
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
describe("signOut", () => {
  it("calls supabase signOut and redirects to /", async () => {
    await signOut();
    expect(mockClient.auth.signOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
