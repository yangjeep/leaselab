# @leaselab/ui-components

Shared shadcn/ui-inspired primitives for the LeaseLab apps. Components live in `src/components/ui` and are written in TypeScript so Remix + Vite can consume them directly without a build step.

## Usage

```tsx
import { Button } from "@leaselab/ui-components"

export function Example() {
  return <Button variant="secondary">Click me</Button>
}
```

## Development Notes

- Utilities live in `src/lib`. The `cn` helper keeps class merging consistent.
- Keep components presentational. Domain-specific logic stays inside each app.
- Export new components from `src/index.ts` so both Ops and Site can import them.
- Tailwind v4 scans the shared package via the `@source` directives that were added to each app’s `tailwind-config.css`.
