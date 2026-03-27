import { render, screen, fireEvent, act } from "@testing-library/react";
import { InviteLink } from "./invite-link";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock PostHog
vi.mock("@/lib/posthog/client", () => ({
  getPostHogClient: () => ({ capture: vi.fn() }),
}));

const defaultProps = {
  inviteCode: "abc123def456",
  groupName: "The Legends",
  inviterName: "Rajesh",
};

describe("InviteLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default to desktop (no mobile user agent)
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      writable: true,
      configurable: true,
    });
  });

  it('renders "Send Invite" button', () => {
    render(<InviteLink {...defaultProps} />);
    expect(screen.getByText("Send Invite")).toBeInTheDocument();
  });

  it('renders "Copy Link" button on desktop', () => {
    render(<InviteLink {...defaultProps} />);
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
  });

  it("renders two buttons on desktop", () => {
    render(<InviteLink {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2);
  });

  it("copies link to clipboard on Copy Link click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<InviteLink {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Copy Link"));
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/join/abc123def456")
    );
  });

  it("falls back to clipboard copy when navigator.share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText }, share: undefined });

    render(<InviteLink {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Send Invite"));
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Rajesh is calling you up to The Legends")
    );
  });

  it("calls navigator.share with correct data when available", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: shareFn });

    render(<InviteLink {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Send Invite"));
    });

    expect(shareFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Join The Legends on Bragg",
        text: expect.stringContaining("Rajesh is calling you up to The Legends"),
        url: expect.stringContaining("/join/abc123def456"),
      })
    );
  });

  it("silently handles AbortError from share cancellation", async () => {
    const abortError = new Error("Share cancelled");
    abortError.name = "AbortError";
    const shareFn = vi.fn().mockRejectedValue(abortError);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: shareFn, clipboard: { writeText } });

    render(<InviteLink {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Send Invite"));
    });

    // Should NOT fall back to clipboard on AbortError
    expect(writeText).not.toHaveBeenCalled();
  });

  it("includes invite code in share message", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: shareFn });

    render(<InviteLink {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Send Invite"));
    });

    expect(shareFn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Squad Code: abc123def456"),
      })
    );
  });
});
