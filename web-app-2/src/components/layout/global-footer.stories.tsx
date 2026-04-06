import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GlobalFooter } from './global-footer'

const meta = {
  title: 'Layout/GlobalFooter',
  component: GlobalFooter,
  tags: ['autodocs'],
} satisfies Meta<typeof GlobalFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
