import type { Player } from "@/types";

export const MOCK_PLAYERS_CSK: Player[] = [
  { id: "p-01", name: "MS Dhoni", team_code: "CSK", role: "Wicket-keeper" },
  { id: "p-02", name: "Ruturaj Gaikwad", team_code: "CSK", role: "Batsman" },
  { id: "p-03", name: "Devon Conway", team_code: "CSK", role: "Batsman" },
  { id: "p-04", name: "Shivam Dube", team_code: "CSK", role: "All-Rounder" },
  { id: "p-05", name: "Ravindra Jadeja", team_code: "CSK", role: "All-Rounder" },
  { id: "p-06", name: "Matheesha Pathirana", team_code: "CSK", role: "Bowler" },
  { id: "p-07", name: "Tushar Deshpande", team_code: "CSK", role: "Bowler" },
  { id: "p-08", name: "Deepak Chahar", team_code: "CSK", role: "Bowler" },
  { id: "p-09", name: "Rachin Ravindra", team_code: "CSK", role: "Batsman" },
  { id: "p-10", name: "Ajinkya Rahane", team_code: "CSK", role: "Batsman" },
];

export const MOCK_PLAYERS_MI: Player[] = [
  { id: "p-11", name: "Rohit Sharma", team_code: "MI", role: "Batsman" },
  { id: "p-12", name: "Ishan Kishan", team_code: "MI", role: "Wicket-keeper" },
  { id: "p-13", name: "Suryakumar Yadav", team_code: "MI", role: "Batsman" },
  { id: "p-14", name: "Tilak Varma", team_code: "MI", role: "Batsman" },
  { id: "p-15", name: "Hardik Pandya", team_code: "MI", role: "All-Rounder" },
  { id: "p-16", name: "Tim David", team_code: "MI", role: "Batsman" },
  { id: "p-17", name: "Jasprit Bumrah", team_code: "MI", role: "Bowler" },
  { id: "p-18", name: "Piyush Chawla", team_code: "MI", role: "Bowler" },
  { id: "p-19", name: "Gerald Coetzee", team_code: "MI", role: "Bowler" },
  { id: "p-20", name: "Naman Dhir", team_code: "MI", role: "Batsman" },
];

export const MOCK_PLAYERS = [...MOCK_PLAYERS_CSK, ...MOCK_PLAYERS_MI];
