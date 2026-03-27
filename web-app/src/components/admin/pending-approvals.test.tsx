import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingApprovals } from "./pending-approvals";
import { MOCK_PENDING_REQUESTS } from "@/__mocks__/data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
}));

const mockManageMember = vi.fn();
vi.mock("@/lib/actions/groups", () => ({
  manageMember: (...args: any[]) => mockManageMember(...args),
}));

describe("PendingApprovals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManageMember.mockResolvedValue({ success: true });
  });

  it("renders pending request display names", () => {
    render(
      <PendingApprovals groupId="group-001" requests={MOCK_PENDING_REQUESTS} />
    );
    expect(screen.getByText("Vikram Singh")).toBeInTheDocument();
  });

  it("renders pending request email", () => {
    render(
      <PendingApprovals groupId="group-001" requests={MOCK_PENDING_REQUESTS} />
    );
    expect(screen.getByText("vikram@example.com")).toBeInTheDocument();
  });

  it("renders approve and reject buttons for each request", () => {
    render(
      <PendingApprovals groupId="group-001" requests={MOCK_PENDING_REQUESTS} />
    );
    const buttons = screen.getAllByRole("button");
    // Two buttons per request (approve + reject)
    expect(buttons).toHaveLength(2);
  });

  it("calls manageMember with 'approve' when approve is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PendingApprovals groupId="group-001" requests={MOCK_PENDING_REQUESTS} />
    );

    const buttons = screen.getAllByRole("button");
    // First button is approve (has success bg)
    await user.click(buttons[0]);

    expect(mockManageMember).toHaveBeenCalledWith(
      "group-001",
      "user-005",
      "approve"
    );
  });

  it("calls manageMember with 'reject' when reject is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PendingApprovals groupId="group-001" requests={MOCK_PENDING_REQUESTS} />
    );

    const buttons = screen.getAllByRole("button");
    // Second button is reject
    await user.click(buttons[1]);

    expect(mockManageMember).toHaveBeenCalledWith(
      "group-001",
      "user-005",
      "reject"
    );
  });
});
