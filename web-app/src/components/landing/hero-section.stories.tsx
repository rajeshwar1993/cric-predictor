import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { HeroSection } from './hero-section'

const meta = {
  title: 'Landing/HeroSection',
  component: HeroSection,
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
} satisfies Meta<typeof HeroSection>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default — the landing hero as it ships                              */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* Mobile — 375px frame to verify mobile-first layout                  */
/* ------------------------------------------------------------------ */

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}
