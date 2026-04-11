import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PredictionPreview } from './prediction-preview'

const meta = {
  title: 'Landing/PredictionPreview',
  component: PredictionPreview,
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
} satisfies Meta<typeof PredictionPreview>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — 5 mock scenarios, static (no pickers)                     */
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
