# shadcn/ui Implementation Plan

**Purpose**: Step-by-step guide to integrate shadcn/ui with Tailwind CSS v4 across Ops and Site apps.

**Last Updated**: 2025-12-18

---

## Overview

This document provides a comprehensive implementation plan for integrating shadcn/ui into the LeaseLab monorepo. The integration will create a shared UI component library that both Ops and Site apps can consume.

---

## Phase 1: Shared UI Package Setup

### Step 1.1: Create Shared UI Package Structure

Create the new shared package directory:

```bash
mkdir -p shared/ui-components/src/{components/ui,lib,hooks}
cd shared/ui-components
```

**Directory structure:**
```
shared/ui-components/
├── package.json
├── tsconfig.json
├── src/
│   ├── components/
│   │   └── ui/          # shadcn components go here
│   ├── lib/
│   │   └── utils.ts     # cn() utility
│   ├── hooks/           # Shared hooks
│   └── index.ts         # Main exports
└── components.json      # shadcn configuration
```

### Step 1.2: Create Package Configuration

**File: `shared/ui-components/package.json`**

```json
{
  "name": "@leaselab/ui-components",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./ui/*": "./src/components/ui/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.9.3"
  }
}
```

**File: `shared/ui-components/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.3: Create Utility Functions

**File: `shared/ui-components/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**File: `shared/ui-components/src/index.ts`**

```typescript
// Utilities
export { cn } from "./lib/utils"

// Components will be exported as they're added
// Example: export { Button } from "./components/ui/button"
```

### Step 1.4: Install Dependencies

```bash
# From the root of the monorepo
npm install -w @leaselab/ui-components
```

---

## Phase 2: Configure shadcn/ui for Both Apps

### Step 2.1: Create shadcn Configuration for Ops App

**File: `apps/ops/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "app/tailwind-config.css",
    "css": "app/tailwind.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@leaselab/ui-components/components",
    "utils": "@leaselab/ui-components/lib/utils",
    "ui": "@leaselab/ui-components/components/ui"
  }
}
```

### Step 2.2: Create shadcn Configuration for Site App

**File: `apps/site/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "app/tailwind-config.css",
    "css": "app/tailwind.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@leaselab/ui-components/components",
    "utils": "@leaselab/ui-components/lib/utils",
    "ui": "@leaselab/ui-components/components/ui"
  }
}
```

---

## Phase 3: Extend Tailwind Configuration

### Step 3.1: Update Ops App Tailwind Config

**File: `apps/ops/app/tailwind-config.css`**

Update the existing file to include shadcn theme variables:

```css
@import "tailwindcss";

@source "../app/**/*.{js,jsx,ts,tsx}";

/* Import shared components for scanning */
@source "../../shared/ui-components/src/**/*.{js,jsx,ts,tsx}";

@theme {
  /* Existing font configuration */
  --font-family-sans: 'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';

  /* shadcn/ui theme variables */
  --radius: 0.5rem;

  /* Light mode colors */
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-card: 0 0% 100%;
  --color-card-foreground: 222.2 84% 4.9%;
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 222.2 84% 4.9%;
  --color-primary: 222.2 47.4% 11.2%;
  --color-primary-foreground: 210 40% 98%;
  --color-secondary: 210 40% 96.1%;
  --color-secondary-foreground: 222.2 47.4% 11.2%;
  --color-muted: 210 40% 96.1%;
  --color-muted-foreground: 215.4 16.3% 46.9%;
  --color-accent: 210 40% 96.1%;
  --color-accent-foreground: 222.2 47.4% 11.2%;
  --color-destructive: 0 84.2% 60.2%;
  --color-destructive-foreground: 210 40% 98%;
  --color-border: 214.3 31.8% 91.4%;
  --color-input: 214.3 31.8% 91.4%;
  --color-ring: 222.2 84% 4.9%;
  --color-chart-1: 12 76% 61%;
  --color-chart-2: 173 58% 39%;
  --color-chart-3: 197 37% 24%;
  --color-chart-4: 43 74% 66%;
  --color-chart-5: 27 87% 67%;
}

/* Dark mode override */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: 222.2 84% 4.9%;
    --color-foreground: 210 40% 98%;
    --color-card: 222.2 84% 4.9%;
    --color-card-foreground: 210 40% 98%;
    --color-popover: 222.2 84% 4.9%;
    --color-popover-foreground: 210 40% 98%;
    --color-primary: 210 40% 98%;
    --color-primary-foreground: 222.2 47.4% 11.2%;
    --color-secondary: 217.2 32.6% 17.5%;
    --color-secondary-foreground: 210 40% 98%;
    --color-muted: 217.2 32.6% 17.5%;
    --color-muted-foreground: 215 20.2% 65.1%;
    --color-accent: 217.2 32.6% 17.5%;
    --color-accent-foreground: 210 40% 98%;
    --color-destructive: 0 62.8% 30.6%;
    --color-destructive-foreground: 210 40% 98%;
    --color-border: 217.2 32.6% 17.5%;
    --color-input: 217.2 32.6% 17.5%;
    --color-ring: 212.7 26.8% 83.9%;
    --color-chart-1: 220 70% 50%;
    --color-chart-2: 160 60% 45%;
    --color-chart-3: 30 80% 55%;
    --color-chart-4: 280 65% 60%;
    --color-chart-5: 340 75% 55%;
  }
}
```

