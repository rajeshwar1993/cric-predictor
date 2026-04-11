import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CtaSection } from './cta-section'

const meta = {
  title: 'Landing/CtaSection',
  component: CtaSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-concrete-black min-h-dvh text-text-primary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CtaSection>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — bottom-of-page CTA with disclaimer                        */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Mobile — 375px frame                                                */
/* ------------------------------------------------------------------ */

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
