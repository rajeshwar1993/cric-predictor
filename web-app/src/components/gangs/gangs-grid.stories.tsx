import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GangsGrid } from './gangs-grid'
import type { UserGang } from '@/lib/dal/gangs'

const meta = {
  title: 'Gangs/GangsGrid',
  component: GangsGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GangsGrid>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Helper to generate mock gang data                                    */
/* ------------------------------------------------------------------ */

function mockGang(overrides: Partial<UserGang> & { id: string }): UserGang {
  return {
    name: 'Test Gang',
    inviteCode: 'ABC123',
    role: 'member',
    memberCount: 8,
    createdAt: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/* Empty — no gangs (empty state)                                       */
/* ------------------------------------------------------------------ */

export const Empty: Story = {
  args: {
    gangs: [],
  },
}

/* ------------------------------------------------------------------ */
/* OneGang — single card                                                */
/* ------------------------------------------------------------------ */

export const OneGang: Story = {
  args: {
    gangs: [
      mockGang({
        id: 'gang-001',
        name: 'Mumbai Mavericks',
        role: 'admin',
        memberCount: 5,
      }),
    ],
  },
}

/* ------------------------------------------------------------------ */
/* MultipleGangs — 4-5 cards in grid                                    */
/* ------------------------------------------------------------------ */

export const MultipleGangs: Story = {
  args: {
    gangs: [
      mockGang({
        id: 'gang-001',
        name: 'Mumbai Mavericks',
        role: 'admin',
        memberCount: 12,
      }),
      mockGang({
        id: 'gang-002',
        name: 'Delhi Dynamos',
        role: 'member',
        memberCount: 8,
      }),
      mockGang({
        id: 'gang-003',
        name: 'Chennai Champions',
        role: 'member',
        memberCount: 20,
      }),
      mockGang({
        id: 'gang-004',
        name: 'Kolkata Knights',
        role: 'admin',
        memberCount: 3,
      }),
      mockGang({
        id: 'gang-005',
        name: 'Bangalore Blazers',
        role: 'member',
        memberCount: 15,
      }),
    ],
  },
}

/* ------------------------------------------------------------------ */
/* MaxGangs — many cards showing scroll                                 */
/* ------------------------------------------------------------------ */

export const MaxGangs: Story = {
  args: {
    gangs: Array.from({ length: 12 }, (_, i) =>
      mockGang({
        id: `gang-${String(i + 1).padStart(3, '0')}`,
        name: `Gang ${i + 1}`,
        role: i % 3 === 0 ? 'admin' : 'member',
        memberCount: Math.min(20, (i + 1) * 2),
        inviteCode: `CODE${String(i + 1).padStart(2, '0')}`,
      }),
    ),
  },
}
