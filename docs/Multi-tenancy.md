Here's the full multi-tenancy implementation plan:

---

# Multi-Tenancy Implementation Plan for ACES-Receipts

## Overview

Transform ACES-Receipts from a single-organization tool to a multi-tenant SaaS platform serving multiple clubs/organizations with separate databases per tenant.

---

## Architecture Decisions

### Database Strategy: Separate Databases Per Tenant

```
MongoDB Atlas Cluster
├── master (system database)
│   ├── organizations
│   ├── users
│   └── membership_requests
│
├── org_aces (ACES organization)
│   ├── events
│   ├── receipts
│   ├── sequences
│   └── templates
│
├── org_robotics (Robotics Club)
│   ├── events
│   ├── receipts
│   ├── sequences
│   └── templates
│
└── org_tech (TECH Club)
    └── ...
```

**Rationale:**

- Strong data isolation
- Clean tenant deletion
- Separate backups per organization
- Compliance-friendly for future requirements

**Tradeoffs accepted:**

- Migrations must run on each database
- Cross-tenant queries (for super admin) require connecting to multiple DBs
- Connection management complexity

---

### Subdomain Routing

```
aces.receipts.yourdomain.com     → ACES organization
robotics.receipts.yourdomain.com → Robotics Club
receipts.yourdomain.com          → Landing page (No tenant)
```

**Middleware extracts subdomain and sets organization context.**

---

### User Model

```typescript
// Master database - users collection
interface User {
  _id: ObjectId
  email: string
  username: string
  passhash: string
  isSuperAdmin: boolean
  memberships: {
    organizationId: ObjectId
    organizationSlug: string
    role: 'admin' | 'member'
    approvedAt?: Date
  }[]
  createdAt: Date
  lastSignIn: Date
}
```

**Users can belong to multiple organizations with different roles.**

---

### Organization Model

```typescript
// Master database - organizations collection
interface Organization {
  _id: ObjectId
  slug: string // URL-safe, used for subdomain
  name: string // Display name "ACES"
  description?: string
  logoUrl?: string
  settings: {
    primaryColor: string // #hex
    secondaryColor?: string
    organizationName: string // For receipt headers
    receiptNumberFormat: string // Pattern: RCP-{eventCode}-{initials}{seq}. They can make their own though or make one specific for an event.
    defaultTemplate: string // Template ID
    emailFromName: string
    emailFromAddress: string
  }
  limits: {
    maxEvents: number // -1 = unlimited
    maxReceiptsPerMonth: number
    maxUsers: number
  }
  status: 'pending' | 'active' | 'suspended' | 'deleted'
  createdBy: ObjectId // User who created it
  createdAt: Date
  approvedAt?: Date
  approvedBy?: ObjectId // Super admin who approved
  deletedAt?: Date // Soft delete timestamp
  restoresBefore?: Date // Auto-purge after 30 days
}
```

---

### Session Model

```typescript
interface Session {
  userId: ObjectId
  email: string
  currentOrganizationId?: ObjectId
  currentOrganizationSlug?: string
  currentRole?: 'admin' | 'member' | 'superadmin'
  isSuperAdmin: boolean
}
```

**Session stored in JWT cookie. User can switch between organizations.**

---

### SMTP Vault Model

```typescript
// Master database - smtp_vaults collection
interface SMTPVault {
  _id: ObjectId
  organizationId: ObjectId
  label: string // "Primary Gmail", "Events Account"
  email: string
  // Encrypted using AES-256 with key derived from environment secret
  encryptedAppPassword: string
  iv: string // Initialization vector
  authTag: string // Auth tag for GCM
  isDefault: boolean
  lastUsedAt?: Date
  createdBy: ObjectId
  createdAt: Date
}
```

**Encryption approach:**

- App password encrypted with AES-256-GCM
- Key derived from `SMTP_VAULT_SECRET` env var
- Never logged or exposed via API
- Decrypted only at send time

---

## User Flows

### Flow 1: New User Sign Up (Create Organization)

```
1. User visits receipts.yourdomain.com (landing page)
2. User clicks "Create Organization"
3. User enters:
   - Organization name: "ACES"
   - Desired subdomain: "aces"
   - Their email, username, password
4. System:
   - Checks subdomain availability
   - Creates user account
   - Creates organization (status: pending)
   - Adds user as admin of organization
   - NOTIFIES super admins (email)
5. User sees: "Your organization is pending approval"
6. Super admin approves
7. Organization status → active
8. User can now log in and use the system
```

