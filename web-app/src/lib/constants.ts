// App configuration
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Bragg";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  ONBOARDING: "/onboarding",
  DASHBOARD: "/dashboard",
  JOIN: (code: string) => `/join/${code}`,
  GROUP: (groupId: string) => `/group/${groupId}`,
  PREDICT: (groupId: string, matchId: number) =>
    `/group/${groupId}/predict/${matchId}`,
  MATCH_LEADERBOARD: (groupId: string, matchId: number) =>
    `/group/${groupId}/match/${matchId}`,
  SCENARIOS: (groupId: string, matchId: number) =>
    `/group/${groupId}/scenarios/${matchId}`,
  STANDINGS: (groupId: string) => `/group/${groupId}/standings`,
  ADMIN: (groupId: string) => `/group/${groupId}/admin`,
  PRIVACY: "/privacy",
  TERMS: "/terms",
  AUTH_CALLBACK: "/auth/callback",
} as const;

// IPL Teams — code, name, short_name, color, text_on_color
export const IPL_TEAMS = [
  { code: "CSK", name: "Chennai Super Kings", short_name: "Chennai", color: "#F9CD05", text_on_color: "dark" },
  { code: "MI", name: "Mumbai Indians", short_name: "Mumbai", color: "#004BA0", text_on_color: "light" },
  { code: "RCB", name: "Royal Challengers Bengaluru", short_name: "Bengaluru", color: "#EC1C24", text_on_color: "dark" },
  { code: "KKR", name: "Kolkata Knight Riders", short_name: "Kolkata", color: "#3B215D", text_on_color: "light" },
  { code: "DC", name: "Delhi Capitals", short_name: "Delhi", color: "#004C93", text_on_color: "light" },
  { code: "SRH", name: "Sunrisers Hyderabad", short_name: "Hyderabad", color: "#F26522", text_on_color: "dark" },
  { code: "RR", name: "Rajasthan Royals", short_name: "Rajasthan", color: "#EA1A85", text_on_color: "dark" },
  { code: "PBKS", name: "Punjab Kings", short_name: "Punjab", color: "#ED1B24", text_on_color: "dark" },
  { code: "GT", name: "Gujarat Titans", short_name: "Gujarat", color: "#1C1C2B", text_on_color: "light" },
  { code: "LSG", name: "Lucknow Super Giants", short_name: "Lucknow", color: "#A72056", text_on_color: "light" },
] as const;

// api-cricket.com returns full team names; DB stores codes.
// This mapping converts API team names to codes for resolution.
export const TEAM_NAME_TO_CODE: Record<string, string> = Object.fromEntries([
  ...IPL_TEAMS.map((t) => [t.name, t.code]),
  ...IPL_TEAMS.map((t) => [t.short_name, t.code]),
  // Common API variations
  ["Chennai Super Kings", "CSK"],
  ["Mumbai Indians", "MI"],
  ["Royal Challengers Bangalore", "RCB"],
  ["Royal Challengers Bengaluru", "RCB"],
  ["Kolkata Knight Riders", "KKR"],
  ["Delhi Capitals", "DC"],
  ["Sunrisers Hyderabad", "SRH"],
  ["Rajasthan Royals", "RR"],
  ["Punjab Kings", "PBKS"],
  ["Gujarat Titans", "GT"],
  ["Lucknow Super Giants", "LSG"],
]);

// System scenario categories with labels and points
export const SYSTEM_SCENARIOS = [
  { category: "match_winner", label: "Who's winning this?", points: 10, resolution_phase: "end" },
  { category: "toss_winner", label: "Who calls the toss?", points: 5, resolution_phase: "toss" },
  { category: "top_scorer", label: "Who tops the run chart?", points: 15, resolution_phase: "end" },
  { category: "top_wicket_taker", label: "Who's the top wicket-taker?", points: 15, resolution_phase: "end" },
  { category: "player_of_match", label: "Who takes the award?", points: 20, resolution_phase: "post_match" },
  { category: "first_innings_score", label: "First innings total?", points: 10, resolution_phase: "innings_break" },
  { category: "total_match_runs", label: "How many runs in the match?", points: 10, resolution_phase: "end" },
  { category: "powerplay_score", label: "Powerplay total (first 6)?", points: 10, resolution_phase: "powerplay" },
  { category: "powerplay_wickets", label: "Wickets in the powerplay?", points: 10, resolution_phase: "powerplay" },
  { category: "total_sixes", label: "How many sixes fly out?", points: 10, resolution_phase: "end" },
  { category: "total_wickets", label: "Total wickets in the match?", points: 10, resolution_phase: "end" },
  { category: "batsman_fifty", label: "Anyone hitting a fifty?", points: 10, resolution_phase: "mid_match" },
  { category: "bowler_three_wkt", label: "Any bowler grabbing 3+ wickets?", points: 10, resolution_phase: "mid_match" },
  { category: "had_super_over", label: "Super Over on the cards?", points: 20, resolution_phase: "end" },
  { category: "most_sixes", label: "Who's the six-hitting machine?", points: 15, resolution_phase: "end" },
  { category: "first_wicket_over", label: "When does the first wicket fall?", points: 10, resolution_phase: "first_wicket" },
] as const;

// Range bracket options for system scenarios
export const RANGE_OPTIONS: Record<string, string[]> = {
  first_innings_score: ["<150", "150-169", "170-189", "190+"],
  total_match_runs: ["<300", "300-349", "350-399", "400+"],
  powerplay_score: ["<40", "40-55", "56-70", "71+"],
  powerplay_wickets: ["0", "1", "2", "3+"],
  total_sixes: ["<15", "15-25", "26-35", "36+"],
  total_wickets: ["12-15", "16-18", "19-21", "22+"],
  first_wicket_over: ["1-2", "3-4", "5-6", "7+"],
};

// Custom scenario points options
export const CUSTOM_SCENARIO_POINTS = [5, 10, 15, 20, 25] as const;

// Rate limits
export const LIMITS = {
  MAX_GROUPS_PER_USER: 10,
  MAX_MEMBERS_PER_GROUP: 50,
  MAX_CUSTOM_SCENARIOS_PER_MEMBER_PER_MATCH: 10,
  MAX_CUSTOM_SCENARIOS_PER_GROUP_PER_MATCH: 30,
  MAGIC_LINK_RESEND_SECONDS: 60,
  PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH: 45,
} as const;

// Prediction status indicators
export const PREDICTION_STATUS = {
  CORRECT: { label: "Nailed It", color: "success", icon: "check-circle" },
  WRONG: { label: "Missed", color: "danger", icon: "x-circle" },
  ON_TRACK: { label: "On Track", color: "cyan", icon: "trending-up" },
  IN_DANGER: { label: "Sweating", color: "warning", icon: "alert-triangle" },
  PENDING: { label: "In Play", color: "pending", icon: "clock" },
} as const;
