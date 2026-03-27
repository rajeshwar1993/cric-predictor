import { render, screen } from "@testing-library/react";
import { InviteLink } from "./invite-link";

describe("InviteLink", () => {
  it("renders the 'Copy Invite Link' button text by default", () => {
    render(<InviteLink inviteCode="abc123" />);
    expect(screen.getByText("Copy Invite Link")).toBeInTheDocument();
  });

  it("renders a button element", () => {
    render(<InviteLink inviteCode="abc123" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
