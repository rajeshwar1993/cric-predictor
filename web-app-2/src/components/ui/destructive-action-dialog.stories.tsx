import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { DestructiveActionDialog } from './destructive-action-dialog'
import { Button } from './button'

const meta = {
  title: 'UI/DestructiveActionDialog',
  component: DestructiveActionDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof DestructiveActionDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Delete Gang',
    description:
      'This will permanently delete the gang and remove all members. This action cannot be undone.',
    confirmValue: 'DELETE',
    confirmLabel: 'Delete Gang',
    open: true,
    onConfirm: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    },
    onOpenChange: () => undefined,
  },
}

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button
          variant="destructive"
          onClick={() => {
            setOpen(true)
          }}
        >
          Delete Account
        </Button>
        <DestructiveActionDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Account"
          description="This will delete your account and remove you from all gangs. You can re-sign-in later to restore your account."
          confirmValue="DELETE MY ACCOUNT"
          confirmLabel="Delete Account"
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 1500))
            setOpen(false)
          }}
        />
      </>
    )
  },
}