### Flow 2: Existing User Joins Another Organization

**Via Email Invite:**

```
1. Org admin enters user's email in invite form
2. System sends email with unique invite link
3. User clicks link, logs in (Or signs up)
4. Membership automatically created with 'member' role
5. User can now switch to that organization
```

**Via Invite Code:**

```
1. Org admin generates invite code (Shareable)
2. Code has optional: Expiry date, max uses
3. User enters code in "Join Organization" page
4. Membership created
5. User can now switch to that organization
```

### Flow 3: Switching Organizations

```
1. Logged-in user has multiple memberships
2. User clicks organization selector in sidebar (Dropdown)
3. Selects different organization
4. Session updates `currentOrganizationId`
5. All subsequent requests route to that organization's database
```

### Flow 4: Super Admin Flow

```
1. Super admin logs in
2. Sees super admin dashboard
3. Can:
   - View all organizations (Pending / Active / Suspended /Deleted)
   - Approve / Suspend organizations
   - Restore deleted organizations (Within 30 days)
   - Permanently delete organizations
   - Set limits per organization
   - Switch into any organization to view / manage
   - View system-wide analytics
   - Manage SMTP vaults (View metadata only, not credentials)
```

### Flow 5: SMTP Configuration

```
1. Org admin goes to Settings → Email
2. Adds SMTP configuration:
   - Label: "Primary Gmail"
   - Email: events@aces.org
   - App Password: xxxx xxxx xxxx xxxx
3. System encrypts and stores in vault
4. Admin can add multiple configurations
5. When sending email:
   - Admin selects which SMTP config to use
   - Or set one as default for bulk operations
```

### Flow 6: Organization Deletion & Restoration

```
Deletion:
1. Org admin requests deletion (Or super admin initiates)
2. Organization status → Deleted
3. Field `deletedAt` timestamp set
4. Field `restoresBefore` set to now + 30 days
5. Subdomain still locked (Unavailable for reuse)
6. Access blocked for all members

Restoration:
1. Super admin views deleted organizations
2. Super admin clicks "Restore"
3. Organization status → Active
4. `deletedAt` and `restoresBefore` fields cleared
5. Subdomain re-assigned
6. Access restored

Auto-Purge:
1. Daily cron job checks for organizations past restoresBefore
2. Database dropped (`org_slug`)
3. Organization document removed from master
4. All related vault entries removed
```

---

## Database Connection Strategy

```typescript
// lib/db/tenant.ts

import mongoose from 'mongoose'

const tenantConnections = new Map<string, mongoose.Connection>()

export function getTenantConnection(
  organizationSlug: string
): mongoose.Connection {
  if (tenantConnections.has(organizationSlug)) {
    return tenantConnections.get(organizationSlug)!
  }

  const dbName = `org_${organizationSlug}`
  const connection = mongoose.connection.useDb(dbName)

  tenantConnections.set(organizationSlug, connection)
  return connection
}

export function closeTenantConnection(organizationSlug: string) {
  const conn = tenantConnections.get(organizationSlug)
  if (conn) {
    conn.close()
    tenantConnections.delete(organizationSlug)
  }
}
```

```typescript
// lib/db/tenant-models.ts

import { getTenantConnection } from './tenant'
import { eventSchema } from '@/models/tenant/event.model'
import { receiptSchema } from '@/models/tenant/receipt.model'
import { sequenceSchema } from '@/models/tenant/sequence.model'
import { templateSchema } from '@/models/tenant/template.model'

export function getTenantModels(organizationSlug: string) {
  const conn = getTenantConnection(organizationSlug)

  return {
    Event: conn.model('Event', eventSchema),
    Receipt: conn.model('Receipt', receiptSchema),
    Sequence: conn.model('Sequence', sequenceSchema),
    Template: conn.model('Template', templateSchema),
  }
}
```

---

## Middleware Architecture

