import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageWrapper } from './page-wrapper'

const meta = {
  title: 'Layout/PageWrapper',
  component: PageWrapper,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div
        className="rounded-[var(--radius-ds-lg)] border p-4"
        style={{
          borderColor: 'var(--border-default)',
          backgroundColor: 'var(--bg-raised)',
          color: 'var(--text-primary)',
        }}
      >
        Page content goes here. The wrapper constrains width to 480px and adds horizontal padding.
      </div>
    ),
  },
}

export const WithContent: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div
          className="rounded-[var(--radius-ds-lg)] border p-4"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-raised)',
          }}
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your gangs</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You haven&apos;t joined any gangs yet.
          </p>
        </div>
        <div
          className="rounded-[var(--radius-ds-lg)] border p-4"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-raised)',
          }}
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming matches</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No matches scheduled right now.
          </p>
        </div>
      </div>
    ),
  },
}
