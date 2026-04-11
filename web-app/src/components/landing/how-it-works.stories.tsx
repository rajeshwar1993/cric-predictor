import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { HowItWorks } from './how-it-works'

const meta = {
  title: 'Landing/HowItWorks',
  component: HowItWorks,
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
} satisfies Meta<typeof HowItWorks>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — three-step explainer                                      */
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
