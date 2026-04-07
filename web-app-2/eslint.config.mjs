// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/stories/**',
    '.storybook/**',
    'storybook-static/**',
  ]),
  // Strict TypeScript rules (type-aware)
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
  })),
  // Project-specific overrides
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // General rules
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
    },
  },
  // Block service-role imports from anywhere except server actions
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/lib/actions/**', 'src/lib/supabase/service-role.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/supabase/service-role', '@/lib/supabase/service-role'],
              message: 'service-role client may only be imported from src/lib/actions/**',
            },
          ],
        },
      ],
    },
  },
  // Prettier must be last to override formatting rules
  eslintConfigPrettier,
  ...storybook.configs['flat/recommended'],
])

export default eslintConfig
