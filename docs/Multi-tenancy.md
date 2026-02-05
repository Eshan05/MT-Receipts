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

### Path-Based Routing

```
receipts.yourdomain.com              → Landing page (No tenant)
receipts.yourdomain.com/aces         → ACES organization
receipts.yourdomain.com/robotics     → Robotics Club
receipts.yourdomain.com/tech         → TECH Club
```

**Middleware extracts organization slug from URL path and sets organization context.**

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

**Organization Schema (Master Database):**

- `_id`: Unique identifier
- `slug`: URL-safe identifier used in paths (e.g., /aces)
- `name`: Display name (e.g., "ACES")
- `description`: Optional organization description
- `logoUrl`: Optional logo image URL
- `settings`: Organization-specific configuration:
  - `primaryColor`, `secondaryColor`: Branding colors
  - `organizationName`: Name displayed on receipts
  - `receiptNumberFormat`: Pattern for generating receipt numbers (e.g., RCP-{eventCode}-{initials}{seq})
  - `defaultTemplate`: Default receipt template ID
  - `emailFromName`, `emailFromAddress`: Email sender identity
- `limits`: Resource quotas:
  - `maxEvents`: Maximum events (-1 = unlimited)
  - `maxReceiptsPerMonth`: Monthly receipt limit
  - `maxUsers`: Maximum members
- `status`: 'pending' | 'active' | 'suspended' | 'deleted'
- `createdBy`: User who created the organization
- `createdAt`, `approvedAt`, `approvedBy`: Creation and approval timestamps
- `deletedAt`, `restoresBefore`: Soft delete with 30-day recovery window

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

**Note:** The existing `SMTPVault` model needs to be updated to include `organizationId`, `iv`, and `authTag` fields. Existing vault entries must be migrated with the organization reference and re-encrypted with proper GCM parameters.

---

## User Flows

### Flow 1: New User Sign Up (Create Organization)

```
1. User visits receipts.yourdomain.com (landing page)
2. User clicks "Create Organization"
3. User enters:
   - Organization name: "ACES"
   - Desired slug: "aces"
   - Their email, username, password
4. System:
   - Checks slug availability
   - Creates user account
   - Creates organization (status: pending)
   - Adds user as admin of organization
   - NOTIFIES super admins (email)
5. User sees: "Your organization is pending approval"
6. Super admin approves
7. Organization status → active
8. User can now log in and use the system at /aces
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
4. User is redirected to the selected organization's path (e.g., /robotics)
5. Session updates `currentOrganizationId`
6. All subsequent requests route to that organization's database
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
5. Slug still locked (Unavailable for reuse)
6. Access blocked for all members

Restoration:
1. Super admin views deleted organizations
2. Super admin clicks "Restore"
3. Organization status → Active
4. `deletedAt` and `restoresBefore` fields cleared
5. Slug re-assigned
6. Access restored

Auto-Purge:
1. Daily cron job checks for organizations past restoresBefore
2. Database dropped (`org_slug`)
3. Organization document removed from master
4. All related vault entries removed
```

---

## Database Connection Strategy

**Tenant Connection Manager (`lib/db/tenant.ts`):**

Simplified for Vercel serverless environment where connections reset between invocations:

- Uses Mongoose's built-in connection pooling rather than custom pool management
- Creates tenant connections using `useDb()` on the existing Mongoose connection
- Caches connections in a Map within the same invocation for efficiency (connections are reused within a single function execution)
- Database name convention: `org_{organizationSlug}`

**Key functions:**

- `getTenantConnection(organizationSlug)`: Returns existing connection from cache or creates new one using `mongoose.connection.useDb(dbName)`
- `closeTenantConnection(organizationSlug)`: Closes and removes connection from cache (rarely needed in serverless)

**Note:** The MongoDB driver handles connection pooling internally. On Vercel, connections reset between invocations, so complex LRU eviction and idle timeout logic is unnecessary.

---

**Tenant Models Factory (`lib/db/tenant-models.ts`):**

Returns model instances bound to the correct tenant database:

```
getTenantModels(organizationSlug) → { Event, Receipt, Sequence, Template }
```

Each model is registered against the tenant-specific connection retrieved from the connection manager.

