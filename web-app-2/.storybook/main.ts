import type { StorybookConfig } from '@storybook/nextjs-vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      // Mock server-only modules that crash in the browser
      'posthog-node': path.resolve(__dirname, './mocks/posthog-node.ts'),
      'server-only': path.resolve(__dirname, './mocks/server-only.ts'),
      crypto: path.resolve(__dirname, './mocks/crypto.ts'),
    }
    return config
  },
}
export default config
