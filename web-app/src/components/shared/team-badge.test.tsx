import { render, screen } from "@testing-library/react";
import { TeamBadge } from "./team-badge";

describe("TeamBadge", () => {
  it("renders the team code", () => {
    render(<TeamBadge teamCode="CSK" />);
    expect(screen.getByText("CSK")).toBeInTheDocument();
  });

  it("applies the correct team color as background", () => {
    render(<TeamBadge teamCode="CSK" />);
    const badge = screen.getByText("CSK");
    expect(badge).toHaveStyle({ backgroundColor: "#F9CD05" });
  });

  it("uses a fallback color for an unknown team code", () => {
    render(<TeamBadge teamCode="UNKNOWN" />);
    const badge = screen.getByText("UNKNOWN");
    expect(badge).toHaveStyle({ backgroundColor: "#64748B" });
  });

  it("renders the team name as a title attribute", () => {
    render(<TeamBadge teamCode="MI" />);
    expect(screen.getByTitle("Mumbai Indians")).toBeInTheDocument();
  });

  it("renders with the default md size class", () => {
    render(<TeamBadge teamCode="RCB" />);
    const badge = screen.getByText("RCB");
    expect(badge.className).toContain("h-11");
  });

  it("renders with the sm size class", () => {
    render(<TeamBadge teamCode="RCB" size="sm" />);
    const badge = screen.getByText("RCB");
    expect(badge.className).toContain("h-8");
  });

  it("renders with the lg size class", () => {
    render(<TeamBadge teamCode="RCB" size="lg" />);
    const badge = screen.getByText("RCB");
    expect(badge.className).toContain("h-14");
  });
});
