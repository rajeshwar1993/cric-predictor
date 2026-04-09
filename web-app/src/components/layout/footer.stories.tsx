import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Footer } from './footer'

const meta = {
  title: 'Layout/Footer',
  component: Footer,
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
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

/* ------------------------------------------------------------------ */
/* Default                                                             */
/* ------------------------------------------------------------------ */

export const Default: Story = {}

/* ------------------------------------------------------------------ */
/* InContext — footer at the bottom of a page with content above       */
/* ------------------------------------------------------------------ */

export const InContext: Story = {
  render: () => (
    <div className="flex min-h-dvh flex-col bg-concrete-black text-text-primary">
      <main className="flex-1 px-4 pt-6">
        <div className="mx-auto max-w-[720px] space-y-4">
          <h1 className="text-h1 text-text-primary">Dashboard</h1>
          <p className="text-body text-text-secondary">
            This story shows the footer at the bottom of a full-height page,
            demonstrating the flex-col layout that pins the footer to the
            bottom even when content is short.
          </p>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-md border border-wire bg-dark-concrete p-4"
            >
              <h3 className="text-h4 text-text-primary">
                Section {i + 1}
              </h3>
              <p className="text-body-sm text-text-muted mt-2">
                Sample content to visualise the footer in context with page
                content above it.
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  ),
  decorators: [],
}