### Step 3.2: Update Site App Tailwind Config

**File: `apps/site/app/tailwind-config.css`**

Since Site app has custom utilities, we'll integrate shadcn variables alongside existing styles:

```css
@import "tailwindcss";

@source "../app/**/*.{js,jsx,ts,tsx}";

/* Import shared components for scanning */
@source "../../shared/ui-components/src/**/*.{js,jsx,ts,tsx}";

@theme {
  /* Existing font configuration */
  --font-family-sans: 'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';

  /* shadcn/ui theme variables - adapted to existing dark theme */
  --radius: 0.75rem; /* Match existing btn/card radius */

  /* Dark mode colors (Site is dark by default) */
  --color-background: 222.2 84% 4.9%;
  --color-foreground: 210 40% 98%;
  --color-card: 222.2 84% 4.9%;
  --color-card-foreground: 210 40% 98%;
  --color-popover: 222.2 84% 4.9%;
  --color-popover-foreground: 210 40% 98%;
  --color-primary: 210 40% 98%;
  --color-primary-foreground: 222.2 47.4% 11.2%;
  --color-secondary: 217.2 32.6% 17.5%;
  --color-secondary-foreground: 210 40% 98%;
  --color-muted: 217.2 32.6% 17.5%;
  --color-muted-foreground: 215 20.2% 65.1%;
  --color-accent: 217.2 32.6% 17.5%;
  --color-accent-foreground: 210 40% 98%;
  --color-destructive: 0 62.8% 30.6%;
  --color-destructive-foreground: 210 40% 98%;
  --color-border: 217.2 32.6% 17.5%;
  --color-input: 217.2 32.6% 17.5%;
  --color-ring: 212.7 26.8% 83.9%;
}
```

**File: `apps/site/app/tailwind.css`**

Keep existing custom utilities:

```css
@import "./tailwind-config.css";

/* Existing custom variables */
:root {
  --bg: #0b0c10;
  --fg: #e5e7eb;
}

html, body {
  color: var(--fg);
  background: var(--bg);
}

a { text-decoration: none; }
img { display: block; }

/* Existing custom utilities - keep these */
@utility container {
  margin-left: auto;
  margin-right: auto;
  max-width: 72rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

@utility card {
  border-radius: 1rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  background-color: rgb(255 255 255 / 0.05);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

@utility btn {
  border-radius: 0.75rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  transition-property: color, background-color;
  &:hover {
    background-color: rgb(255 255 255 / 0.1);
  }
}

@utility input {
  border-radius: 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  background-color: transparent;
  padding: 0.5rem 0.75rem;
  &:focus {
    outline: none;
    border-color: rgb(255 255 255 / 0.4);
  }
}

@utility label {
  font-size: 0.875rem;
  opacity: 0.7;
}
```

---

## Phase 4: Update TypeScript Configuration

### Step 4.1: Update Ops App TypeScript Config

**File: `apps/ops/tsconfig.json`**

