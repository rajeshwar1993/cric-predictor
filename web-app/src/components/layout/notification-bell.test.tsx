import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from "@/test/helpers/mock-supabase";
import { MOCK_NOTIFICATIONS } from "@/__mocks__/data";

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};

const mockBrowserClient = createMockSupabaseClient({
  channel: vi.fn(() => mockChannel),
  from: vi.fn(() => createMockQueryBuilder(MOCK_NOTIFICATIONS)),
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockBrowserClient),
}));

vi.mock("@/lib/actions/notifications", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { NotificationBell } from "./notification-bell";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup from mock with notifications data
    (mockBrowserClient.from as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockQueryBuilder(MOCK_NOTIFICATIONS)
    );
  });

  it("renders the bell button", async () => {
    render(<NotificationBell userId="user-001" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });
  });

  it("shows unread count badge", async () => {
    render(<NotificationBell userId="user-001" />);

    // MOCK_NOTIFICATIONS has 3 unread items
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("opens the notification panel on click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell userId="user-001" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/notifications/i));

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("displays notification messages when open", async () => {
    const user = userEvent.setup();
    render(<NotificationBell userId="user-001" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/notifications/i));

    // Check first notification message
    expect(
      screen.getByText(/Results are in for RCB vs SRH/)
    ).toBeInTheDocument();
  });

  it("shows 'Clear all' when there are unread notifications", async () => {
    const user = userEvent.setup();
    render(<NotificationBell userId="user-001" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/notifications/i));

    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });
});
