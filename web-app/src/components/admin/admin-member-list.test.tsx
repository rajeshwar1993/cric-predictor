import { render, screen } from "@testing-library/react";
import { AdminMemberList } from "./admin-member-list";
import { MOCK_MEMBERS } from "@/__mocks__/data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
}));

vi.mock("@/lib/actions/groups", () => ({
  manageMember: vi.fn().mockResolvedValue({ success: true }),
}));

describe("AdminMemberList", () => {
  it("renders all member names", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Arjun Patel")).toBeInTheDocument();
    expect(screen.getByText("Sneha Iyer")).toBeInTheDocument();
  });

  it("marks the current user (self) with '(you)'", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("owner sees Promote button for regular members", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    // user-003 and user-004 are members, so Promote should appear for them
    const promoteButtons = screen.getAllByText("Promote");
    expect(promoteButtons.length).toBe(2);
  });

  it("owner sees Demote button for admins", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    // user-002 is admin, so Demote should appear
    expect(screen.getByText("Demote")).toBeInTheDocument();
  });

  it("owner sees Remove button for non-owner, non-self members", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    // 3 members can be removed (user-002 admin, user-003 member, user-004 member)
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons.length).toBe(3);
  });

  it("does not show action buttons for self (owner)", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="owner"
        callerId="user-001"
      />
    );

    // The owner row should have no Promote/Demote/Remove — just the "(you)" marker
    // Total buttons: Demote(1) + Promote(2) + Remove(3) = 6 for others
    const allButtons = screen.getAllByRole("button");
    expect(allButtons).toHaveLength(6);
  });

  it("admin caller does not see Promote/Demote buttons", () => {
    render(
      <AdminMemberList
        groupId="group-001"
        members={MOCK_MEMBERS}
        callerRole="admin"
        callerId="user-002"
      />
    );

    // Admin cannot promote or demote
    expect(screen.queryByText("Promote")).not.toBeInTheDocument();
    expect(screen.queryByText("Demote")).not.toBeInTheDocument();
  });
});
