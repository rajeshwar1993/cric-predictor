import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { ScenarioTemplateForm } from './scenario-template-form'

const MOCK_SPORTS = [
  {
    id: 'sport-cricket',
    api_id: 'api-cricket',
    name: 'Cricket',
    code: 'CRI',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sport-football',
    api_id: 'api-football',
    name: 'Football',
    code: 'FTB',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const MOCK_TEMPLATE = {
  id: 'template-1',
  slug: 'match_winner',
  title: 'Who will win {Home Team} vs {Away Team}?',
  sport_id: 'sport-cricket',
  input_type: 'team_pick' as const,
  options: null,
  points: 30,
  resolution_phase: 'end' as const,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const MOCK_RANGE_TEMPLATE = {
  ...MOCK_TEMPLATE,
  id: 'template-range',
  slug: 'total_sixes',
  title: 'Total sixes in the match?',
  input_type: 'range' as const,
  options: ['0-4', '5-9', '10-14', '15+'],
  points: 20,
}

const EXISTING_SLUGS = ['match_winner', 'total_sixes', 'first_wicket_over']

const meta = {
  title: 'Admin/Reference/ScenarioTemplateForm',
  component: ScenarioTemplateForm,
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: fn(),
    template: null,
    seededCount: 0,
    sports: MOCK_SPORTS,
    existingSlugs: EXISTING_SLUGS,
  },
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof ScenarioTemplateForm>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const CreateEmpty: Story = {
  args: {
    template: null,
    seededCount: 0,
  },
}

export const EditExisting: Story = {
  args: {
    template: MOCK_TEMPLATE,
    seededCount: 0,
  },
}

export const EditWithSlugDisabled: Story = {
  name: 'Edit (Slug Read-Only)',
  args: {
    template: MOCK_TEMPLATE,
    seededCount: 0,
  },
}

export const EditWithSeededWarning: Story = {
  name: 'Edit (Seeded Warning)',
  args: {
    template: MOCK_TEMPLATE,
    seededCount: 47,
  },
}

export const EditRangeTemplate: Story = {
  name: 'Edit (Range Type with Options)',
  args: {
    template: MOCK_RANGE_TEMPLATE,
    seededCount: 12,
  },
}

export const ValidationErrors: Story = {
  args: {
    template: null,
    seededCount: 0,
  },
}
