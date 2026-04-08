# FND-004: Storybook + Testing Infrastructure

**Phase:** 1 — Foundation
**Dependencies:** FND-001
**Estimated scope:** Storybook 8 config, Jest + RTL setup, Playwright scaffolding

---

## Description

Set up the three testing layers: Storybook for component documentation and visual testing, Jest + React Testing Library for unit/integration tests, and Playwright scaffolding for future E2E tests.

---

## Acceptance Criteria

- [ ] Storybook 8 runs with `npm run storybook` — opens at localhost:6006
- [ ] Storybook configured for: App Router, Tailwind CSS, dark theme, next/font mocking
- [ ] `@storybook/addon-a11y` installed for accessibility checks
- [ ] Storybook decorators apply Electric Street dark theme background
- [ ] Jest configured with `@testing-library/react` and `@testing-library/jest-dom`
- [ ] Jest can run TypeScript tests with path alias support (`@/`)
- [ ] `npm run test` runs Jest in watch mode
- [ ] `npm run test:ci` runs Jest in CI mode (single run, coverage)
- [ ] Playwright config scaffolded (not fully configured — just the foundation)
- [ ] `e2e/` directory created with a placeholder test

---

## Files to Create

```
web-app/
├── .storybook/
│   ├── main.ts                     # Storybook config
│   ├── preview.ts                  # Global decorators, dark theme
│   └── preview-head.html           # Font links (if needed)
├── e2e/
│   └── example.spec.ts             # Placeholder Playwright test
├── jest.config.ts                  # Jest config
├── jest.setup.ts                   # jest-dom extensions
├── playwright.config.ts            # Playwright config (basic)
```

---

## Technical Notes

### Storybook Config (`.storybook/main.ts`)
```typescript
import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: { nextConfigPath: '../next.config.ts' },
  },
  staticDirs: ['../public'],
}
export default config
```

### Storybook Preview (`.storybook/preview.ts`)
```typescript
import type { Preview } from '@storybook/react'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'concrete-black',
      values: [
        { name: 'concrete-black', value: '#111111' },
        { name: 'dark-concrete', value: '#1A1A1A' },
      ],
    },
    layout: 'centered',
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
```

### Jest Config (`jest.config.ts`)
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
}

export default createJestConfig(config)
```

### npm Scripts to Add
```json
{
  "test": "jest --watch",
  "test:ci": "jest --ci --coverage",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

### Dependencies to Install
```bash
# Storybook
npx storybook@latest init --type nextjs

# Testing
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom

# Playwright (scaffolding only)
npm install -D @playwright/test
```

---

## Testing Requirements

- [ ] `npm run storybook` starts without errors
- [ ] `npm run test` finds and runs test files
- [ ] Create a trivial test to verify setup works:
  ```typescript
  // src/lib/utils.test.ts
  import { cn } from './utils'
  test('cn merges classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  ```
