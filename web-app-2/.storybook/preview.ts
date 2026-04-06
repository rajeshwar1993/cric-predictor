import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  decorators: [
    (Story) => {
      // Ensure dark class is always applied for Bragg (dark-mode-only app)
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = 'var(--bg-base)'
      document.body.style.color = 'var(--text-primary)'
      return Story()
    },
  ],
}

export default preview
