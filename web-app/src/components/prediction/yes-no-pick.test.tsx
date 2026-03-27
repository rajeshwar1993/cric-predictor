import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YesNoPick } from "./yes-no-pick";

describe("YesNoPick", () => {
  const defaultProps = {
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Yes and No buttons", () => {
    render(<YesNoPick {...defaultProps} />);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("calls onChange with 'Yes' when Yes is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YesNoPick {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText("Yes"));
    expect(onChange).toHaveBeenCalledWith("Yes");
  });

  it("calls onChange with 'No' when No is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YesNoPick {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText("No"));
    expect(onChange).toHaveBeenCalledWith("No");
  });

  it("visually marks the selected option", () => {
    render(<YesNoPick {...defaultProps} value="Yes" />);
    const yesBtn = screen.getByText("Yes");
    // Selected button gets inline style with color
    expect(yesBtn).toHaveStyle({ color: "var(--success)" });
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<YesNoPick {...defaultProps} onChange={onChange} disabled />);

    await user.click(screen.getByText("Yes"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables both buttons when disabled", () => {
    render(<YesNoPick {...defaultProps} disabled />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });
});