---

## Rate Limiting & Noisy Neighbor Protection

### Tenant Quota Enforcement

**Rate Limiter (`lib/rate-limiter.ts`):**

Uses Upstash Redis-backed rate limiting with per-tenant enforcement:

| Limiter Type     | Limit | Window     |
| ---------------- | ----- | ---------- |
| API requests     | 100   | per minute |
| Receipt creation | 50    | per minute |
| Email sending    | 20    | per hour   |

`checkRateLimit(organizationId, limiter)` returns `{ success, remaining, reset }` keyed by organization ID (not user), preventing one tenant from affecting another's limits.

### Quota Enforcement Middleware

**Usage Counts Interface:**

```typescript
interface UsageCounts {
  events: number
  receiptsThisMonth: number
  members: number
}
```

**Middleware Behavior (`lib/quota-enforcement.ts`):**

`enforceQuotas(request, organizationId)` returns `NextResponse | null`:

1. Returns 404 if organization not found
2. Checks API rate limit → returns 429 with retry headers if exceeded
3. Checks resource limits based on route and method:
   - `POST /events` → validates against `maxEvents` limit
   - `POST /receipts` → validates against `maxReceiptsPerMonth` limit
   - `POST /invites` → validates against `maxUsers` limit
4. Returns `null` if all checks pass (allows request to proceed)

### Circuit Breaker for Tenant Operations

```typescript
interface CircuitState {
  status: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime: number
  lastSuccessTime: number
}
```

**Behavior (`lib/circuit-breaker.ts`):**

Protects system from cascading failures per tenant:

- Maintains per-tenant circuit state in a Map
- **Configurable thresholds**: `FAILURE_THRESHOLD = 5`, `RECOVERY_TIMEOUT_MS = 60000` (1 minute)

**State transitions:**

- `closed` → Normal operation, all requests pass
- `open` → After 5 consecutive failures, blocks all requests for recovery timeout
- `half-open` → After timeout, allows one test request; success → closed, failure → open

**Key functions:**

- `getCircuitState(organizationId)`: Returns current state, initializes if not exists
- `recordSuccess(organizationId)`: Resets failure count, sets status to closed
- `recordFailure(organizationId)`: Increments count, opens circuit at threshold
- `canExecute(organizationId)`: Returns boolean based on circuit state
- `withCircuitBreaker(organizationId, operation)`: Wrapper that auto-records success/failure

---

## Observability & Logging

### Structured Logging with Tenant Context

**Tenant Log Context Interface:**

```typescript
interface TenantLogContext {
  tenantId: string
  tenantSlug: string
  tenantPlan: string
  requestId: string
  userId?: string
}
```

**Logger Behavior (`lib/logger.ts`):**

Uses structured JSON logging with tenant context:

- Creates child loggers bound to specific tenant context
- All log entries automatically include: `tenant_id`, `tenant_slug`, `tenant_plan`, `request_id`, `user_id`
- Configurable log level via `LOG_LEVEL` env var
- ISO timestamp format for all entries
- Uses native `console` with JSON serialization for serverless compatibility

### Metrics Collection

**Metrics Registry (`lib/metrics.ts`):**

Uses `prom-client` for Prometheus-compatible metrics with tenant labels:

| Metric                               | Type      | Labels                                       |
| ------------------------------------ | --------- | -------------------------------------------- |
| `aces_request_duration_seconds`      | Histogram | tenant_id, tenant_slug, method, path, status |
| `aces_receipts_created_total`        | Counter   | tenant_id, tenant_slug                       |
| `aces_events_created_total`          | Counter   | tenant_id, tenant_slug                       |
| `aces_emails_sent_total`             | Counter   | tenant_id, tenant_slug, smtp_vault           |
| `aces_db_connections_active`         | Gauge     | tenant_id, tenant_slug                       |
| `aces_rate_limit_hits_total`         | Counter   | tenant_id, limiter_type                      |
| `aces_circuit_breaker_changes_total` | Counter   | tenant_id, from_state, to_state              |

`instrumentRequest(tenantId, tenantSlug, method, path, status, durationMs)` records request latency in seconds.

### Tenant-Aware Error Tracking

