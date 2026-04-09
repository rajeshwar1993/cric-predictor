import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { useState } from 'react'
import { SidePanel } from './side-panel'
import { Button } from './button'

const meta = {
  title: 'UI/SidePanel',
  component: SidePanel,
  tags: ['autodocs'],
  args: {
    side: 'right',
    title: 'Panel',
    open: true,
    onOpenChange: fn(),
    children: null,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SidePanel>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Helper wrapper for interactive stories                               */
/* ------------------------------------------------------------------ */

function InteractiveWrapper(props: {
  side: 'left' | 'right'
  title: string
  children: React.ReactNode
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex h-screen items-center justify-center bg-concrete-black">
      <Button onClick={() => setOpen(true)}>
        {props.buttonLabel ?? `Open ${props.title}`}
      </Button>
      <SidePanel
        side={props.side}
        title={props.title}
        open={open}
        onOpenChange={setOpen}
      >
        {props.children}
      </SidePanel>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mock data for notifications                                          */
/* ------------------------------------------------------------------ */

function NotificationItem({
  title,
  message,
  time,
}: {
  title: string
  message: string
  time: string
}) {
  return (
    <div className="border-b border-wire py-3 last:border-b-0">
      <p className="text-body-sm font-medium text-text-primary">{title}</p>
      <p className="text-body-sm text-text-secondary">{message}</p>
      <p className="mt-1 text-xs text-text-muted">{time}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const Right: Story = {
  args: {
    side: 'right',
    title: 'Notifications',
    open: true,
  },
  render: () => (
    <InteractiveWrapper
      side="right"
      title="Notifications"
      buttonLabel="Open Notifications"
    >
      <div className="flex flex-col">
        <NotificationItem
          title="Match started!"
          message="MI vs CSK is now live. Make your predictions before the cutoff."
          time="2 minutes ago"
        />
        <NotificationItem
          title="New member joined"
          message="Virat K joined Street Legends."
          time="1 hour ago"
        />
        <NotificationItem
          title="Results are in!"
          message="Match #12 leaderboard is now available. Check your rank."
          time="3 hours ago"
        />
      </div>
    </InteractiveWrapper>
  ),
}

export const Left: Story = {
  args: {
    side: 'left',
    title: 'Menu',
    open: true,
  },
  render: () => (
    <InteractiveWrapper side="left" title="Menu" buttonLabel="Open Menu">
      <nav className="flex flex-col gap-1">
        {['Dashboard', 'Profile', 'Settings', 'Help'].map((item) => (
          <button
            key={item}
            className="rounded-md px-3 py-2.5 text-left text-body font-medium text-text-secondary transition-colors hover:bg-light-concrete hover:text-text-primary"
          >
            {item}
          </button>
        ))}
        <div className="my-2 h-px bg-wire" />
        <button className="rounded-md px-3 py-2.5 text-left text-body font-medium text-electric-coral transition-colors hover:bg-electric-coral/10">
          Sign Out
        </button>
      </nav>
    </InteractiveWrapper>
  ),
}

export const Scrollable: Story = {
  args: {
    side: 'right',
    title: 'Activity',
    open: true,
  },
  render: () => (
    <InteractiveWrapper
      side="right"
      title="Activity"
      buttonLabel="Open Scrollable"
    >
      <div className="flex flex-col">
        {Array.from({ length: 20 }, (_, i) => (
          <NotificationItem
            key={i}
            title={`Activity ${i + 1}`}
            message={`This is a sample activity item number ${i + 1} with enough text to demonstrate scrolling behavior in the side panel.`}
            time={`${i + 1}h ago`}
          />
        ))}
      </div>
    </InteractiveWrapper>
  ),
}

export const Empty: Story = {
  args: {
    side: 'right',
    title: 'Notifications',
    open: true,
  },
  render: () => (
    <InteractiveWrapper
      side="right"
      title="Notifications"
      buttonLabel="Open Empty"
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-h4 text-text-secondary">No notifications</p>
        <p className="mt-1 text-body-sm text-text-muted">
          You&apos;re all caught up!
        </p>
      </div>
    </InteractiveWrapper>
  ),
}
