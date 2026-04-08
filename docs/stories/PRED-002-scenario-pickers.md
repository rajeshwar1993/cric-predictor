# PRED-002: Scenario Input Pickers

**Phase:** 9 — Predictions
**Dependencies:** PRED-001
**Estimated scope:** 4 input picker components for the 4 scenario input types

---

## Description

Build the four input picker components for prediction scenarios: TeamPicker, PlayerPicker, RangePicker, and YesNoPicker. Each handles its specific input type and reports the selected value to the parent form.

---

## Acceptance Criteria

### TeamPicker (`src/components/predictions/team-picker.tsx`) — Client Component
- [ ] Shows two team options side by side
- [ ] Each option: team code (e.g., "MI") with team color accent
- [ ] Selected team has lime border/highlight
- [ ] Tapping a team selects it (toggles if same team tapped again? No — selection is sticky)
- [ ] Props: `homeTeam`, `awayTeam`, `value`, `onChange`

### PlayerPicker (`src/components/predictions/player-picker.tsx`) — Client Component
- [ ] Dropdown/select showing all players from both teams
- [ ] Grouped by team: "MI Players" and "CSK Players" sections
- [ ] Each player shows: name, role (if available)
- [ ] Search/filter functionality for quick finding
- [ ] Selected player shown in the input field
- [ ] Props: `players` (grouped by team), `value`, `onChange`
- [ ] Uses shadcn Combobox or custom searchable select

### RangePicker (`src/components/predictions/range-picker.tsx`) — Client Component
- [ ] Shows range bracket options as selectable chips/buttons
- [ ] Options from scenario (e.g., "<140", "140-159", "160-179", "180-199", "200+")
- [ ] Selected option has lime background, others have default/dark background
- [ ] Single selection only
- [ ] Props: `options` (string array), `value`, `onChange`

### YesNoPicker (`src/components/predictions/yes-no-picker.tsx`) — Client Component
- [ ] Two options: "YES" and "NO"
- [ ] Toggle-style buttons side by side
- [ ] Selected option has lime background
- [ ] Props: `value`, `onChange`

### Shared Behavior
- [ ] All pickers are controlled components (value + onChange pattern)
- [ ] All support disabled state (for locked predictions)
- [ ] All follow Electric Street styling (dark surfaces, lime highlights)
- [ ] Keyboard accessible (tab navigation, enter/space to select)
- [ ] ARIA: proper role attributes, labels

---

## Files to Create

```
web-app/src/components/predictions/
├── team-picker.tsx
├── team-picker.stories.tsx
├── player-picker.tsx
├── player-picker.stories.tsx
├── range-picker.tsx
├── range-picker.stories.tsx
├── yes-no-picker.tsx
├── yes-no-picker.stories.tsx
├── scenario-input.tsx              # Wrapper that renders the right picker based on input_type
└── scenario-input.stories.tsx
```

---

## Technical Notes

### ScenarioInput Wrapper
Routes to the correct picker based on `input_type`:
```tsx
interface ScenarioInputProps {
  inputType: ScenarioInputType
  options?: string[]
  homeTeam: LeagueTeam
  awayTeam: LeagueTeam
  players: { home: Player[]; away: Player[] }
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ScenarioInput({ inputType, ...props }: ScenarioInputProps) {
  switch (inputType) {
    case 'team_pick': return <TeamPicker {...props} />
    case 'player_pick': return <PlayerPicker {...props} />
    case 'range': return <RangePicker options={props.options!} {...props} />
    case 'yes_no': return <YesNoPicker {...props} />
  }
}
```

### Team Picker Design
```tsx
<div className="grid grid-cols-2 gap-3">
  <button
    className={cn(
      'flex flex-col items-center p-4 rounded-md border-2 transition-all',
      value === homeTeam.id
        ? 'border-bragg-lime bg-lime-wash'
        : 'border-wire bg-dark-concrete hover:border-light-concrete'
    )}
    onClick={() => onChange(homeTeam.id)}
  >
    <span className="font-display font-bold text-lg" style={{ color: homeTeam.color }}>
      {homeTeam.code}
    </span>
    <span className="text-xs text-text-secondary mt-1">{homeTeam.name}</span>
  </button>
  {/* Away team same pattern */}
</div>
```

### Player Picker — Searchable Select
Use shadcn Combobox pattern (Popover + Command):
```bash
npx shadcn@latest add command popover
```
The player list can be long (25+ players per team), so search is essential.

### Range Picker — Chip Selection
```tsx
<div className="flex flex-wrap gap-2">
  {options.map(option => (
    <button
      key={option}
      className={cn(
        'px-4 py-2 rounded-sm font-body font-bold text-sm uppercase tracking-wide transition-all',
        value === option
          ? 'bg-bragg-lime text-text-on-primary shadow-color-block'
          : 'bg-dark-concrete text-text-secondary border border-wire hover:border-light-concrete'
      )}
      onClick={() => onChange(option)}
    >
      {option}
    </button>
  ))}
</div>
```

### Value Format
- `team_pick` → team UUID (internal ID from `v2_league_teams`)
- `player_pick` → player UUID (internal ID from `v2_players`)
- `range` → bracket string exactly as defined (e.g., "140-159", "<30", "200+")
- `yes_no` → "Yes" or "No"

---

## Dependencies to Install
```bash
npx shadcn@latest add command popover
```

---

## Storybook Requirements

### TeamPicker Stories
- `NoSelection`, `HomeSelected`, `AwaySelected`, `Disabled`

### PlayerPicker Stories
- `NoSelection`, `PlayerSelected`, `Searching`, `Disabled`

### RangePicker Stories
- `FiveOptions` (innings score), `ThreeOptions`, `Selected`, `Disabled`

### YesNoPicker Stories
- `NoSelection`, `YesSelected`, `NoSelected`, `Disabled`

### ScenarioInput Stories
- `AllTypes` — one of each type in a column