```typescript
interface ErrorContext {
  tenantId: string
  tenantSlug: string
  userId?: string
  requestId: string
  extras?: Record<string, unknown>
}
```

**Error Tracking Behavior (`lib/error-tracking.ts`):**

- Maintains in-memory store of recent errors (max 1000) for admin dashboard
- Each error entry contains: timestamp, error message, stack trace, and context

**Key functions:**

- `captureTenantError(error, context)`: Logs with tenant context and stores in recent errors
- `getRecentErrors({ tenantId?, limit? })`: Retrieves errors, optionally filtered by tenant
- `clearRecentErrors(tenantId?)`: Clears errors, optionally for specific tenant only

### Per-Tenant Dashboard Queries

```typescript
interface TenantMetrics {
  tenantId: string
  tenantSlug: string
  tenantName: string
  plan: string
  activeUsers: number
  eventsCount: number
  receiptsThisMonth: number
  emailsSentThisMonth: number
  avgResponseTime: number
  errorRate: number
  lastActivity: Date
}
```

**Dashboard Behavior:**

`getTenantMetrics()` aggregates from metrics store to return per-tenant analytics for super admin dashboard.

---

## Testing Strategy

### Cross-Tenant Isolation Tests

**Test Suite Structure (`__tests__/multi-tenant/isolation.test.ts`):**

**Setup:**

- Creates two test tenants before all tests
- Cleans up both tenants after all tests

**Database Isolation Tests:**

- Verifies tenant A cannot access tenant B's data via direct model queries
- Confirms each tenant uses separate database (`org_{slug}`)

**API Route Isolation Tests:**

- Attempts cross-tenant receipt access via API
- Expects 404 when trying to access another tenant's resource

**User Multi-Membership Tests:**

- Creates user with memberships in both tenants
- Verifies user has correct role in each organization
- Tests organization switching via `/api/sessions/switch`

### Rate Limiting Tests

**Test Suite (`__tests__/multi-tenant/rate-limiting.test.ts`):**

- Fires 101 concurrent requests to trigger 100/min limit, expects some 429 responses
- Verifies rate limiting one tenant doesn't affect another tenant's requests

### Circuit Breaker Tests

**Test Suite (`__tests__/multi-tenant/circuit-breaker.test.ts`):**

- Records 5 failures to trigger circuit open state, verifies `canExecute` returns false
- Records success after failures, verifies circuit closes and failure count resets

### Migration Tests

**Test Suite (`__tests__/multi-tenant/migrations.test.ts`):**

- Verifies migrations applied to all active tenant databases (checks indexes exist)
- Confirms migration status tracked per tenant with completed migration names

### Test Helpers

**Helper Functions (`__tests__/helpers/tenant-setup.ts`):**

- `createTestTenant(slug)`: Creates organization document, creates tenant database (`org_{slug}`), initializes collections (events, receipts, sequences, templates) with required indexes
- `cleanupTestTenant(slug)`: Drops tenant database and removes organization document

---

## Migration Management

### Migration Tracking Per Tenant

```typescript
// models/tenant/migration.model.ts

import { Schema } from 'mongoose'

export const migrationSchema = new Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
  duration: { type: Number }, // milliseconds
  checksum: { type: String }, // For detecting modified migrations
})
```

### Migration Runner

```typescript
interface Migration {
  name: string
  up: (db: mongoose.Connection) => Promise<void>
  down: (db: mongoose.Connection) => Promise<void>
  checksum: string
}
```

**Migration Runner Behavior (`lib/migrations/runner.ts`):**

**Key functions:**

- `loadMigrations()`: Reads all `.ts` files from `migrations/tenant/`, computes MD5 checksum for each, returns sorted array
- `getMigrationStatus(tenantSlug)`: Returns `{ applied, pending, failed }` - compares applied migrations against available, detects checksum mismatches
- `runMigrationsForTenant(tenantSlug, { dryRun?, target? })`: Executes pending migrations sequentially, records status/duration, stops on failure
- `runMigrationsForAllTenants({ dryRun?, parallel? })`: Runs migrations across all active tenants, optionally in parallel

### Example Tenant Migrations

**Migration 001 (`migrations/tenant/001_initial_schema.ts`):**

