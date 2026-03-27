import { render, screen } from "@testing-library/react";
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  createMockQueryBuilder,
} from "@/test/helpers/mock-supabase";
import { MOCK_USER, MOCK_NOTIFICATIONS } from "@/__mocks__/data";

// Must set up mocks before importing the component
const mockBrowserClient = createMockSupabaseClient();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockBrowserClient),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/actions/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/actions/notifications", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { Header } from "./header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to unauthenticated
    mockBrowserClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockBrowserClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("renders the Bragg logo", () => {
    render(<Header />);
    expect(screen.getByText("Bragg")).toBeInTheDocument();
  });

  it("shows 'Sign In' link when logged out", async () => {
    render(<Header />);

    // Wait for loading to finish
    const signIn = await screen.findByText("Sign In");
    expect(signIn).toBeInTheDocument();
    expect(signIn.closest("a")).toHaveAttribute("href", "/login");
  });

  it("shows user menu when logged in", async () => {
    mockAuthenticatedUser(mockBrowserClient, MOCK_USER.id, MOCK_USER.email);
    mockBrowserClient.from = vi.fn(() => createMockQueryBuilder([MOCK_USER]));

    render(<Header />);

    // After loading, the notification bell should appear (which is an aria-labeled button)
    const bell = await screen.findByLabelText(/notifications/i);
    expect(bell).toBeInTheDocument();
  });

  it("links to /dashboard when user is logged in", async () => {
    mockAuthenticatedUser(mockBrowserClient, MOCK_USER.id, MOCK_USER.email);
    mockBrowserClient.from = vi.fn(() => createMockQueryBuilder([MOCK_USER]));

    render(<Header />);

    await screen.findByLabelText(/notifications/i);

    const logo = screen.getByText("Bragg").closest("a");
    expect(logo).toHaveAttribute("href", "/dashboard");
  });

  it("links to / when user is not logged in", async () => {
    render(<Header />);

    await screen.findByText("Sign In");

    const logo = screen.getByText("Bragg").closest("a");
    expect(logo).toHaveAttribute("href", "/");
  });
});
