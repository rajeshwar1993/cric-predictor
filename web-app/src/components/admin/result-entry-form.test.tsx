import { render, screen } from "@testing-library/react";
import { ResultEntryForm } from "./result-entry-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin",
}));

vi.mock("@/lib/actions/admin", () => ({
  enterResults: vi.fn().mockResolvedValue({ success: true }),
}));

describe("ResultEntryForm", () => {
  it("renders the form heading", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    expect(screen.getByText("Enter Match Results")).toBeInTheDocument();
  });

  it("renders team select options for Match Winner", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    // Check for match winner label
    expect(screen.getByText("Match Winner *")).toBeInTheDocument();

    // The selects should contain CSK and MI as options
    const options = screen.getAllByText("CSK");
    expect(options.length).toBeGreaterThanOrEqual(1);
  });

  it("renders team select options for Toss Winner", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    expect(screen.getByText("Toss Winner *")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    expect(
      screen.getByText("Enter Results & Resolve Predictions")
    ).toBeInTheDocument();
  });

  it("renders player input fields", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    expect(screen.getByText("Top Scorer")).toBeInTheDocument();
    expect(screen.getByText("Top Wicket-Taker")).toBeInTheDocument();
    expect(screen.getByText("Player of Match")).toBeInTheDocument();
  });

  it("renders boolean select fields", () => {
    render(
      <ResultEntryForm
        groupId="group-001"
        matchId={1}
        teamA="CSK"
        teamB="MI"
      />
    );
    expect(screen.getByText("Super Over?")).toBeInTheDocument();
    expect(screen.getByText("Batsman 50+?")).toBeInTheDocument();
    expect(screen.getByText("Bowler 3+ Wkt?")).toBeInTheDocument();
  });
});
