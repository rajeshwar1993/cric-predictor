import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGroupForm } from "./create-group-form";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

const mockCreateGroup = vi.fn();
vi.mock("@/lib/actions/groups", () => ({
  createGroup: (...args: any[]) => mockCreateGroup(...args),
}));

describe("CreateGroupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the group name input and submit button", () => {
    render(<CreateGroupForm />);
    expect(screen.getByLabelText(/squad name/i)).toBeInTheDocument();
    expect(screen.getByText("Create Squad")).toBeInTheDocument();
  });

  it("calls createGroup on form submit", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({
      success: true,
      data: { id: "group-new" },
    });

    render(<CreateGroupForm />);

    await user.type(
      screen.getByLabelText(/squad name/i),
      "Test Group"
    );
    await user.click(screen.getByText("Create Squad"));

    expect(mockCreateGroup).toHaveBeenCalledWith("Test Group");
  });

  it("navigates to the group page on success", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({
      success: true,
      data: { id: "group-new" },
    });

    render(<CreateGroupForm />);

    await user.type(
      screen.getByLabelText(/squad name/i),
      "Test Group"
    );
    await user.click(screen.getByText("Create Squad"));

    expect(mockPush).toHaveBeenCalledWith("/group/group-new");
  });

  it("shows an error on failed submit", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({
      success: false,
      error: "Group limit reached",
    });

    render(<CreateGroupForm />);

    await user.type(
      screen.getByLabelText(/squad name/i),
      "Test Group"
    );
    await user.click(screen.getByText("Create Squad"));

    expect(screen.getByRole("alert")).toHaveTextContent("Group limit reached");
  });
});