Creates initial collections and indexes:

- `events`: indexes on `code` (unique), `startDate`, `status`
- `receipts`: indexes on `receiptNumber` (unique), `eventId`, `createdAt`
- `sequences`: index on `name` (unique)
- `templates`: index on `isDefault`

`down()` drops all four collections.

**Migration 002 (`migrations/tenant/002_add_receipt_search_index.ts`):**

Adds text search index on `receipts` collection:

- Fields: `customerName`, `customerEmail`, `receiptNumber`
- Weighted: receiptNumber (10) > customerName (5) > customerEmail (3)

### Migration CLI Script

**Script (`scripts/migrate-tenants.ts`):**

CLI script using native `process.argv` parsing for running and managing tenant migrations:

| Command               | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `status [tenantSlug]` | Shows applied/pending/failed migrations for specific tenant or all tenants                   |
| `up [tenantSlug]`     | Runs pending migrations; `--dry-run` flag for preview, `--parallel` for concurrent execution |

### Migration Tracking Dashboard (Super Admin)

**Dashboard Page (`app/(superadmin)/migrations/page.tsx`):**

Displays table with migration status for all active tenants:

| Column  | Content                                            |
| ------- | -------------------------------------------------- |
| Tenant  | Organization name                                  |
| Applied | Count of applied migrations                        |
| Pending | Count of pending migrations                        |
| Issues  | Failed count (red highlight if > 0)                |
| Actions | "Run Migrations" button (disabled if none pending) |

Uses Server Component to fetch migration status for each tenant in parallel.

---

## Backup & Restore Strategy

### Using MongoDB Atlas Built-in Backups

MongoDB Atlas provides built-in backup capabilities. For per-tenant restore:

1. **Cloud Backup**: Atlas automatically backs up all databases including tenant DBs
2. **Point-in-Time Recovery**: Available on M10+ clusters
3. **Download Backup**: Export individual tenant database

### Cloudflare R2 Backup Storage (Free Tier: 10GB, no credit card required)

```typescript
interface BackupMetadata {
  tenantSlug: string
  tenantId: string
  backupType: 'full'
  timestamp: Date
  collections: string[]
  documentCounts: Record<string, number>
  size: number
  storageBackend: StorageBackend
}

type StorageBackend = 'r2' | 'local'
```

**Backup Manager (`lib/backup/manager.ts`):**

Supports dual storage backends - Cloudflare R2 (production) or local filesystem (development).

**Key functions:**

| Function                                                       | Behavior                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `createTenantBackup(tenantSlug)`                               | Exports all collections to JSON, gzip compresses, uploads to R2 or saves locally with metadata |
| `restoreTenantBackup(tenantSlug, backupId, { dropExisting? })` | Downloads backup, decompresses, optionally drops existing DB, inserts documents                |
| `listTenantBackups(tenantSlug)`                                | Returns backup list with timestamp, collections, and size                                      |
| `deleteTenantBackup(backupId)`                                 | Removes backup files from storage                                                              |
| `cleanOldBackups(tenantSlug)`                                  | Auto-deletes backups older than `BACKUP_RETENTION_DAYS` (default: 30)                          |
| `getBackupStorageUsage()`                                      | Returns total bytes, GB, backup count across all tenants                                       |

**Backup ID format:** `{tenantSlug}/{YYYY-MM-DD}/{timestamp}`

**File structure:** `data.json.gz` + `metadata.json` per backup

if (!existsSync(BACKUP_DIR)) {
mkdirSync(BACKUP_DIR, { recursive: true })
}

const client = new MongoClient(process.env.MONGODB_URI!)
await client.connect()

const db = client.db(`org_${tenantSlug}`)
const collections = await db.listCollections().toArray()

const timestamp = new Date()
const dateStr = timestamp.toISOString().split('T')[0]
const tenantBackupDir = path.join(BACKUP_DIR, tenantSlug, dateStr)
mkdirSync(tenantBackupDir, { recursive: true })

const backupData: Record<string, any[]> = {}
const documentCounts: Record<string, number> = {}

for (const collection of collections) {
const name = collection.name
const docs = await db.collection(name).find({}).toArray()
backupData[name] = docs
documentCounts[name] = docs.length
}

