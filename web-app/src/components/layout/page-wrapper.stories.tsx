import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageWrapper } from './page-wrapper'

const meta = {
  title: 'Layout/PageWrapper',
  component: PageWrapper,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="bg-concrete-black min-h-dvh text-text-primary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageWrapper>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default                                                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    children: (
      <div className="space-y-4 pt-6">
        <h1 className="text-h1 text-text-primary">Default PageWrapper</h1>
        <p className="text-body text-text-secondary">
          This page uses the default max-width of 720px. The content is
          horizontally centered with 16px padding on mobile and 32px on
          tablet+. A 34px bottom safe-area pad protects content on notched
          devices.
        </p>
        <div className="rounded-md border border-wire bg-dark-concrete p-4">
          <p className="text-body-sm text-text-muted">
            Sample card content to visualise the max-width constraint.
          </p>
        </div>
      </div>
    ),
  },
}

/* ------------------------------------------------------------------ */
/* NarrowWidth (maxWidth="sm")                                         */
/* ------------------------------------------------------------------ */

export const NarrowWidth: Story = {
  args: {
    maxWidth: 'sm',
    children: (
      <div className="space-y-4 pt-6">
        <h1 className="text-h2 text-text-primary">Narrow Layout</h1>
        <p className="text-body text-text-secondary">
          This page uses <code className="text-bragg-lime">maxWidth=&quot;sm&quot;</code> (480px).
          Ideal for auth flows, onboarding, and focused single-column forms.
        </p>
        <div className="rounded-md border border-wire bg-dark-concrete p-4">
          <p className="text-body-sm text-text-muted">
            Narrower content area for focused interactions.
          </p>
        </div>
      </div>
    ),
  },
}

/* ------------------------------------------------------------------ */
/* WithLongContent (scrollable)                                        */
/* ------------------------------------------------------------------ */

export const WithLongContent: Story = {
  args: {
    children: (
      <div className="space-y-6 pt-6">
        <h1 className="text-h1 text-text-primary">Long Content</h1>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="rounded-md border border-wire bg-dark-concrete p-4"
          >
            <h3 className="text-h4 text-text-primary">
              Section {i + 1}
            </h3>
            <p className="text-body-sm text-text-secondary mt-2">
              This demonstrates how PageWrapper handles long scrollable
              content. The 34px bottom padding ensures the last section is
              never hidden behind a phone&apos;s home indicator.
            </p>
          </div>
        ))}
      </div>
    ),
  },
}
