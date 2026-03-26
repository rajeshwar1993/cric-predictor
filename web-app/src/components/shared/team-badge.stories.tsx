import type { Meta, StoryObj } from "@storybook/react";
import { TeamBadge } from "./team-badge";
import { IPL_TEAMS } from "@/lib/constants";

const meta = {
  title: "Shared/TeamBadge",
  component: TeamBadge,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof TeamBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CSK: Story = {
  args: { teamCode: "CSK", size: "md" },
};

export const MI: Story = {
  args: { teamCode: "MI", size: "md" },
};

export const AllTeams: Story = {
  args: { teamCode: "CSK" },
  render: () => (
    <div className="grid grid-cols-5 gap-4">
      {IPL_TEAMS.map((team) => (
        <div key={team.code} className="flex flex-col items-center gap-2">
          <TeamBadge teamCode={team.code} size="lg" />
          <span className="text-xs text-[var(--text-muted)]">{team.short_name}</span>
        </div>
      ))}
    </div>
  ),
};
