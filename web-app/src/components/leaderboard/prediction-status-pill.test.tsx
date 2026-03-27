import { render, screen } from "@testing-library/react";
import { PredictionStatusPill } from "./prediction-status-pill";
import type { TrackStatus } from "@/lib/on-track-logic";

describe("PredictionStatusPill", () => {
  const statuses: TrackStatus[] = ["correct", "wrong", "on_track", "in_danger", "pending"];
  const expectedLabels: Record<TrackStatus, string> = {
    correct: "Correct",
    wrong: "Wrong",
    on_track: "On Track",
    in_danger: "In Danger",
    pending: "Pending",
  };

  it.each(statuses)("renders the label for status '%s'", (status) => {
    render(<PredictionStatusPill status={status} />);
    expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
  });

  it("does not render label text in compact mode", () => {
    render(<PredictionStatusPill status="correct" compact />);
    expect(screen.queryByText("Correct")).not.toBeInTheDocument();
  });

  it("renders the dot indicator for each status", () => {
    const { container } = render(<PredictionStatusPill status="correct" />);
    // The dot is a span with rounded-full class and 1.5 size
    const dot = container.querySelector("span span");
    expect(dot).toBeInTheDocument();
  });

  it("applies compact padding", () => {
    const { container } = render(<PredictionStatusPill status="pending" compact />);
    const pill = container.querySelector("span");
    expect(pill).toHaveStyle({ padding: "3px 8px" });
  });

  it("applies normal padding when not compact", () => {
    const { container } = render(<PredictionStatusPill status="pending" />);
    const pill = container.querySelector("span");
    expect(pill).toHaveStyle({ padding: "7px 14px" });
  });
});
