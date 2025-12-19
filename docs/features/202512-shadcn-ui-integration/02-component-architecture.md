# Component Architecture & Organization

**Purpose**: Architectural guide for organizing and structuring shadcn/ui components in the monorepo.

**Last Updated**: 2025-12-18

---

## Overview

This document describes the architecture, organization patterns, and best practices for using shadcn/ui components across the LeaseLab monorepo.

---

## Architecture Principles

### 1. **Shared Components, App-Specific Compositions**

```
┌─────────────────────────────────────────────────┐
│         @leaselab/ui-components                 │
│    (Primitive & Base Components)                │
│                                                  │
│  - Button, Input, Card, Dialog, etc.           │
│  - Pure shadcn/ui components                    │
│  - No business logic                            │
│  - Highly reusable                              │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│   Ops App       │  │   Site App      │
│   Components    │  │   Components    │
│                 │  │                 │
│ - PropertyCard  │  │ - HeroSection   │
│ - LeadForm      │  │ - ContactForm   │
│ - TenantTable   │  │ - PricingCard   │
│ (Composed)      │  │ (Composed)      │
└─────────────────┘  └─────────────────┘
```

**Why this works:**
- Base components are shared and consistent
- Apps can compose business-specific components
- No cross-app dependencies
- Easy to maintain and test

### 2. **Three-Layer Component Hierarchy**

```
Layer 1: Primitives (@leaselab/ui-components/ui/*)
├── Directly from shadcn/ui
├── Minimal customization
└── Examples: Button, Input, Label

Layer 2: Shared Compositions (@leaselab/ui-components/components/*)
├── Common patterns used across apps
├── Built with Layer 1 components
└── Examples: FormField, DataTable, EmptyState

Layer 3: App-Specific Components (apps/*/app/components/*)
├── Business logic components
├── Domain-specific
└── Examples: PropertyCard, LeadForm, TenantAnalysis
```

---

## Directory Structure

### Shared UI Components Package

```
shared/ui-components/
├── src/
│   ├── components/
│   │   ├── ui/                      # Layer 1: Primitive components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   └── composed/                # Layer 2: Shared compositions
│   │       ├── form-field.tsx       # Input + Label + Error
│   │       ├── data-table.tsx       # Table + Pagination + Filters
│   │       ├── empty-state.tsx      # Icon + Message + Action
│   │       ├── loading-spinner.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── utils.ts                 # cn() utility
│   │   └── types.ts                 # Shared types
│   │
│   ├── hooks/                       # Shared hooks
│   │   ├── use-toast.ts
│   │   ├── use-media-query.ts
│   │   └── ...
│   │
│   └── index.ts                     # Main exports
│
├── package.json
├── tsconfig.json
├── components.json                  # shadcn config (for reference)
└── README.md
```

### App-Specific Components

```
apps/ops/app/components/             # Ops app components
├── property/
│   ├── property-card.tsx            # Display property info
│   ├── property-form.tsx            # Create/edit property
│   └── property-list.tsx            # List with filters
│
├── lead/
│   ├── lead-card.tsx
│   ├── lead-form.tsx
│   └── tenant-analysis-panel.tsx    # AI evaluation panel
│
├── layout/
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
│
└── shared/
    ├── file-upload.tsx
    └── image-preview.tsx

apps/site/app/components/            # Site app components
├── marketing/
│   ├── hero-section.tsx
│   ├── pricing-card.tsx
│   └── testimonial.tsx
│
├── forms/
│   ├── contact-form.tsx
│   └── demo-request-form.tsx
│
└── layout/
    ├── navbar.tsx
    └── footer.tsx
```

---

## Component Patterns

### Pattern 1: Basic Primitive Usage

**Simple, direct usage of shadcn components:**

```typescript
// apps/ops/app/routes/properties/new.tsx
import { Button } from "@leaselab/ui-components"
import { Input } from "@leaselab/ui-components"
import { Label } from "@leaselab/ui-components"

export default function NewProperty() {
  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="name">Property Name</Label>
        <Input id="name" placeholder="Enter property name" />
      </div>

      <Button type="submit">Create Property</Button>
    </form>
  )
}
```

### Pattern 2: Shared Composition

**Reusable patterns extracted to shared package:**

```typescript
// shared/ui-components/src/components/composed/form-field.tsx
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface FormFieldProps {
  label: string
  id: string
  error?: string
  required?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export function FormField({
  label,
  id,
  error,
  required,
  inputProps
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

**Usage in app:**

```typescript
// apps/ops/app/routes/properties/new.tsx
import { Button } from "@leaselab/ui-components"
import { FormField } from "@leaselab/ui-components/composed/form-field"

export default function NewProperty() {
  return (
    <form className="space-y-4">
      <FormField
        label="Property Name"
        id="name"
        required
        inputProps={{
          placeholder: "Enter property name",
        }}
      />

      <FormField
        label="Address"
        id="address"
        required
      />

      <Button type="submit">Create Property</Button>
    </form>
  )
}
```

### Pattern 3: App-Specific Composition

**Domain components built for specific apps:**

```typescript
// apps/ops/app/components/property/property-card.tsx
import { Card } from "@leaselab/ui-components"
import { Button } from "@leaselab/ui-components"
import type { Property } from "@leaselab/shared-types"

interface PropertyCardProps {
  property: Property
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
}

export function PropertyCard({
  property,
  onEdit,
  onDelete
}: PropertyCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{property.name}</h3>
          <p className="text-sm text-muted-foreground">
            {property.address}
          </p>
          <p className="text-sm mt-2">
            {property.units_count} units
          </p>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(property)}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(property)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
