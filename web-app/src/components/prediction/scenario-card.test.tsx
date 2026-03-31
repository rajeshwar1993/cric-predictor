import { render, screen } from "@testing-library/react";
import { ScenarioCard } from "./scenario-card";
import { MOCK_SCENARIOS, MOCK_PLAYERS } from "@/__mocks__/data";

describe("ScenarioCard", () => {
  const baseProps = {
    teamA: "CSK",
    teamB: "MI",
    players: MOCK_PLAYERS,
    value: null,
    onChange: vi.fn(),
    disabled: false,
  };

  it("renders the scenario title", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[0]} />
    );
    expect(screen.getByText("Who will win?")).toBeInTheDocument();
  });

  it("renders the points value", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[0]} />
    );
    expect(screen.getByText("10 pts")).toBeInTheDocument();
  });

  it("renders TeamPick for match_winner category", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[0]} />
    );
    // TeamPick renders two team buttons, each team code appears twice (badge + label)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2);
    expect(screen.getAllByText("CSK")).toHaveLength(2);
    expect(screen.getAllByText("MI")).toHaveLength(2);
  });

  it("renders TeamPick for toss_winner category", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[1]} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2);
  });

  it("renders PlayerPick for top_scorer category", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[2]} />
    );
    expect(screen.getByText("Choose player...")).toBeInTheDocument();
  });

  it("renders RangePick for first_innings_score category", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[5]} />
    );
    expect(screen.getByText("<150")).toBeInTheDocument();
    expect(screen.getByText("190+")).toBeInTheDocument();
  });

  it("renders YesNoPick for batsman_fifty category", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[8]} />
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders RangePick for custom scenario with options", () => {
    // MOCK_SCENARIOS[12] is a custom scenario with options ["Yes", "No"]
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[12]} />
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("shows 'Picked' indicator when value is set", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[0]} value="CSK" />
    );
    expect(screen.getByText("Picked")).toBeInTheDocument();
  });

  it("does not show 'Picked' indicator when value is null", () => {
    render(
      <ScenarioCard {...baseProps} scenario={MOCK_SCENARIOS[0]} />
    );
    expect(screen.queryByText("Picked")).not.toBeInTheDocument();
  });
});
