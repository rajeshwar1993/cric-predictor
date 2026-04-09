import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GangCard } from './gang-card'

const meta = {
  title: 'Gangs/GangCard',
  component: GangCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    role: {
      control: 'select',
      options: ['admin', 'member'],
    },
    memberCount: {
      control: { type: 'number', min: 1, max: 20 },
    },
  },
} satisfies Meta<typeof GangCard>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default (fallback)                                                   */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    id: 'gang-001',
    name: 'Mumbai Mavericks',
    role: 'member',
    memberCount: 8,
  },
}

/* ------------------------------------------------------------------ */
/* Admin — shows lime admin badge                                       */
/* ------------------------------------------------------------------ */

export const Admin: Story = {
  args: {
    id: 'gang-002',
    name: 'Mumbai Mavericks',
    role: 'admin',
    memberCount: 12,
  },
}

/* ------------------------------------------------------------------ */
/* Member — shows default member badge                                  */
/* ------------------------------------------------------------------ */

export const Member: Story = {
  args: {
    id: 'gang-003',
    name: 'Delhi Dynamos',
    role: 'member',
    memberCount: 6,
  },
}

/* ------------------------------------------------------------------ */
/* FullGang — 20/20 members                                             */
/* ------------------------------------------------------------------ */

export const FullGang: Story = {
  args: {
    id: 'gang-004',
    name: 'Chennai Champions',
    role: 'admin',
    memberCount: 20,
  },
}

/* ------------------------------------------------------------------ */
/* NewGang — 1/20 members (just created)                                */
/* ------------------------------------------------------------------ */

export const NewGang: Story = {
  args: {
    id: 'gang-005',
    name: 'Kolkata Knights',
    role: 'admin',
    memberCount: 1,
  },
}

/* ------------------------------------------------------------------ */
/* Long Name — tests text overflow behavior                             */
/* ------------------------------------------------------------------ */

export const LongName: Story = {
  args: {
    id: 'gang-006',
    name: 'The Incredibly Long Gang Name That Tests Overflow',
    role: 'member',
    memberCount: 15,
  },
}
