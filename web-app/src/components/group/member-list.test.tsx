import { render, screen } from "@testing-library/react";
import { MemberList } from "./member-list";
import { MOCK_MEMBERS } from "@/__mocks__/data";

describe("MemberList", () => {
  it("renders all members", () => {
    render(<MemberList members={MOCK_MEMBERS} />);

    expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Arjun Patel")).toBeInTheDocument();
    expect(screen.getByText("Sneha Iyer")).toBeInTheDocument();
  });

  it("renders role labels for each member", () => {
    render(<MemberList members={MOCK_MEMBERS} />);

    // The role appears both in the left side (lowercase) and the right badge (uppercase)
    // Find all occurrences of "owner"
    const ownerElements = screen.getAllByText("owner");
    expect(ownerElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the initial letter avatar", () => {
    render(<MemberList members={MOCK_MEMBERS} />);

    // First character of display_name, uppercased
    expect(screen.getByText("R")).toBeInTheDocument(); // Rajesh
    expect(screen.getByText("P")).toBeInTheDocument(); // Priya
    expect(screen.getByText("A")).toBeInTheDocument(); // Arjun
    expect(screen.getByText("S")).toBeInTheDocument(); // Sneha
  });

  it("renders 'Unknown' and '?' for a member without profile", () => {
    const memberWithoutProfile = {
      ...MOCK_MEMBERS[0],
      user_id: "user-orphan",
      profile: undefined,
    };
    render(<MemberList members={[memberWithoutProfile]} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