```typescript
// middleware.ts

import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/create-organization',
  '/api/sessions',
  '/api/users',
]
const SUPERADMIN_PATHS = ['/superadmin', '/api/superadmins']

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Extract subdomain
  const subdomain = extractSubdomain(host)

  // No subdomain = landing page / auth routes
  if (!subdomain) {
    return handleLandingRoutes(request, pathname)
  }

  // Super admin routes (no tenant)
  if (SUPERADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return handleSuperAdminRoutes(request)
  }

  // Validate organization exists
  const org = await getOrganizationBySlug(subdomain)

  if (!org) {
    return NextResponse.redirect(new URL('/org-not-found', request.url))
  }

  if (org.status === 'pending') {
    return NextResponse.redirect(new URL('/org-pending', request.url))
  }

  if (org.status === 'suspended') {
    return NextResponse.redirect(new URL('/org-suspended', request.url))
  }

  if (org.status === 'deleted') {
    return NextResponse.redirect(new URL('/org-deleted', request.url))
  }

  // Inject organization context into request headers
  const response = NextResponse.next()
  response.headers.set('x-organization-id', org._id.toString())
  response.headers.set('x-organization-slug', org.slug)
  response.headers.set('x-organization-name', org.name)

  return response
}

function extractSubdomain(host: string): string | null {
  // aces.receipts.yourdomain.com → 'aces'
  // localhost:3000 → null (development)
  // receipts.yourdomain.com → null

  if (host.includes('localhost')) return null

  const parts = host.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }
  return null
}
```

---

## Receipt Number Format Customization

**Supported placeholders:**

| Placeholder   | Description                 | Example             |
| ------------- | --------------------------- | ------------------- |
| `{eventCode}` | Event's unique code         | `SEM2025`           |
| `{initials}`  | Customer initials (2 chars) | `JD`                |
| `{seq}`       | Sequential number per event | `00001`             |
| `{orgCode}`   | Organization's short code   | `ACES`              |
| `{year}`      | 4-digit year                | `2025`              |
| `{yy}`        | 2-digit year                | `25`                |
| `{month}`     | 2-digit month               | `02`                |
| `{type}`      | Event type code             | `SEM`, `WRK`, `CON` |

**Default format:** `RCP-{eventCode}-{initials}{seq}`

**Examples:**

- `RCP-SEM2025-JD00001` (default)
- `ACES-25-0001` (org-based)
- `25{month}-{type}-{seq}` (time-based)

**Implementation:**

```typescript
function formatReceiptNumber(format: string, data: ReceiptNumberData): string {
  return format
    .replace('{eventCode}', data.eventCode)
    .replace('{initials}', data.initials)
    .replace('{seq}', data.sequence.toString().padStart(5, '0'))
    .replace('{orgCode}', data.orgCode)
    .replace('{year}', data.year.toString())
    .replace('{yy}', data.year.toString().slice(-2))
    .replace('{month}', data.month.toString().padStart(2, '0'))
    .replace('{type}', data.eventType)
}
```

---

## Phase-by-Phase Implementation

### Phase 1: Foundation (Week 1)

**Goal:** Multi-tenant database infrastructure

- [x] Create `lib/db/tenant.ts` - connection management
- [x] Create `lib/db/tenant-models.ts` - model factory
- [x] Create `lib/db-conn.ts` - master database connection (rename existing)
- [x] Create `models/organization.model.ts` - organization schema
- [x] Update `models/user.model.ts` - add memberships array, isSuperAdmin
- [x] Create `models/membership-request.model.ts` - join requests and invites
- [x] Create `models/smtp-vault.model.ts` - encrypted SMTP storage
- [x] Create `lib/encryption.ts` - AES-256-GCM encryption utilities
- [ ] Create database migration utility for creating tenant DBs

### Phase 2: Middleware & Routing (Week 1)

**Goal:** Subdomain-based organization routing

- [x] Create `middleware.ts` - subdomain extraction, org validation
- [x] Create `lib/organization-context.ts` - request context helper
- [ ] Create organization context provider for server components
- [x] Create `app/(tenant)/org-not-found/page.tsx`
- [x] Create `app/(tenant)/org-pending/page.tsx`
- [x] Create `app/(tenant)/org-suspended/page.tsx`
- [x] Create `app/(tenant)/org-deleted/page.tsx`
- [ ] Test subdomain routing locally

### Phase 3: Landing Page & Auth Updates (Week 2)

**Goal:** New user sign-up flow with organization creation

- [x] Create `app/(landing)/page.tsx` - marketing landing page
- [x] Create `app/(landing)/create-organization/page.tsx` - org creation form
- [x] Update `app/api/sessions/route.ts`:
  - Handle org selection after login
  - Return available memberships
  - Support org switching
