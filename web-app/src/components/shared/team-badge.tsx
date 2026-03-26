import { getTeamColor } from "@/lib/utils";
import { IPL_TEAMS } from "@/lib/constants";

interface TeamBadgeProps {
  teamCode: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-14 w-14 text-sm",
};

export function TeamBadge({ teamCode, size = "md" }: TeamBadgeProps) {
  const color = getTeamColor(teamCode);
  const team = IPL_TEAMS.find((t) => t.code === teamCode);
  const textOnColor = team?.text_on_color === "light" ? "#FFFFFF" : "var(--bg-deep)";

  return (
    <div
      className={`${SIZES[size]} flex items-center justify-center rounded-full font-display font-bold shrink-0`}
      style={{ backgroundColor: color, color: textOnColor }}
      title={team?.name || teamCode}
    >
      {teamCode}
    </div>
  );
}
