import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { getAvatarInitials } from '@/lib/utils'

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default (with fallback initials)                                    */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>{getAvatarInitials('Rajesh Kumar')}</AvatarFallback>
    </Avatar>
  ),
}

/* ------------------------------------------------------------------ */
/* All sizes                                                           */
/* ------------------------------------------------------------------ */

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback>{getAvatarInitials('Virat Kohli')}</AvatarFallback>
        </Avatar>
        <p className="text-caption text-text-muted">32px</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar size="default">
          <AvatarFallback>{getAvatarInitials('Rohit Sharma')}</AvatarFallback>
        </Avatar>
        <p className="text-caption text-text-muted">40px</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar size="lg">
          <AvatarFallback>
            {getAvatarInitials('Jasprit Bumrah')}
          </AvatarFallback>
        </Avatar>
        <p className="text-caption text-text-muted">56px</p>
      </div>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* With initials (various names)                                       */
/* ------------------------------------------------------------------ */

export const WithInitials: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {[
        'Rajesh Kumar',
        'Virat',
        'MS Dhoni',
        'AB de Villiers',
        '',
      ].map((name) => (
        <Avatar key={name || 'empty'}>
          <AvatarFallback>{getAvatarInitials(name)}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* With Image                                                          */
/* ------------------------------------------------------------------ */

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        src="https://api.dicebear.com/9.x/initials/svg?seed=RK"
        alt="Rajesh Kumar"
      />
      <AvatarFallback>{getAvatarInitials('Rajesh Kumar')}</AvatarFallback>
    </Avatar>
  ),
}

/* ------------------------------------------------------------------ */
/* With team color override                                            */
/* ------------------------------------------------------------------ */

export const WithTeamColor: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarFallback className="bg-vivid-blue">
          {getAvatarInitials('Mumbai Indians')}
        </AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback className="bg-sunburst-yellow">
          {getAvatarInitials('Chennai Super Kings')}
        </AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback className="bg-electric-coral">
          {getAvatarInitials('Royal Challengers')}
        </AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback className="bg-ultraviolet">
          {getAvatarInitials('Kolkata Riders')}
        </AvatarFallback>
      </Avatar>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* Avatar group                                                        */
/* ------------------------------------------------------------------ */

export const AvatarGroupExample: Story = {
  render: () => (
    <div className="flex -space-x-2">
      {['Rajesh Kumar', 'Virat Kohli', 'MS Dhoni', 'Rohit Sharma'].map(
        (name) => (
          <Avatar
            key={name}
            className="ring-2 ring-concrete-black"
          >
            <AvatarFallback>{getAvatarInitials(name)}</AvatarFallback>
          </Avatar>
        )
      )}
      <div className="flex size-10 items-center justify-center rounded-full bg-mid-concrete text-xs font-bold text-text-secondary ring-2 ring-concrete-black">
        +3
      </div>
    </div>
  ),
}
