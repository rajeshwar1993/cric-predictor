import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JoinGroupForm } from "./join-group-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

const mockJoinGroup = vi.fn();
vi.mock("@/lib/actions/groups", () => ({
  joinGroup: (...args: any[]) => mockJoinGroup(...args),
}));

describe("JoinGroupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invite code input", () => {
    render(<JoinGroupForm />);
    expect(screen.getByPlaceholderText("Paste invite code")).toBeInTheDocument();
  });

  it("calls joinGroup on form submit", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({ success: true });

    render(<JoinGroupForm />);

    await user.type(screen.getByPlaceholderText("Paste invite code"), "abc123");
    // Click the submit button
    const submitBtn = screen.getByRole("button");
    await user.click(submitBtn);

    expect(mockJoinGroup).toHaveBeenCalledWith("abc123");
  });

  it("shows success message after join request", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({ success: true });

    render(<JoinGroupForm />);

    await user.type(screen.getByPlaceholderText("Paste invite code"), "abc123");
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("You're in the queue!")).toBeInTheDocument();
    expect(screen.getByText("Admin will let you in shortly.")).toBeInTheDocument();
  });

  it("shows an error on failed submit", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({
      success: false,
      error: "Invalid code",
    });

    render(<JoinGroupForm />);

    await user.type(screen.getByPlaceholderText("Paste invite code"), "badcode");
    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid code");
  });
});
