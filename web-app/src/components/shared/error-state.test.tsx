import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  it("renders the default error message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a custom error message", () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders the Oops! heading", () => {
    render(<ErrorState />);
    expect(screen.getByText("Oops!")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("renders a retry button and calls onRetry on click", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    const button = screen.getByText("Try Again");
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
