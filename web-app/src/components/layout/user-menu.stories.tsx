import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState, useEffect } from 'react'
import { UserMenu } from './user-menu'

const meta = {
  title: 'Layout/UserMenu',
  component: UserMenu,
  tags: ['autodocs'],
  args: {
    displayName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
  },
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex h-16 items-center justify-center bg-concrete-black px-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserMenu>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Closed — just the avatar                                            */
/* ------------------------------------------------------------------ */

export const Closed: Story = {}

/* ------------------------------------------------------------------ */
/* Open — panel visible with nav links                                 */
/* ------------------------------------------------------------------ */

/**
 * Helper that auto-opens the user menu panel after mount so the story
 * renders with the panel already visible.
 */
function AutoOpenUserMenu(props: { displayName: string; email: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Click the avatar button after mount to open the panel
    const timer = setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        '[aria-label="Open user menu"]',
      )
      btn?.click()
      setMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={mounted ? '' : 'opacity-0'}>
      <UserMenu {...props} />
    </div>
  )
}

export const Open: Story = {
  render: (args) => (
    <AutoOpenUserMenu displayName={args.displayName} email={args.email} />
  ),
}

/* ------------------------------------------------------------------ */
/* Active Dashboard link                                               */
/* ------------------------------------------------------------------ */

export const ActiveDashboard: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
      },
    },
  },
  render: (args) => (
    <AutoOpenUserMenu displayName={args.displayName} email={args.email} />
  ),
}

/* ------------------------------------------------------------------ */
/* Active Profile link                                                 */
/* ------------------------------------------------------------------ */

export const ActiveProfile: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/profile',
      },
    },
  },
  render: (args) => (
    <AutoOpenUserMenu displayName={args.displayName} email={args.email} />
  ),
}
