# Phase 1 Build Plan

## Phase Goal

Phase 1 establishes the foundational architecture and first operational records for the field service platform.

This phase is not intended to build the full product. It is intended to create the minimum stable base that future modules can safely build on.

The focus is:

- platform integrity
- schema readiness
- role-aware structure
- first core business entities
- first safe CRUD path
- first activity logging foundation

---

## Phase 1 Outcomes

By the end of Phase 1, the platform should have:

- working Prisma setup
- initial database migration applied
- generated Prisma client
- stable schema for the first core entities
- role-aware platform shell
- initial navigation structure
- first API-backed module
- first basic activity logging path
- stable architecture for future modules

---

## Included In Phase 1

### Architecture and Platform Foundation

- role-aware layout
- navigation contract
- shared role type
- permissions helper
- platform shell
- governed docs
- agent rules

### Database Foundation

- Prisma installed and configured
- PostgreSQL connection configured
- schema committed
- first migration created
- Prisma client generated

### First Core Data Entities

These are considered Phase 1-ready in schema and architecture:

- User
- Lead
- Customer
- Contact
- Site
- Walkthrough
- Estimate
- WorkOrder
- ScheduleEvent
- Contract
- Asset
- Invoice
- ActivityLog

Note:
Not all modules must be fully implemented in UI during Phase 1. Some only need schema readiness.

### First Functional Module

The first real implementation target should be:

- Leads

This module should become the first end-to-end vertical slice.

That means:

- schema exists
- API route exists
- UI list exists
- basic create/update behavior exists
- status changes work
- activity logging starts

### Supporting Module Foundations

These should exist as placeholders or structural shells, but do not need full CRUD yet:

- Customers
- Sites
- Walkthroughs
- Scheduling

---

## Explicitly Not Included In Phase 1

The following should not be fully built yet:

- full dispatch board
- technician mobile workflow
- recurring contract automation
- advanced invoices/payments
- customer portal
- route optimization
- AI pricing logic
- advanced reporting
- deep asset maintenance workflow
- broad notification automation

These can be modeled, but not fully implemented.

---

## Phase 1 Implementation Order

### Step 1

Lock architecture and governance documents

Required files:

- `docs/product-blueprint.md`
- `docs/workflow-contracts.md`
- `AGENTS.md`

### Step 2

Initialize Prisma

Required work:

- create `.env`
- set `DATABASE_URL`
- run Prisma generate
- run first migration

### Step 3

Create shared database access layer

Required work:

- create `lib/prisma.ts`
- ensure safe singleton usage for Next.js dev mode

### Step 4

Build lead module as first vertical slice

Required work:

- leads data access
- leads API routes
- leads list page
- lead detail or edit path
- status updates
- assigned user support later if needed
- basic activity log creation

### Step 5

Add customer and site groundwork

Required work:

- placeholder pages already exist
- prepare API planning
- define conversion path from lead to customer/site

### Step 6

Add activity log utility foundation

Required work:

- reusable server utility for writing activity logs
- first usage in lead create/update actions

---

## Phase 1 Success Criteria

Phase 1 is successful when:

- the app runs cleanly
- Prisma is connected and working
- database migration exists
- Prisma client generates correctly
- Leads module is backed by real data
- Lead statuses can be updated safely
- activity logging is functioning at a basic level
- architecture remains clean and role-aware
- future modules can build on the same contracts

---

## Lead Module Minimum Requirements

The first implementation module must support:

### Lead fields

- company name
- contact name
- email
- phone
- service type
- source
- notes
- status

### Lead actions

- create
- list
- view basic details
- update
- change status

### Lead workflow support

- initial intake
- qualification
- walkthrough-needed status
- quote-ready status
- won/lost states later

### Lead UI expectations

- clean list page
- status badge
- summary card or detail panel later
- future convert actions planned, not required yet

---

## Activity Log Minimum Requirements

Phase 1 activity logging only needs to support:

- record created
- status changed
- record updated

Required fields:

- actor if available
- entity type
- entity id
- action
- optional message
- created timestamp

---

## Phase 1 Engineering Rules

- do not skip schema validation
- do not hardcode fake backend assumptions into the UI
- do not build multiple modules at once
- do not redesign workflows during implementation
- do not add niche industry logic
- do not treat placeholder pages as final module implementations
- do not break role-aware structure

---

## Phase 1 Recommended Next File Set After Prisma Init

After Prisma is initialized, the next core files should be:

- `lib/prisma.ts`
- `lib/activity-log.ts`
- `app/api/leads/route.ts`
- `app/api/leads/[id]/route.ts`
- upgraded `app/(platform)/leads/page.tsx`

---

## Final Rule

Phase 1 is about building the first reliable slice of the platform, not racing to cover every module.
