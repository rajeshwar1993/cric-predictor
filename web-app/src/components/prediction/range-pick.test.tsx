import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RangePick } from "./range-pick";

describe("RangePick", () => {
  const options = ["<150", "150-169", "170-189", "190+"];
  const defaultProps = {
    options,
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all options as buttons", () => {
    render(<RangePick {...defaultProps} />);
    for (const option of options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
  });

  it("calls onChange with the option when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangePick {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText("170-189"));
    expect(onChange).toHaveBeenCalledWith("170-189");
  });

  it("highlights the selected option", () => {
    render(<RangePick {...defaultProps} value="170-189" />);
    const selected = screen.getByText("170-189");
    expect(selected.className).toContain("border-[var(--cyan)]");
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangePick {...defaultProps} onChange={onChange} disabled />);

    await user.click(screen.getByText("<150"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables all buttons when disabled prop is set", () => {
    render(<RangePick {...defaultProps} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