- [x] Update `app/api/users/route.ts`:
  - Create org on signup (if creating new org)
  - Add user to org membership
- [x] Create `app/api/organizations/route.ts`:
  - GET: Check subdomain availability
  - POST: Create organization (pending status)
- [x] Create `app/api/organizations/[slug]/route.ts`:
  - GET: Get organization info (public)
  - PATCH: Update organization settings

### Phase 4: Invite System (Week 2)

**Goal:** Email invites and invite codes

- [x] Create `app/api/invites/route.ts`:
  - POST: Send email invite / generate invite code
  - GET: Validate invite code
- [x] Create `app/api/invites/[token]/route.ts`:
  - GET: Get invite details (for acceptance page)
  - POST: Accept invite
- [x] Create `app/(landing)/join/page.tsx` - join org by code
- [x] Create `app/(landing)/invite/[token]/page.tsx` - accept email invite
- [ ] Create email template for organization invites

### Phase 5: Organization Management UI (Week 3)

**Goal:** Admin dashboard for organization settings

- [x] Create `app/(tenant)/settings/organization/page.tsx` - org settings
- [x] Create `app/(tenant)/settings/members/page.tsx` - member management
- [x] Create `app/(tenant)/settings/email/page.tsx` - SMTP configuration
- [x] Create organization selector component (navbar)
- [x] Create member invite UI component
- [x] Create member role management (admin ↔ member)

### Phase 6: Super Admin (Week 3)

**Goal:** Platform administration

- [x] Create `app/(superadmin)/layout.tsx` - super admin layout
- [x] Create `app/(superadmin)/dashboard/page.tsx` - admin dashboard
- [x] Create `app/(superadmin)/organizations/page.tsx` - all orgs list
- [x] Create `app/(superadmin)/organizations/[slug]/page.tsx` - manage org
- [x] Create `app/(superadmin)/users/page.tsx` - all users list
- [x] Create `app/(superadmin)/deleted/page.tsx` - deleted orgs (restorable)
- [x] Create `app/api/superadmin/organizations/route.ts`
- [x] Create `app/api/superadmin/organizations/[slug]/route.ts`:
  - PATCH: Approve, suspend, update limits
  - DELETE: Hard delete (past retention)
  - POST: Restore deleted org
- [x] Create super admin middleware (check isSuperAdmin)

### Phase 7: Tenant Model Updates (Week 4)

**Goal:** Update all existing models and routes for multi-tenancy

- [x] Move schemas to `models/tenant/` directory
- [x] Update all API routes to use tenant models:
  - [x] `app/api/events/*`
  - [x] `app/api/receipts/*`
  - [x] `app/api/documents/*`
  - [x] `app/api/templates/*`
- [ ] Update all server components to use tenant context
- [ ] Update PDF generation with org branding
- [x] Update email sending with SMTP vault selection

### Phase 8: Customization & Branding (Week 4)

**Goal:** Per-organization branding

- [ ] Update PDF generation to use org settings:
  - Primary color
  - Logo
  - Organization name
- [ ] Update receipt templates to accept org config
- [x] Implement custom receipt number format per org
- [ ] Update email templates with org branding
- [ ] UI theming based on org primary color (CSS variables)

### Phase 9: Limits & Enforcement (Week 5)

**Goal:** Usage limits per organization

- [x] Create `lib/limits.ts` - limit checking utilities
- [ ] Create limit checking middleware
- [x] Enforce limits on:
  - [x] Event creation (maxEvents)
  - [x] Receipt creation (maxReceiptsPerMonth)
  - [x] Member invites (maxUsers)
- [x] Create usage tracking (counts per org)
- [x] Create usage dashboard for org admins
- [ ] Create usage warning emails (optional)

### Phase 10: Deletion & Restoration (Week 5)

**Goal:** Soft delete with recovery period

- [x] Create organization deletion API
- [x] Create organization restoration API
- [x] Create cron job for auto-purging old deleted orgs
- [x] Create UI for deletion flow
- [x] Create UI for restoration (super admin)

### Phase 11: Migration & Testing (Week 6)

**Goal:** Production readiness

- [ ] Create seed data for testing multiple orgs
- [ ] Test cross-tenant isolation thoroughly
- [ ] Test super admin flows
- [ ] Test invite flows (email and code)
- [ ] Test SMTP vault encryption/decryption
- [ ] Performance test with multiple databases
- [ ] Create admin documentation
- [ ] Create user documentation
- [ ] Deploy staging environment with wildcard domain
- [ ] Production deployment

