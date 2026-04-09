import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card'
import { Badge } from './badge'
import { Button } from './button'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default                                                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          A short description of the card content goes here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-text-secondary">
          This is the main content area of the card.
        </p>
      </CardContent>
    </Card>
  ),
}

/* ------------------------------------------------------------------ */
/* With Hover (visual — hover to see border + lift)                    */
/* ------------------------------------------------------------------ */

export const WithHover: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-text-muted">
        Hover over the card to see the border + lift effect
      </p>
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Hover Me</CardTitle>
          <CardDescription>
            The border turns lime and the card lifts on hover.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-text-secondary">
            Built-in transition: border-color changes to lime-wire and
            translateY(-2px) lift.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
}

/* ------------------------------------------------------------------ */
/* With Content (mock match card)                                      */
/* ------------------------------------------------------------------ */

export const WithContent: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>MI vs CSK</CardTitle>
          <Badge variant="lime">Live</Badge>
        </div>
        <CardDescription>Match 12 &middot; Wankhede Stadium</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-stat text-text-primary">156/4</p>
            <p className="text-caption text-text-muted">MI &middot; 16.2 ov</p>
          </div>
          <div className="text-right">
            <p className="text-stat text-text-primary">148/7</p>
            <p className="text-caption text-text-muted">
              CSK &middot; 20.0 ov
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <p className="text-body-sm text-text-secondary">
          MI need 9 runs from 22 balls
        </p>
        <Button size="sm">Predict</Button>
      </CardFooter>
    </Card>
  ),
}

/* ------------------------------------------------------------------ */
/* With Footer                                                         */
/* ------------------------------------------------------------------ */

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Your Gang</CardTitle>
        <CardDescription>Manage your prediction group</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-text-secondary">
          5 members &middot; 12 predictions this week
        </p>
      </CardContent>
      <CardFooter className="gap-3">
        <Button variant="secondary" size="sm">
          Settings
        </Button>
        <Button size="sm">View Gang</Button>
      </CardFooter>
    </Card>
  ),
}
