import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerPick } from "./player-pick";
import { MOCK_PLAYERS_CSK } from "@/__mocks__/data";

describe("PlayerPick", () => {
  const defaultProps = {
    players: MOCK_PLAYERS_CSK,
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the search input", () => {
    render(<PlayerPick {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search player...")).toBeInTheDocument();
  });

  it("shows all players when the search input is focused", async () => {
    const user = userEvent.setup();
    render(<PlayerPick {...defaultProps} />);

    await user.click(screen.getByPlaceholderText("Search player..."));

    expect(screen.getByText("MS Dhoni")).toBeInTheDocument();
    expect(screen.getByText("Ruturaj Gaikwad")).toBeInTheDocument();
  });

  it("filters players based on search text", async () => {
    const user = userEvent.setup();
    render(<PlayerPick {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("Search player..."), "Jadeja");

    expect(screen.getByText("Ravindra Jadeja")).toBeInTheDocument();
    expect(screen.queryByText("MS Dhoni")).not.toBeInTheDocument();
  });

  it("selects a player and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlayerPick {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByPlaceholderText("Search player..."));
    await user.click(screen.getByText("MS Dhoni"));

    expect(onChange).toHaveBeenCalledWith("MS Dhoni");
  });

  it("renders the selected player name when value is set", () => {
    render(<PlayerPick {...defaultProps} value="MS Dhoni" />);
    expect(screen.getByText("MS Dhoni")).toBeInTheDocument();
  });

  it("renders a disabled state that shows the selected player or 'Locked'", () => {
    render(<PlayerPick {...defaultProps} disabled />);
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("renders selected player name in disabled state", () => {
    render(<PlayerPick {...defaultProps} value="MS Dhoni" disabled />);
    expect(screen.getByText("MS Dhoni")).toBeInTheDocument();
  });

  it("shows 'No players found' when search yields no results", async () => {
    const user = userEvent.setup();
    render(<PlayerPick {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("Search player..."),
      "zzzzzzz"
    );

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });
});
