import { render, screen } from "@testing-library/react";
import { InviteLink } from "./invite-link";

describe("InviteLink", () => {
  it("renders the 'Share Invite' button text by default", () => {
    render(<InviteLink inviteCode="abc123" />);
    expect(screen.getByText("Share Invite")).toBeInTheDocument();
  });

  it("renders a button element", () => {
    render(<InviteLink inviteCode="abc123" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