---

## Configuration Changes

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://cluster.mongodb.net
MASTER_DB_NAME=master
TENANT_DB_PREFIX=org_

# Auth
JWT_SECRET=your-secret-key

# Encryption (For SMTP vault)
SMTP_VAULT_SECRET=32-byte-encryption-key-here

# Domain
BASE_DOMAIN=receipts.yourdomain.com

# Super Admins (Comma-separated emails)
SUPER_ADMIN_EMAILS=admin@yourdomain.com

# Email (For system notifications) (Nodemailer)
SYSTEM_EMAIL_FROM=noreply@yourdomain.com
SYSTEM_SMTP_HOST=smtp.gmail.com
SYSTEM_SMTP_PORT=587
SYSTEM_SMTP_USER=xxx
SYSTEM_SMTP_PASS=xxx

# Optional
SMTP_VAULT_ENCRYPTION_ALGORITHM=aes-256-gcm
ORGANIZATION_RETENTION_DAYS=30

# Vercel (For REST APIs and sub-domains) (System)
VERCEL_TOKEN=
VERCEL_API_TOKEN=
VERCEL_USER_ID=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=
```

### Vercel Configuration

Please also refer to https://docs.vercel.com/docs/rest-api/reference/welcome and

```json
// vercel.json
{
  "domains": [
    {
      "domain": "*.receipts.yourdomain.com",
      "wildcard": true
    },
    {
      "domain": "receipts.yourdomain.com"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/purge-deleted-orgs",
      "schedule": "0 3 * * *"
    } // Actually cron jobs aren't available in Hobby. But it's for an idea, we can use another service
  ]
}
```

---

## File Structure (Proposed)

```
app/
├── (landing)/                    # No subdomain
│   ├── page.tsx                  # Landing page
│   ├── login/
│   │   └── page.tsx
│   ├── create-organization/
│   │   └── page.tsx
│   ├── join/
│   │   └── page.tsx              # Join by invite code
│   └── invite/
│       └── [token]/
│           └── page.tsx          # Accept email invite
│
├── (tenant)/                     # Tenant subdomain (requires auth)
│   ├── events/
│   ├── receipts/
│   ├── settings/
│   │   ├── organization/
│   │   ├── members/
│   │   └── email/                # SMTP configuration
│   ├── org-not-found/
│   ├── org-pending/
│   ├── org-suspended/
│   └── org-deleted/
│
├── (superadmin)/                 # Super admin only
│   ├── dashboard/
│   ├── organizations/
│   │   ├── page.tsx              # List all
│   │   └── [slug]/
│   │       └── page.tsx          # Manage single
│   ├── users/
│   └── deleted/                  # Restorable orgs
│
├── v/                            # Public receipt view (tenant-aware)
│   └── [receiptNumber]/
│
└── api/
    ├── sessions/
    ├── users/
    ├── organizations/
    ├── invites/
    ├── superadmins/
    │   ├── organizations/
    │   └── users/
    ├── events/
    ├── receipts/
    ├── documents/
    ├── templates/
    └── crons/
        └── orgs/

lib/
├── db/
│   ├── conn.ts                   # Master connection
│   ├── tenant.ts                 # Tenant connection factory
│   └── tenant-models.ts          # Model factory
├── encryption.ts                 # AES-256-GCM utilities
├── organization-context.ts
├── limits.ts
└── ...

models/
├── user.model.ts                 # Updated with memberships
├── organization.model.ts         # New
├── membership-request.model.ts   # New
├── smtp-vault.model.ts           # New
└── tenant/                       # Tenant-scoped schemas
    ├── event.model.ts
    ├── receipt.model.ts
    ├── sequence.model.ts
    └── template.model.ts
```

---

## Summary

| Aspect        | Decision                                         |
| ------------- | ------------------------------------------------ |
| Database      | Separate DB per tenant (`org_slug`)              |
| Routing       | Subdomain-based (`aces.receipts.yourdomain.com`) |
| User model    | Multi-tenant with memberships array              |
| Invites       | Both email invites and shareable codes           |
| SMTP          | Encrypted vault per organization                 |
| Customization | Colors, logo, receipt format per Org             |
| Limits        | Enforced by super admin                          |
| Deletion      | Soft delete, 30-day recovery                     |
| Super admin   | Full platform access, org management             |

---