Add path aliases (create or update):

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@leaselab/ui-components": ["../../shared/ui-components/src"],
      "@leaselab/ui-components/*": ["../../shared/ui-components/src/*"]
    },
    "types": ["@cloudflare/workers-types", "vite/client"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Step 4.2: Update Site App TypeScript Config

**File: `apps/site/tsconfig.json`**

Add path aliases (create or update):

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@leaselab/ui-components": ["../../shared/ui-components/src"],
      "@leaselab/ui-components/*": ["../../shared/ui-components/src/*"]
    },
    "types": ["@cloudflare/workers-types", "vite/client"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Step 4.3: Update Root TypeScript Config (if needed)

**File: `tsconfig.json`**

Ensure workspace references are included:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

---

## Phase 5: Add Core Components

### Step 5.1: Install Essential Components

We'll manually add components since shadcn CLI doesn't work well with monorepos. Start with the most commonly used components:

**Button Component**

**File: `shared/ui-components/src/components/ui/button.tsx`**

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Update exports in `shared/ui-components/src/index.ts`:**

```typescript
// Utilities
export { cn } from "./lib/utils"

// Components
export { Button, buttonVariants, type ButtonProps } from "./components/ui/button"
```

### Step 5.2: Add Additional Components as Needed

For the initial implementation, copy these essential components from the shadcn/ui repository:

1. **Button** (done above)
2. **Card** - For layout containers
3. **Input** - Form inputs
4. **Label** - Form labels
5. **Select** - Dropdowns
6. **Dialog** - Modal dialogs
7. **Popover** - Popovers
8. **Dropdown Menu** - Context menus
9. **Table** - Data tables
10. **Tabs** - Tab navigation

Each component should:
- Go in `shared/ui-components/src/components/ui/[component-name].tsx`
- Be exported from `shared/ui-components/src/index.ts`
- Follow the same pattern as Button (use `cn` utility, CVA for variants)

---

## Phase 6: Update App Dependencies

### Step 6.1: Update Ops Package.json

**File: `apps/ops/package.json`**

Add the shared ui-components package:

```json
{
  "dependencies": {
    "@leaselab/ui-components": "*",
    // ... existing dependencies
  }
}
```

### Step 6.2: Update Site Package.json

**File: `apps/site/package.json`**

Add the shared ui-components package:

```json
{
  "dependencies": {
    "@leaselab/ui-components": "*",
    // ... existing dependencies
  }
}
```

### Step 6.3: Install Dependencies

```bash
# From root
npm install
```

---

## Phase 7: Testing & Validation

### Step 7.1: Create Test Components

**File: `apps/ops/app/routes/_test.tsx`** (temporary test route)

```typescript
import { Button } from "@leaselab/ui-components"

export default function TestPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">shadcn/ui Component Test</h1>

      <div className="space-x-2">
        <Button variant="default">Default Button</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>

      <div className="space-x-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  )
}
```

### Step 7.2: Run Apps and Verify

```bash
# Terminal 1 - Ops app
npm run dev:ops

# Terminal 2 - Site app
npm run dev:site
```

**Test checklist:**
- [ ] Components render correctly in both apps
- [ ] Styles are applied correctly (check theme variables)
- [ ] Dark mode works (if applicable)
- [ ] TypeScript has no errors
- [ ] Build completes successfully
- [ ] No console errors

### Step 7.3: Run Type Checking

```bash
npm run typecheck
```

---

## Phase 8: Documentation & Clean Up

### Step 8.1: Add Component Documentation

**File: `shared/ui-components/README.md`**

```markdown
# @leaselab/ui-components

Shared UI component library built with shadcn/ui and Tailwind CSS v4.

## Installation

This package is automatically available in the workspace. Import components directly:

\`\`\`typescript
import { Button } from "@leaselab/ui-components"
\`\`\`

## Available Components

- Button
- Card
- Input
- Label
- (Add as components are implemented)

## Development

- Components are located in \`src/components/ui/\`
- All components use the \`cn()\` utility for className merging
- Components follow shadcn/ui conventions

## Adding New Components

1. Copy component from [shadcn/ui](https://ui.shadcn.com)
2. Place in \`src/components/ui/[name].tsx\`
3. Update imports to use \`../../lib/utils\`
4. Export from \`src/index.ts\`
\`\`\`

### Step 8.2: Remove Test Routes

Delete any temporary test routes created for validation.

### Step 8.3: Commit Changes

```bash
git add .
git commit -m "feat: integrate shadcn/ui with Tailwind CSS v4

- Add @leaselab/ui-components shared package
- Configure shadcn/ui for Ops and Site apps
- Extend Tailwind configs with theme variables
- Add core UI components (Button, etc.)
- Update TypeScript path aliases
- Add component documentation"
```

---

## Troubleshooting

### Issue: Components not found

**Solution**: Check TypeScript path aliases in app `tsconfig.json` and ensure `@leaselab/ui-components` is correctly configured.

### Issue: Styles not applying

**Solution**:
1. Verify `@source` in `tailwind-config.css` includes the shared components path
2. Clear build cache and restart dev server
3. Check that CSS variables are defined in `@theme` block

### Issue: Type errors

**Solution**: Run `npm install` from root to ensure all workspace dependencies are linked correctly.

### Issue: Dark mode not working

**Solution**: Check that `@media (prefers-color-scheme: dark)` block is present in Tailwind config or that dark mode class strategy is configured.

---

## Next Steps

After successful integration:

1. **Migrate Existing Components**: Gradually replace custom components with shadcn equivalents
2. **Add More Components**: Install additional shadcn components as needed
3. **Customize Theme**: Fine-tune color palette and design tokens
4. **Create Composed Components**: Build higher-level components using shadcn primitives
5. **Setup Storybook** (optional): Document components in isolation

---

## References

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Class Variance Authority](https://cva.style/docs)
