import { render, screen } from "@testing-library/react";
import { MatchLeaderboard } from "./match-leaderboard";
import { MOCK_MATCH_LEADERBOARD } from "@/__mocks__/data";

describe("MatchLeaderboard", () => {
  it("renders all leaderboard entries", () => {
    render(
      <MatchLeaderboard
        entries={MOCK_MATCH_LEADERBOARD}
        currentUserId="user-999"
      />
    );

    for (const entry of MOCK_MATCH_LEADERBOARD) {
      expect(screen.getByText(entry.display_name)).toBeInTheDocument();
    }
  });

  it("renders the heading", () => {
    render(
      <MatchLeaderboard
        entries={MOCK_MATCH_LEADERBOARD}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("Match Leaderboard")).toBeInTheDocument();
  });

  it("highlights the current user with '(you)' marker", () => {
    render(
      <MatchLeaderboard
        entries={MOCK_MATCH_LEADERBOARD}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("does not show '(you)' when current user is not in entries", () => {
    render(
      <MatchLeaderboard
        entries={MOCK_MATCH_LEADERBOARD}
        currentUserId="user-999"
      />
    );
    expect(screen.queryByText("(you)")).not.toBeInTheDocument();
  });

  it("renders empty state when entries is empty", () => {
    render(<MatchLeaderboard entries={[]} currentUserId="user-001" />);
    expect(
      screen.getByText("Nobody's made a call yet — be the first one in!")
    ).toBeInTheDocument();
  });

  it("renders points for each entry", () => {
    render(
      <MatchLeaderboard
        entries={MOCK_MATCH_LEADERBOARD}
        currentUserId="user-001"
      />
    );
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();
  });
});