```

---

## Import Strategies

### Strategy 1: Named Imports (Recommended)

**Best for: Most use cases**

```typescript
import { Button, Card, Input } from "@leaselab/ui-components"
```

**Pros:**
- Clean and concise
- Tree-shakeable
- Easy to read

**Cons:**
- Can become verbose with many components

### Strategy 2: Namespace Imports

**Best for: Components with name conflicts**

```typescript
import * as UI from "@leaselab/ui-components"

<UI.Button>Click me</UI.Button>
```

**Pros:**
- No name conflicts
- Clear component source

**Cons:**
- More verbose
- Harder to tree-shake

### Strategy 3: Direct Path Imports

**Best for: Specific component access**

```typescript
import { Button } from "@leaselab/ui-components/ui/button"
import { Card } from "@leaselab/ui-components/ui/card"
```

**Pros:**
- Most explicit
- Guaranteed tree-shaking

**Cons:**
- Verbose
- Requires knowledge of file structure

---

## Styling Patterns

### Using Tailwind with shadcn Components

**1. Extend with className:**

```typescript
<Button className="w-full mt-4">
  Full Width Button
</Button>
```

**2. Use CVA variants:**

```typescript
// Components support built-in variants
<Button variant="destructive" size="lg">
  Large Destructive Button
</Button>
```

**3. Custom variants (when needed):**

```typescript
// shared/ui-components/src/components/ui/button.tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        // ... existing variants
        brand: "bg-gradient-to-r from-blue-500 to-purple-500 text-white",
      },
      // ... rest
    }
  }
)
```

### Composition Over Modification

**❌ Don't modify shadcn components:**

```typescript
// BAD: Modifying shadcn component directly
// shared/ui-components/src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center ... MY_CUSTOM_STYLES ...",
  // ...
)
```

**✅ Do create composed components:**

```typescript
// GOOD: Create a composed component
// apps/ops/app/components/brand-button.tsx
import { Button, type ButtonProps } from "@leaselab/ui-components"
import { cn } from "@leaselab/ui-components/lib/utils"

export function BrandButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn(
        "bg-gradient-to-r from-blue-500 to-purple-500",
        className
      )}
      {...props}
    />
  )
}
```

---

## TypeScript Patterns

### Extending Component Props

```typescript
import { type ButtonProps } from "@leaselab/ui-components"

interface ActionButtonProps extends ButtonProps {
  loading?: boolean
  icon?: React.ReactNode
}

export function ActionButton({
  loading,
  icon,
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading ? "Loading..." : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  )
}
```

### Generic Components

```typescript
import { Card } from "@leaselab/ui-components"

interface EntityCardProps<T> {
  entity: T
  renderContent: (entity: T) => React.ReactNode
  renderActions?: (entity: T) => React.ReactNode
}

export function EntityCard<T>({
  entity,
  renderContent,
  renderActions
}: EntityCardProps<T>) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        {renderContent(entity)}
        {renderActions && (
          <div className="flex gap-2">
            {renderActions(entity)}
          </div>
        )}
      </div>
    </Card>
  )
}
```

---

## Accessibility Patterns

### Form Accessibility

```typescript
import { Input, Label } from "@leaselab/ui-components"

export function AccessibleForm() {
  const [error, setError] = React.useState<string>()

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email Address</Label>
      <Input
        id="email"
        type="email"
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
        aria-required="true"
      />
      {error && (
        <p id="email-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

### Dialog Accessibility

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@leaselab/ui-components"

export function AccessibleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  )
}
```

---

## Performance Patterns

### Code Splitting

```typescript
// Lazy load heavy components
import { lazy, Suspense } from "react"
import { Button } from "@leaselab/ui-components"

const HeavyDataTable = lazy(() =>
  import("@leaselab/ui-components/composed/data-table")
)

export function DataPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyDataTable data={[]} />
    </Suspense>
  )
}
```

### Memoization

```typescript
import { memo } from "react"
import { Card } from "@leaselab/ui-components"

interface ItemCardProps {
  item: Item
  onSelect: (id: string) => void
}

export const ItemCard = memo<ItemCardProps>(
  ({ item, onSelect }) => {
    return (
      <Card onClick={() => onSelect(item.id)}>
        {/* Card content */}
      </Card>
    )
  },
  (prev, next) => prev.item.id === next.item.id
)
```

---

## Testing Patterns

### Component Testing

```typescript
import { render, screen } from "@testing-library/react"
import { Button } from "@leaselab/ui-components"

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    screen.getByText("Click me").click()
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

---

## Migration Strategy

### Gradual Migration from Custom Components

**Phase 1: Identify replaceable components**
- List all custom UI components in apps
- Match them to shadcn equivalents

**Phase 2: Replace low-hanging fruit**
- Start with simple components (buttons, inputs)
- Update one route/feature at a time

**Phase 3: Migrate complex components**
- Data tables, forms, modals
- Test thoroughly

**Phase 4: Remove old components**
- Delete unused custom components
- Update documentation

---

## Best Practices

### ✅ Do

- Use shadcn components as-is when possible
- Create composed components for repeated patterns
- Keep business logic separate from UI components
- Use TypeScript for all components
- Follow accessibility guidelines
- Document custom compositions
- Test components in isolation

### ❌ Don't

- Modify shadcn component source directly
- Put business logic in shared UI components
- Override shadcn styles with `!important`
- Create unnecessary abstractions
- Skip accessibility attributes
- Mix styling approaches (Tailwind + CSS modules)

---

## Next Steps

1. **Component Library Expansion**: Add more shadcn components as needed
2. **Shared Compositions**: Build common patterns (FormField, DataTable, etc.)
3. **Documentation**: Document custom composed components
4. **Testing Suite**: Add comprehensive tests for shared components
5. **Storybook**: Consider adding for component documentation
