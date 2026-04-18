import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ScenarioTemplatesTable } from './scenario-templates-table'
import type { ScenarioTemplate } from '@/lib/dal/admin/reference'
import type { Json } from '@/types/database'

const MOCK_SPORTS = [
  {
    id: 'sport-cricket',
    api_id: 'api-cricket',
    name: 'Cricket',
    code: 'CRI',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

function makeTemplate(
  overrides: Partial<Omit<ScenarioTemplate, 'options'>> & {
    options?: Json
  },
): ScenarioTemplate {
  return {
    id: overrides.id ?? `template-${Math.random().toString(36).slice(2, 8)}`,
    slug: overrides.slug ?? 'match_winner',
    title: overrides.title ?? 'Who will win?',
    sport_id: overrides.sport_id ?? 'sport-cricket',
    input_type: overrides.input_type ?? 'team_pick',
    options: overrides.options ?? null,
    points: overrides.points ?? 30,
    resolution_phase: overrides.resolution_phase ?? 'end',
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? '2024-01-01T00:00:00Z',
  }
}

const TEMPLATES_BUDGET_OK = [
  makeTemplate({
    id: 't1',
    slug: 'match_winner',
    title: 'Who will win?',
    points: 30,
    resolution_phase: 'end',
  }),
  makeTemplate({
    id: 't2',
    slug: 'toss_winner',
    title: 'Who will win the toss?',
    points: 20,
    resolution_phase: 'toss',
  }),
  makeTemplate({
    id: 't3',
    slug: 'top_scorer',
    title: 'Top scorer of the match?',
    input_type: 'player_pick',
    points: 30,
    resolution_phase: 'end',
  }),
  makeTemplate({
    id: 't4',
    slug: 'total_sixes',
    title: 'Total sixes in the match?',
    input_type: 'range',
    options: ['0-4', '5-9', '10-14', '15+'] as Json,
    points: 20,
    resolution_phase: 'end',
  }),
  makeTemplate({
    id: 't5',
    slug: 'first_ball_dot',
    title: 'Will the first ball be a dot?',
    input_type: 'yes_no',
    points: 10,
    resolution_phase: 'first_wicket',
  }),
  makeTemplate({
    id: 't6',
    slug: 'powerplay_score',
    title: '{Home Team} powerplay score?',
    input_type: 'range',
    options: ['0-29', '30-49', '50-69', '70+'] as Json,
    points: 20,
    resolution_phase: 'team_powerplay_end',
  }),
  makeTemplate({
    id: 't7',
    slug: 'first_wicket_over',
    title: 'First wicket in which over?',
    input_type: 'range',
    options: ['1-3', '4-6', '7-10', '11+'] as Json,
    points: 20,
    resolution_phase: 'first_wicket',
  }),
  makeTemplate({
    id: 't8',
    slug: 'will_super_over',
    title: 'Will there be a super over?',
    input_type: 'yes_no',
    points: 10,
    resolution_phase: 'end',
  }),
  makeTemplate({
    id: 't9',
    slug: 'highest_partnership',
    title: 'Highest partnership score?',
    input_type: 'range',
    options: ['0-30', '31-60', '61-90', '91+'] as Json,
    points: 20,
    resolution_phase: 'end',
  }),
]

const TEMPLATES_BUDGET_MISMATCH = [
  makeTemplate({
    id: 't1',
    slug: 'match_winner',
    title: 'Who will win?',
    points: 30,
  }),
  makeTemplate({
    id: 't2',
    slug: 'toss_winner',
    title: 'Who will win the toss?',
    points: 20,
    resolution_phase: 'toss',
  }),
  makeTemplate({
    id: 't3',
    slug: 'inactive_template',
    title: 'Inactive one',
    points: 25,
    is_active: false,
  }),
]

const meta = {
  title: 'Admin/Reference/ScenarioTemplatesTable',
  component: ScenarioTemplatesTable,
  tags: ['autodocs'],
  args: {
    templates: TEMPLATES_BUDGET_OK,
    seededCounts: {},
    sports: MOCK_SPORTS,
  },
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof ScenarioTemplatesTable>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const WithActions: Story = {
  args: {
    templates: TEMPLATES_BUDGET_OK,
    seededCounts: { t1: 12, t2: 8, t3: 5 },
    sports: MOCK_SPORTS,
  },
}

export const DeleteDisabledForSeeded: Story = {
  name: 'Delete Disabled (Seeded Templates)',
  args: {
    templates: TEMPLATES_BUDGET_OK,
    seededCounts: {
      t1: 42,
      t2: 31,
      t3: 15,
      t4: 10,
      t5: 8,
      t6: 7,
      t7: 6,
      t8: 3,
      t9: 1,
    },
    sports: MOCK_SPORTS,
  },
}

export const PointsBudgetOk: Story = {
  name: 'Points Budget OK (210)',
  args: {
    templates: TEMPLATES_BUDGET_OK,
    seededCounts: {},
    sports: MOCK_SPORTS,
  },
}

export const PointsBudgetMismatch: Story = {
  name: 'Budget Mismatch Warning',
  args: {
    templates: TEMPLATES_BUDGET_MISMATCH,
    seededCounts: { t1: 10 },
    sports: MOCK_SPORTS,
  },
}

export const Empty: Story = {
  args: {
    templates: [],
    seededCounts: {},
    sports: MOCK_SPORTS,
  },
}
