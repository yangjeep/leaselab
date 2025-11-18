<!-- f484dec8-5fd3-4eaf-ae1a-ee41ef8e17a4 6ec24f99-f7ad-4445-878e-5f2c9e3cb3ee -->
# Convert Embedded Form to Native Form

## Overview

Replace the embedded Airtable iframe in `ContactForm.tsx` with a native React form that collects tenant inquiries and submits them to the "tenant-leads" Airtable table via a Next.js API route.

## Implementation Steps

### 1. Create API Route for Form Submission

**File**: `app/api/tenant-leads/route.ts` (new file)

- Create POST endpoint that accepts form data
- Validate required fields (name, email, phone)
- Submit to Airtable "tenant-leads" table using existing Airtable credentials
- Map form fields to Airtable columns:
- Name → "Name"
- Email → "Email"
- Phone → "Phone"
- Property Title → "Property Title"
- Move-in Date → "Ideal Move-in Date"
- Number of Occupants → "Number of Occupants"
- Employment Status → "Employment Status"
- Message → "Message"
- Return success/error response with appropriate status codes

### 2. Build Native Contact Form Component

**File**: `components/ContactForm.tsx`

Replace the iframe with a native form containing:

- Form fields: Name (required), Email (required), Phone (required), Message, Move-in Date, Number of Occupants, Employment Status
- Hidden field for Property Title (passed as prop)
- Client-side validation using React state
- Loading state during submission
- Error handling with inline error messages
- Form styling consistent with existing card design
- Submit handler that POSTs to `/api/tenant-leads`
- On success: redirect to `/thank-you` page using Next.js router

### 3. Create Thank You Page

**File**: `app/thank-you/page.tsx` (new file)

- Simple page with success message
- "Return to Listings" button linking back to home page
- Styled consistently with the rest of the site using card layout

### 4. Update Environment Variables

**File**: `env.example`

- Add comment/documentation about the "tenant-leads" table requirement
- No new env vars needed (reuses existing `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID`)

## Key Technical Details

- Use React `useState` for form state and validation
- Use Next.js `useRouter` for redirect after submission
- Leverage existing Airtable integration pattern from `lib/fetchListings.ts`
- Maintain existing styling with Tailwind classes and card component
- Form should work on both home page (General Inquiry) and individual property pages (property-specific inquiries)

### To-dos

- [ ] Create API route at app/api/tenant-leads/route.ts to handle form submissions to Airtable
- [ ] Replace iframe in ContactForm.tsx with native React form including all required fields and validation
- [ ] Create thank you page at app/thank-you/page.tsx for post-submission redirect
- [ ] Update env.example with documentation about tenant-leads table