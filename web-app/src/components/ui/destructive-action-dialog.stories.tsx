import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { useState } from 'react'
import { DestructiveActionDialog } from './destructive-action-dialog'
import { Button } from './button'

const meta = {
  title: 'UI/DestructiveActionDialog',
  component: DestructiveActionDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    onConfirm: fn(),
    onOpenChange: fn(),
    title: 'Delete Gang',
    description:
      'This will permanently delete the gang and all associated data. This cannot be undone.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Delete Gang',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DestructiveActionDialog>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Helper wrapper for interactive stories                               */
/* ------------------------------------------------------------------ */

function InteractiveWrapper(props: {
  title: string
  description: string
  confirmValue: string
  confirmLabel?: string
  isLoading?: boolean
  buttonLabel?: string
  caseSensitive?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {props.buttonLabel ?? 'Open Dialog'}
      </Button>
      <DestructiveActionDialog
        open={open}
        onOpenChange={setOpen}
        title={props.title}
        description={props.description}
        confirmValue={props.confirmValue}
        confirmLabel={props.confirmLabel}
        isLoading={props.isLoading}
        caseSensitive={props.caseSensitive}
        onConfirm={() => {
          // no-op in stories
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const DeleteGang: Story = {
  args: {
    open: true,
    title: 'Delete Gang',
    description:
      'This will permanently delete the gang and all associated data. This cannot be undone.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Delete Gang',
  },
  render: () => (
    <InteractiveWrapper
      title="Delete Gang"
      description="This will permanently delete the gang and all associated data. This cannot be undone."
      confirmValue="Street Legends"
      confirmLabel="Delete Gang"
      buttonLabel="Delete Gang"
    />
  ),
}

export const DeleteAccount: Story = {
  args: {
    open: true,
    title: 'Delete Account',
    description:
      'This will permanently delete your account, all your predictions, and remove you from all gangs. This cannot be undone.',
    confirmValue: 'rajesh@example.com',
    confirmLabel: 'Delete My Account',
  },
  render: () => (
    <InteractiveWrapper
      title="Delete Account"
      description="This will permanently delete your account, all your predictions, and remove you from all gangs. This cannot be undone."
      confirmValue="rajesh@example.com"
      confirmLabel="Delete My Account"
      buttonLabel="Delete Account"
    />
  ),
}

export const LeaveGang: Story = {
  args: {
    open: true,
    title: 'Leave Gang',
    description:
      'You will lose your rank and prediction history in this gang. You can rejoin later with a new invite.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Leave Gang',
  },
  render: () => (
    <InteractiveWrapper
      title="Leave Gang"
      description="You will lose your rank and prediction history in this gang. You can rejoin later with a new invite."
      confirmValue="Street Legends"
      confirmLabel="Leave Gang"
      buttonLabel="Leave Gang"
    />
  ),
}

export const RemoveMember: Story = {
  args: {
    open: true,
    title: 'Remove Member',
    description:
      'This will remove the member from the gang. Their predictions will be preserved but they will no longer earn points.',
    confirmValue: 'Virat K',
    confirmLabel: 'Remove Member',
  },
  render: () => (
    <InteractiveWrapper
      title="Remove Member"
      description="This will remove the member from the gang. Their predictions will be preserved but they will no longer earn points."
      confirmValue="Virat K"
      confirmLabel="Remove Member"
      buttonLabel="Remove Member"
    />
  ),
}

export const Loading: Story = {
  args: {
    open: true,
    title: 'Delete Gang',
    description:
      'This will permanently delete the gang and all associated data.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Delete Gang',
    isLoading: true,
  },
  render: () => (
    <InteractiveWrapper
      title="Delete Gang"
      description="This will permanently delete the gang and all associated data."
      confirmValue="Street Legends"
      confirmLabel="Delete Gang"
      isLoading={true}
      buttonLabel="Loading State"
    />
  ),
}

export const Disabled: Story = {
  args: {
    open: true,
    title: 'Delete Gang',
    description:
      'This will permanently delete the gang and all associated data. This cannot be undone.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Delete Gang',
  },
}

export const CaseSensitive: Story = {
  args: {
    open: true,
    title: 'Delete Gang',
    description:
      'Case-sensitive confirmation — "street legends" will NOT match.',
    confirmValue: 'Street Legends',
    confirmLabel: 'Delete Gang',
    caseSensitive: true,
  },
  render: () => (
    <InteractiveWrapper
      title="Delete Gang"
      description='Case-sensitive confirmation — "street legends" will NOT match.'
      confirmValue="Street Legends"
      confirmLabel="Delete Gang"
      caseSensitive
      buttonLabel="Delete Gang (case-sensitive)"
    />
  ),
}
