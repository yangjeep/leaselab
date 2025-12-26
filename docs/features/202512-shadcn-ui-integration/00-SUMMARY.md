# shadcn/ui Integration - Quick Reference

**Status**: Planned
**Last Updated**: 2025-12-18

---

## 🎯 What It Does

Integrates shadcn/ui component library with the existing Tailwind CSS v4 setup across both Ops and Site apps, providing a consistent, accessible, and customizable UI component system.

**Key Features**:
- ✅ Full shadcn/ui component library integration
- ✅ Shared component configuration across apps
- ✅ Tailwind CSS v4 compatibility
- ✅ Dark mode support out of the box
- ✅ Accessibility-first components
- ✅ Customizable theme system

---

## 🏗️ Architecture (30-Second Overview)

```
shared/ui-components/              # Shared shadcn/ui components
├── components/                    # All shadcn components
│   ├── ui/                       # Base UI components
│   └── ...                       # Composed components
├── lib/                          # Utilities (cn, etc.)
└── package.json                  # shadcn dependencies

apps/ops/                         # Ops app
├── app/tailwind-config.css      # Extended with theme vars
└── components.json              # shadcn config

apps/site/                        # Site app
├── app/tailwind-config.css      # Extended with theme vars
└── components.json              # shadcn config
```

**Why this works**:
- Components live in shared package for DRY principle
- Each app can customize theme while sharing component logic
- Tailwind v4's CSS-first approach works seamlessly with shadcn
- No conflicts with existing Tailwind setup

---

## 📄 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [01-implementation-plan.md](./01-implementation-plan.md) | Step-by-step implementation guide | During setup |
| [02-component-architecture.md](./02-component-architecture.md) | Component organization & patterns | Architecture decisions |
| [03-theme-customization.md](./03-theme-customization.md) | Theme & styling guide | Customizing appearance |

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Component Location** | Shared package (`@leaselab/ui-components`) | Reusability across apps, single source of truth |
| **CSS Strategy** | Tailwind v4 + CSS variables | Modern approach, better performance, easier theming |
| **Installation Method** | Manual setup (not CLI) | Better control, workspace compatibility |
| **Theme Variables** | CSS custom properties in @theme | Native Tailwind v4 approach, no conflicts |
| **Dark Mode** | CSS variables + class strategy | Flexible, works with existing dark mode setup |
| **Path Aliases** | `@/components` per app | Standard shadcn convention, clear imports |

---

## 📐 Quick Reference

### Package Structure
```typescript
// Workspace packages
"@leaselab/ui-components"  // New shared package
"@leaselab/shared-config"  // Existing
"@leaselab/shared-types"   // Existing
"@leaselab/shared-utils"   // Existing
```

### Using Components
```typescript
// In apps/ops or apps/site
import { Button } from "@leaselab/ui-components/ui/button"
import { Card } from "@leaselab/ui-components/ui/card"

export function MyComponent() {
  return (
    <Card>
      <Button variant="default">Click me</Button>
    </Card>
  )
}
```

### Theme Customization
```css
/* apps/ops/app/tailwind-config.css */
@import "tailwindcss";
@source "../app/**/*.{js,jsx,ts,tsx}";

@theme {
  /* Existing theme */
  --font-family-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* shadcn/ui theme variables */
  --color-background: 0 0% 4%;
  --color-foreground: 0 0% 90%;
  --color-primary: 210 40% 56%;
  --color-primary-foreground: 0 0% 100%;
  /* ... more variables */
}
```

---

## 🚀 Implementation Steps (High-Level)

1. **Create Shared UI Package** - Set up `@leaselab/ui-components`
2. **Install Dependencies** - Add shadcn/ui dependencies
3. **Configure Components** - Set up components.json for both apps
4. **Setup Theme Variables** - Extend Tailwind configs with shadcn variables
5. **Add Core Components** - Install essential shadcn components
6. **Update TypeScript Paths** - Configure path aliases
7. **Test Integration** - Verify components work in both apps

---

## 💰 Cost Impact

**No additional costs** - shadcn/ui is free and open source. All components are copied into your codebase, so there are no runtime dependencies or API calls.

---

## 🎨 Design System Benefits

- **Consistency**: Same components across Ops and Site apps
- **Accessibility**: WCAG compliant components out of the box
- **Customization**: Full control over styling and behavior
- **DX**: Autocomplete, TypeScript support, excellent docs
- **Performance**: Tree-shakeable, only bundle what you use
- **Maintainability**: Well-tested, community-supported components

---

**Status**: 📋 Ready for implementation
