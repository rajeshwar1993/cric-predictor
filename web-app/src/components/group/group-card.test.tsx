import { render, screen } from "@testing-library/react";
import { GroupCard } from "./group-card";
import { MOCK_GROUP_OWNER, MOCK_GROUP_ADMIN, MOCK_GROUP_MEMBER } from "@/__mocks__/data";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("GroupCard", () => {
  it("renders the group name", () => {
    render(<GroupCard group={MOCK_GROUP_OWNER} />);
    expect(screen.getByText("Office Cricket Gang")).toBeInTheDocument();
  });

  it("renders the member count", () => {
    render(<GroupCard group={MOCK_GROUP_OWNER} />);
    expect(screen.getByText("8 members")).toBeInTheDocument();
  });

  it("renders singular 'member' for count of 1", () => {
    const singleMemberGroup = { ...MOCK_GROUP_MEMBER, member_count: 1 };
    render(<GroupCard group={singleMemberGroup} />);
    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it("renders the Owner role badge", () => {
    render(<GroupCard group={MOCK_GROUP_OWNER} />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders the Admin role badge", () => {
    render(<GroupCard group={MOCK_GROUP_ADMIN} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders the Member role badge", () => {
    render(<GroupCard group={MOCK_GROUP_MEMBER} />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("links to the group page", () => {
    render(<GroupCard group={MOCK_GROUP_OWNER} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/group/group-001");
  });
});
