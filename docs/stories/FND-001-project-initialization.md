# FND-001: Project Initialization

**Phase:** 1 — Foundation
**Dependencies:** None
**Estimated scope:** Next.js 16 project scaffolding with TypeScript, Tailwind v4, shadcn/ui, ESLint, Prettier

---

## Description

Initialize the Next.js 16 project inside `web-app/` with App Router, TypeScript strict mode, Tailwind CSS v4, shadcn/ui, ESLint, and Prettier. This is the absolute foundation — every other story depends on this.

---

## Acceptance Criteria

- [ ] `web-app/` contains a working Next.js 16 project (App Router)
- [ ] TypeScript configured with `strict: true` in `tsconfig.json`
- [ ] Tailwind CSS v4 installed and configured
- [ ] shadcn/ui initialized with `new-york` style, dark theme defaults
- [ ] ESLint configured with Next.js recommended rules + strict TypeScript rules
- [ ] Prettier configured (single quotes, trailing commas, 2-space indent, no semicolons unless required)
- [ ] `.nvmrc` file set to Node 20
- [ ] `npm run dev` starts the dev server without errors
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes with zero errors and zero warnings
- [ ] Placeholder `page.tsx` renders "Bragg" text on dark background
- [ ] Path aliases configured: `@/` → `src/`

---

## Files to Create

```
web-app/
├── .nvmrc                          # "20"
├── .prettierrc                     # Prettier config
├── .eslintrc.json                  # ESLint config (or eslint.config.mjs for flat config)
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind v4 config (if needed — v4 may use CSS-based config)
├── tsconfig.json                   # TypeScript strict config
├── postcss.config.mjs              # PostCSS config for Tailwind
├── package.json
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Minimal root layout (html, body)
│   │   ├── page.tsx                # Placeholder landing page
│   │   └── globals.css             # Tailwind directives + base styles
│   └── lib/
│       └── utils.ts                # shadcn/ui cn() utility
└── components.json                 # shadcn/ui config
```

---

## Technical Notes

### Next.js 16 Config
- App Router only (no Pages Router)
- `reactStrictMode: true`
- Output: standalone (for Vercel deployment)

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### ESLint Rules (key additions beyond Next.js defaults)
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unused-vars`: error (with `argsIgnorePattern: "^_"`)
- `no-console`: warn (allow `console.error` and `console.warn`)
- Ensure Prettier integration (eslint-config-prettier)

### Prettier Config
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Tailwind v4
- Tailwind v4 uses CSS-based configuration (`@theme` in CSS) rather than `tailwind.config.ts`
- Import via `@import "tailwindcss"` in `globals.css`
- Design tokens will be configured in FND-003

### shadcn/ui
- Initialize with: `npx shadcn@latest init`
- Style: `new-york`
- Base color: neutral (will be overridden with Electric Street tokens in FND-003)
- CSS variables: yes
- Path aliases: `@/components`, `@/lib`

---

## Testing Requirements

- `npm run dev` starts without errors
- `npm run build` succeeds
- `npm run lint` passes clean
- Browser shows placeholder page at `localhost:3000`

---

## npm Scripts (expected)

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```
