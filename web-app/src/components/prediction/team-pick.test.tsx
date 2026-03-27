import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamPick } from "./team-pick";

describe("TeamPick", () => {
  const defaultProps = {
    teamA: "CSK",
    teamB: "MI",
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both team buttons", () => {
    render(<TeamPick {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    // Each team code appears twice (TeamBadge + span label)
    expect(screen.getAllByText("CSK")).toHaveLength(2);
    expect(screen.getAllByText("MI")).toHaveLength(2);
  });

  it("calls onChange when a team is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TeamPick {...defaultProps} onChange={onChange} />);

    // The button text contains team code — click the first button (CSK)
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(onChange).toHaveBeenCalledWith("CSK");
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TeamPick {...defaultProps} onChange={onChange} disabled />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("visually marks the selected team", () => {
    render(<TeamPick {...defaultProps} value="CSK" />);
    const buttons = screen.getAllByRole("button");
    // The selected button gets inline style with borderColor
    expect(buttons[0]).toHaveStyle({ borderColor: expect.any(String) });
  });

  it("applies disabled styling", () => {
    render(<TeamPick {...defaultProps} disabled />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });
});
