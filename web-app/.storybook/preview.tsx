import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    // Tell `@storybook/nextjs-vite` to use the App Router navigation mocks
    // (useRouter, useParams, useSearchParams, usePathname) so client
    // components that call these hooks render without "invariant expected
    // app router to be mounted" errors.
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      default: 'concrete-black',
      values: [
        { name: 'concrete-black', value: '#111111' },
        { name: 'dark-concrete', value: '#1A1A1A' },
      ],
    },
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <div className="font-body text-text-primary" style={{ minHeight: '100px' }}>
        <Story />
      </div>
    ),
  ],
}

export default preview
