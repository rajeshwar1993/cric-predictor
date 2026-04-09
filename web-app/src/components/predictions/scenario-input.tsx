'use client'

import type { ScenarioInputType } from '@/types'
import type { FixtureTeam } from '@/lib/dal/fixtures'
import type { MatchPlayer } from '@/lib/dal/predictions'
import { TeamPicker } from '@/components/predictions/team-picker'
import { PlayerPicker } from '@/components/predictions/player-picker'
import { RangePicker } from '@/components/predictions/range-picker'
import { YesNoPicker } from '@/components/predictions/yes-no-picker'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScenarioInputProps {
  /** The scenario input type that determines which picker to render */
  inputType: ScenarioInputType
  /** Range bracket options — required for 'number_range' and 'over_range' input types */
  options?: string[]
  /** Home team info — required for 'team_select' and 'player_select' */
  homeTeam: FixtureTeam
  /** Away team info — required for 'team_select' and 'player_select' */
  awayTeam: FixtureTeam
  /** Players grouped by team — required for 'player_select' */
  players: { home: MatchPlayer[]; away: MatchPlayer[] }
  /** Currently selected value */
  value: string
  /** Callback when a value is selected */
  onChange: (value: string) => void
  /** Whether the picker is disabled */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScenarioInput — routes to the correct picker based on input type.
 *
 * This is the main entry point for rendering scenario pickers. It takes
 * the scenario's `inputType` and delegates to the appropriate picker
 * component (TeamPicker, PlayerPicker, RangePicker, or YesNoPicker).
 *
 * @see docs/stories/PRED-002-scenario-pickers.md
 */
export function ScenarioInput({
  inputType,
  options,
  homeTeam,
  awayTeam,
  players,
  value,
  onChange,
  disabled,
}: ScenarioInputProps) {
  switch (inputType) {
    case 'team_select':
      return (
        <TeamPicker
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )

    case 'player_select':
      return (
        <PlayerPicker
          players={players}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )

    case 'number_range':
    case 'over_range':
      return (
        <RangePicker
          options={options ?? []}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )

    case 'yes_no':
      return (
        <YesNoPicker
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )
  }
}
