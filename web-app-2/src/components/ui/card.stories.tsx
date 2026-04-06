import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Gang Name</CardTitle>
        <CardDescription>8 members · IPL 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Your next match prediction is due in 2 hours.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Match Predictions</CardTitle>
        <CardDescription>CSK vs MI · March 28, 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <p>You predicted 15 out of 19 scenarios.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <p>42 points this match</p>
      </CardContent>
    </Card>
  ),
}
