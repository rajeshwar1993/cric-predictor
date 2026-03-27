import { render, screen } from "@testing-library/react";
import { SeasonStandings } from "./season-standings";
import { MOCK_SEASON_STANDINGS } from "@/__mocks__/data";

describe("SeasonStandings", () => {
  it("renders all standing entries", () => {
    render(
      <SeasonStandings
        entries={MOCK_SEASON_STANDINGS}
        currentUserId="user-999"
      />
    );

    for (const entry of MOCK_SEASON_STANDINGS) {
      expect(screen.getByText(entry.display_name)).toBeInTheDocument();
    }
  });

  it("highlights the current user with '(you)' marker", () => {
    render(
      <SeasonStandings
        entries={MOCK_SEASON_STANDINGS}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("renders empty state when entries is empty", () => {
    render(<SeasonStandings entries={[]} currentUserId="user-001" />);
    expect(
      screen.getByText(
        "No standings yet. Predict a match to see the leaderboard!"
      )
    ).toBeInTheDocument();
  });

  it("renders total points for each entry", () => {
    render(
      <SeasonStandings
        entries={MOCK_SEASON_STANDINGS}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("385")).toBeInTheDocument();
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("renders accuracy percentage", () => {
    render(
      <SeasonStandings
        entries={MOCK_SEASON_STANDINGS}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("62.5%")).toBeInTheDocument();
  });
});
