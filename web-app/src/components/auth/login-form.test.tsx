import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/login",
}));

const mockSignIn = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  signInWithMagicLink: (...args: any[]) => mockSignIn(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the email input and display name input", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<LoginForm />);
    expect(screen.getByText("Send Magic Link")).toBeInTheDocument();
  });

  it("calls signInWithMagicLink on form submit", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ success: true });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.click(screen.getByText("Send Magic Link"));

    expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "test", undefined);
  });

  it("shows 'Check your email' after successful submit", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ success: true });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.click(screen.getByText("Send Magic Link"));

    expect(screen.getByText("Check your email")).toBeInTheDocument();
  });

  it("disables the submit button when email is empty", () => {
    render(<LoginForm />);

    const submitButton = screen.getByText("Send Magic Link").closest("button")!;
    expect(submitButton).toHaveAttribute("data-disabled");
  });

  it("shows server error on failed submit", async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      success: false,
      error: "Rate limited",
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    await user.click(screen.getByText("Send Magic Link"));

    expect(screen.getByRole("alert")).toHaveTextContent("Rate limited");
  });
});
