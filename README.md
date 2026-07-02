# AARDVARK - Acedrg atom-type reference data and validation kit

## Stack

- **Vite 8** — dev server & build
- **React 19** + **TypeScript 6**
- **React Router 7** — routing (`src/router.tsx`)
- **TanStack Query 5** — server state (`src/lib/queryClient.ts`)
- **Vitest** + **Testing Library** — unit/component tests (jsdom)
- **oxlint** — fast linting
- **Prettier** — formatting
- **Husky** + **lint-staged** — pre-commit lint/format
- **CSS Modules** — scoped, co-located styles (`*.module.css`)
- Path alias `@/` → `src/`

## Scripts

```bash
pnpm dev           # start dev server
pnpm build         # type-check + production build
pnpm preview       # preview the production build
pnpm test          # run tests in watch mode
pnpm test:run      # run tests once
pnpm test:ui       # open the Vitest UI
pnpm coverage      # run tests with coverage report
pnpm lint          # run oxlint
pnpm format        # format with Prettier
pnpm format:check  # check formatting
```

## Structure

Each component lives in its own folder with its CSS module, test and a barrel
`index.ts`, so it imports cleanly as `@/components/Button`:

```
src/
  components/
    Button/
      Button.tsx
      Button.module.css
      Button.test.tsx
      index.ts          # export * from './Button'
    Badge/  Card/  FeatureCard/  Footer/
    Logo/  Navbar/  MoleculeGlyph/  icons/
  pages/        route-level views (LandingPage, ValidatePage)
  lib/          shared singletons & helpers (queryClient, motion presets)
  test/         test setup
  App.tsx       layout route (<Outlet/>)
  router.tsx    route definitions
  main.tsx      app entry (providers)
```
