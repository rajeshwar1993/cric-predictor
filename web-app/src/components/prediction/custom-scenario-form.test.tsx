import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomScenarioForm } from "./custom-scenario-form";

vi.mock("@/lib/actions/scenarios", () => ({
  createCustomScenario: vi.fn().mockResolvedValue({ success: true }),
}));

describe("CustomScenarioForm", () => {
  it("renders the collapsed 'Propose a Scenario' button by default", () => {
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);
    expect(screen.getByText("Propose a Scenario")).toBeInTheDocument();
  });

  it("does not render the form fields in collapsed state", () => {
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);
    expect(screen.queryByText("Question")).not.toBeInTheDocument();
  });

  it("expands the form when the button is clicked", async () => {
    const user = userEvent.setup();
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);

    await user.click(screen.getByText("Propose a Scenario"));

    expect(screen.getByText("Question")).toBeInTheDocument();
    expect(screen.getByText("Submit for Approval")).toBeInTheDocument();
  });

  it("renders option inputs when expanded", async () => {
    const user = userEvent.setup();
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);

    await user.click(screen.getByText("Propose a Scenario"));

    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
  });

  it("renders the points selection buttons", async () => {
    const user = userEvent.setup();
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);

    await user.click(screen.getByText("Propose a Scenario"));

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("can collapse the form with the close button", async () => {
    const user = userEvent.setup();
    render(<CustomScenarioForm groupId="group-001" matchId={2} />);

    // Expand
    await user.click(screen.getByText("Propose a Scenario"));
    expect(screen.getByText("Question")).toBeInTheDocument();

    // The X close button is the second button with type="button" (first is inside the heading)
    // Look for the Propose a Scenario heading's sibling close button
    const closeButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("type") === "button");
    // The first type="button" in the expanded form is the X close
    await user.click(closeButtons[0]);

    // Back to collapsed
    expect(screen.getByText("Propose a Scenario")).toBeInTheDocument();
    expect(screen.queryByText("Question")).not.toBeInTheDocument();
  });
});