await client.close()

const filePath = path.join(tenantBackupDir, `${timestamp.getTime()}.json.gz`)

await new Promise<void>((resolve, reject) => {
const output = createWriteStream(filePath)
const gzip = createGzip()

    gzip.pipe(output)

### Scheduled Backup Job

**Cron Endpoint (`app/api/cron/backup-tenants/route.ts`):**

- Verifies `CRON_SECRET` authorization header
- Iterates all active tenants
- Calls `createTenantBackup` for each
- Returns summary with success/failure per tenant

### Backup Restoration UI (Super Admin)

**Page (`app/(superadmin)/organizations/[slug]/backup/page.tsx`):**

Displays backup management for a specific tenant:

- Table listing available backups with date, collections, and restore action
- "Backup Now" button to create immediate backup
- Restore triggers confirmation before proceeding

---

## Middleware Architecture

**Middleware (`middleware.ts`):**

Handles path-based routing and organization context injection:

**Path categories:**

- `PUBLIC_PATHS`: `/`, `/login`, `/signup`, `/o`, `/api/sessions`, `/api/users`
- `SUPERADMIN_PATHS`: `/superadmin`, `/api/superadmins`
- `STATIC_PATHS`: `/favicon.ico`, `/_next`, `/api`

**Flow:**

1. Skip static paths and API routes
2. Allow public paths to pass through
3. Route super admin paths to `handleSuperAdminRoutes`
4. Extract organization slug from first path segment (e.g., `/aces/events` → `aces`)
5. Check Redis cache for organization status (key: `org:{slug}`, TTL: 5 minutes)
   - Cache hit: Use cached organization data (id, status, name)
   - Cache miss: Query database, cache result for future requests
6. Redirect to appropriate error pages based on status: `/org-not-found`, `/org-pending`, `/org-suspended`, `/org-deleted`
7. Inject organization context headers: `x-organization-id`, `x-organization-slug`, `x-organization-name`

**Slug extraction** skips known non-tenant paths (`v`, `api`, `superadmin`, `login`, etc.)

**Cache invalidation:** When organization status changes (approved, suspended, deleted, restored), the corresponding Redis cache key must be cleared or updated to ensure middleware reflects current state.

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

`formatReceiptNumber(format, data)` performs string replacement for each placeholder with provided data. Sequence number is zero-padded to 5 digits.

---

## Migrating Existing Data

For deployments with existing ACES data in the default database, a one-time migration is required to move data into the multi-tenant structure.

**Migration Script (`scripts/migrate-existing-data.ts`):**

Runs as a one-time operation during the multi-tenancy rollout:

1. Connect to the current MongoDB database containing existing ACES data
2. Create the `org_aces` tenant database (or configured slug for existing organization)
3. Copy all collections from the current database to the new tenant database:
   - `events` - all event documents
   - `receipts` - all receipt documents
   - `sequences` - sequence counters
   - `templates` - receipt templates
4. Create the organization document in the master database with `status: active`
5. Update the first admin user to include membership for the ACES organization with `role: admin`
6. Migrate existing SMTP vault entries, adding `organizationId` reference

**Pre-migration checklist:**

- Backup existing database before running migration
- Ensure `SMTP_VAULT_SECRET` is configured for re-encryption if needed
- Verify all existing users will be assigned to the correct organization

**Post-migration verification:**

- Confirm document counts match between source and target databases
- Verify indexes are created on all tenant collections
- Test login and data access through the new `/aces` path

---

## Phase-by-Phase Implementation

### Phase 1: Foundation (Week 1)

**Goal:** Multi-tenant database infrastructure

- [ ] Create `lib/db/tenant.ts` - tenant connection using Mongoose useDb()
- [ ] Create `lib/db/tenant-models.ts` - model factory
- [ ] Create `lib/db-conn.ts` - master database connection (rename existing)
- [ ] Create `models/organization.model.ts` - organization schema
- [ ] Update `models/user.model.ts` - add memberships array, isSuperAdmin
- [ ] Create `models/membership-request.model.ts` - join requests and invites
- [ ] Update `models/smtp-vault.model.ts` - add organizationId, iv, authTag fields for multi-tenant encryption
- [ ] Create `lib/encryption.ts` - AES-256-GCM encryption utilities
- [ ] Create `models/tenant/migration.model.ts` - migration tracking schema
- [ ] Create database migration utility for creating tenant DBs

### Phase 2: Middleware & Routing (Week 1)

**Goal:** Path-based organization routing with cached validation

- [ ] Create `middleware.ts` - path extraction, org validation with Redis caching
- [ ] Create `lib/organization-context.ts` - request context helper
- [ ] Create organization context provider for server components
- [ ] Create `app/(tenant)/org-not-found/page.tsx`
- [ ] Create `app/(tenant)/org-pending/page.tsx`
- [ ] Create `app/(tenant)/org-suspended/page.tsx`
- [ ] Create `app/(tenant)/org-deleted/page.tsx`
- [ ] Test path-based routing locally

### Phase 3: Landing Page & Auth Updates (Week 2)

**Goal:** New user sign-up flow with organization creation

- [ ] Create `app/page.tsx` - landing page
- [ ] Create `app/o/page.tsx` - org creation form
- [ ] Create `app/o/404/page.tsx` - organization not found
- [ ] Create `app/o/202/page.tsx` - organization pending approval
- [ ] Create `app/o/403/page.tsx` - organization suspended
- [ ] Create `app/o/410/page.tsx` - organization deleted
- [ ] Update `app/api/sessions/route.ts`:
  - Handle org selection after login
  - Return available memberships
  - Support org switching
- [ ] Update `app/api/users/route.ts`:
  - Create org on signup (if creating new org)
  - Add user to org membership
- [ ] Create `app/api/organizations/route.ts`:
  - GET: Check slug availability (validate against reserved slugs list)
  - POST: Create organization (pending status)
- [ ] Create `app/api/organizations/[slug]/route.ts`:
  - GET: Get organization info (public)
  - PATCH: Update organization settings

### Phase 4: Invite System (Week 2)

**Goal:** Email invites and invite codes

- [ ] Create `app/api/invites/route.ts`:
  - POST: Send email invite / generate invite code
  - GET: Validate invite code
- [ ] Create `app/api/invites/[token]/route.ts`:
  - GET: Get invite details (for acceptance page)
  - POST: Accept invite
- [ ] Create `app/(landing)/join/page.tsx` - join org by code
- [ ] Create `app/(landing)/invite/[token]/page.tsx` - accept email invite
- [ ] Create email template for organization invites

### Phase 5: Organization Management UI (Week 3)

**Goal:** Admin dashboard for organization settings

- [ ] Create org settings in sidebar
- [ ] Create member management page
- [ ] Create SMTP configuration (already in smtp vault)
- [ ] Create organization selector component (navbar)
- [ ] Create member invite UI component
- [ ] Create member role management (admin ↔ member)

### Phase 6: Super Admin (Week 3)

**Goal:** Platform administration

- [ ] Create `app/(superadmin)/layout.tsx` - super admin layout
- [ ] Create `app/(superadmin)/dashboard/page.tsx` - admin dashboard
- [ ] Create `app/(superadmin)/organizations/page.tsx` - all orgs list
- [ ] Create `app/(superadmin)/organizations/[slug]/page.tsx` - manage org
- [ ] Create `app/(superadmin)/users/page.tsx` - all users list
- [ ] Create `app/(superadmin)/deleted/page.tsx` - deleted orgs (restorable) [NOTE: NO NEED TO MAKE SEPARATE PAGE, CAN BE A FILTER ON THE ORGANIZATIONS PAGE]
- [ ] Create `app/api/superadmin/organizations/route.ts`
- [ ] Create `app/api/superadmin/organizations/[slug]/route.ts`:
  - PATCH: Approve, suspend, update limits
  - DELETE: Hard delete (past retention)
  - POST: Restore deleted org
- [ ] Create super admin middleware (check isSuperAdmin)

### Phase 7: Tenant Model Updates (Week 4)

**Goal:** Update all existing models and routes for multi-tenancy

- [ ] Move schemas to `models/tenant/` directory
- [ ] Update all API routes to use tenant models:
  - [ ] `app/api/events/*`
  - [ ] `app/api/receipts/*`
  - [ ] `app/api/documents/*`
  - [ ] `app/api/templates/*`
- [ ] Update all server components to use tenant context
- [ ] Update PDF generation with org branding
- [ ] Update email sending with SMTP vault selection

### Phase 8: Customization & Branding (Week 4)

**Goal:** Per-organization branding

- [ ] Update PDF generation to use org settings:
  - Primary color
  - Logo
  - Organization name
- [ ] Update receipt templates to accept org config
- [ ] Implement custom receipt number format per org
- [ ] Update email templates with org branding
- [ ] UI theming based on org primary color (CSS variables)

### Phase 9: Limits & Enforcement (Week 5)

**Goal:** Usage limits per organization

- [ ] Create `lib/limits.ts` - limit checking utilities
- [ ] Create limit checking middleware
- [ ] Enforce limits on:
  - [ ] Event creation (maxEvents)
  - [ ] Receipt creation (maxReceiptsPerMonth)
  - [ ] Member invites (maxUsers)
- [ ] Create usage tracking (counts per org)
- [ ] Create usage dashboard for org admins
- [ ] Create usage warning emails (optional) (should do)

### Phase 10: Deletion & Restoration (Week 5)

**Goal:** Soft delete with recovery period

- [ ] Create organization deletion API
- [ ] Create organization restoration API
- [ ] Create cron job for auto-purging old deleted orgs
- [ ] Create UI for deletion flow
- [ ] Create UI for restoration (super admin)

### Phase 11: Migration & Testing (Week 6)

**Goal:** Production readiness

- [ ] Create seed data for testing multiple orgs
- [ ] Create data migration script for existing ACES deployment (`scripts/migrate-existing-data.ts`)
- [ ] Test cross-tenant isolation thoroughly
- [ ] Test super admin flows
- [ ] Test invite flows (email and code)
- [ ] Test SMTP vault encryption/decryption
- [ ] Performance test with multiple databases
- [ ] Create admin documentation
- [ ] Create user documentation
- [ ] Deploy staging environment
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
APP_URL=https://receipts.yourdomain.com

# Super Admins (Comma-separated emails)
SUPER_ADMIN_EMAILS=admin@yourdomain.com

# Email (For system notifications) (Nodemailer)
SYSTEM_EMAIL_FROM=noreply@yourdomain.com
SYSTEM_SMTP_HOST=smtp.gmail.com
SYSTEM_SMTP_PORT=587
SYSTEM_SMTP_USER=xxx
SYSTEM_SMTP_PASS=xxx

# Rate Limiting (Upstash Redis - free tier available)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Backups (Cloudflare R2 - free tier: 10GB, no credit card)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=aces-receipts-backups
BACKUP_RETENTION_DAYS=30

# Fallback: Local filesystem backups (if R2 not configured)
BACKUP_DIR=./backups

# Monitoring
LOG_LEVEL=info

# Cron Jobs
CRON_SECRET=your-secure-cron-secret

# Optional
SMTP_VAULT_ENCRYPTION_ALGORITHM=aes-256-gcm
ORGANIZATION_RETENTION_DAYS=30
```

### Vercel Configuration

```json
// vercel.json
{
  "domains": [
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

## File Structure (Proposed) (Can change as needed)

```
app/
├── (landing)/                    # No tenant context
│   ├── page.tsx                  # Landing page
│   ├── login/
│   │   └── page.tsx
│   ├── organization/
│   │   └── page.tsx              # Create organization
│   │   └── /not-found/page.tsx
│   │   └── /pending/page.tsx
│   │   └── /suspended/page.tsx
│   │   └── /deleted/page.tsx
│   ├── join/
│   │   └── page.tsx              # Join by invite code
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx          # Accept email invite
│
├── (tenant)/                     # Tenant routes (path-based)
│   └── [slug]/                # Dynamic org slug from path
│       ├── events/
│       ├── receipts/
│       ├── settings/
│       │   ├── organization/
│       │   ├── members/
│       │   └── email/            # SMTP configuration
│       └── page.tsx              # Org dashboard
│
├── (superadmin)/                 # Super admin only
│   ├── dashboard/
│   ├── organizations/
│   │   ├── page.tsx              # List all
│   │   └── [slug]/
│   │       ├── page.tsx          # Manage single
│   │       └── backup/
│   │           └── page.tsx      # Backup management
│   ├── users/
│   ├── migrations/               # Migration dashboard
│   │   └── page.tsx
│   ├── errors/                   # Error tracking
│   │   └── page.tsx
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
        ├── backup-tenants/       # Scheduled backups
        └── purge-deleted-orgs/

lib/
├── db/
│   ├── conn.ts                   # Master connection
│   ├── tenant.ts                 # Tenant connection factory (with pooling)
│   └── tenant-models.ts          # Model factory
├── migrations/
│   └── runner.ts                 # Migration management
├── backup/
│   └── manager.ts                # Backup/restore operations
├── encryption.ts                 # AES-256-GCM utilities
├── organization-context.ts
├── rate-limiter.ts               # Per-tenant rate limiting
├── quota-enforcement.ts          # Resource quota checks
├── circuit-breaker.ts            # Tenant isolation on failures
├── logger.ts                     # Tenant-aware logging
├── metrics.ts                    # Per-tenant metrics
├── error-tracking.ts             # Error capture and storage
└── limits.ts

models/
├── user.model.ts                 # Updated with memberships
├── organization.model.ts         # New
├── membership-request.model.ts   # New
├── smtp-vault.model.ts           # New
└── tenant/                       # Tenant-scoped schemas
    ├── event.model.ts
    ├── receipt.model.ts
    ├── sequence.model.ts
    ├── template.model.ts
    └── migration.model.ts        # Migration tracking

migrations/
└── tenant/                       # Tenant database migrations
    ├── 001_initial_schema.ts
    └── 002_add_receipt_search_index.ts

__tests__/
└── multi-tenant/
    ├── isolation.test.ts         # Cross-tenant isolation tests
    ├── rate-limiting.test.ts     # Rate limit enforcement
    ├── circuit-breaker.test.ts   # Circuit breaker tests
    └── migrations.test.ts        # Migration tests
```

---

## Summary

| Aspect          | Decision                                             |
| --------------- | ---------------------------------------------------- |
| Database        | Separate DB per tenant (`org_slug`)                  |
| Routing         | Path-based (`receipts.yourdomain.com/aces`)          |
| User model      | Multi-tenant with memberships array                  |
| Invites         | Both email invites and shareable codes               |
| SMTP            | Encrypted vault per organization                     |
| Customization   | Colors, logo, receipt format per Org                 |
| Limits          | Enforced by super admin with quota middleware        |
| Rate Limiting   | Per-tenant via Upstash Redis (free tier available)   |
| Circuit Breaker | Per-tenant isolation on repeated failures            |
| Backups         | Cloudflare R2 (free tier: 10GB) or local filesystem  |
| Deletion        | Soft delete, 30-day recovery                         |
| Super admin     | Full platform access, org management, error tracking |
| Observability   | Tenant-aware logging and metrics                     |
| Migrations      | Per-tenant tracking with dashboard                   |

---

## Notes

1. We could've gone with custom sub-domains but it adds complexity with SSL, wildcard certs, and local development. Path-based routing is simpler to implement and manage. And more importantly, if someone doesn't have a domain they can still use for themselves
2. Separate databases provide the strongest isolation and easiest compliance path. We accept the tradeoffs in migration complexity and cross-tenant queries.
3. A organaization slug MUST BE GREATER THAN 2 CHARACTERS (Only letters, numbers, and hyphens allowed. Must start with letter. No trailing hyphens.) And must sanitize the slug. ALso not more than 20 characters
4. **Reserved slugs** are prohibited for organization creation to prevent conflicts with system routes: `api`, `v`, `superadmin`, `admin`, `login`, `signup`, `sign-in`, `sign-up`, `logout`, `settings`, `events`, `receipts`, `templates`, `documents`, `organization`, `org`, `invite`, `join`, `dashboard`, `users`, `members`, `migrations`, `errors`, `deleted`, `backup`, `cron`, `www`, `mail`, `email`, `help`, `support`, `about`, `pricing`, `terms`, `privacy`, `legal`. This list should be maintained as new routes are added.
