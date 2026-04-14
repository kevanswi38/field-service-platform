# AGENTS.md

## Purpose

This file governs all AI-assisted development for the field service platform.

Agents must treat this repository as a structured SaaS platform with defined architecture, workflow contracts, and schema boundaries.

The goal of agent usage is to accelerate development without damaging:

- system integrity
- workflow correctness
- schema consistency
- role boundaries
- reusable architecture

Agents must not behave like freeform code generators. They must behave like disciplined contributors operating inside a governed software system.

---

## Repository Intent

This project is a reusable field service operations platform intended to support multiple service industries, including but not limited to:

- commercial cleaning
- landscaping
- HVAC
- pest control
- maintenance
- inspections
- mobile service operations

The application is not a single-purpose niche site. It is a modular SaaS foundation.

Agents must preserve that generality.

---

## Source of Truth Order

When making decisions, agents must follow this source-of-truth hierarchy:

1. `docs/product-blueprint.md`
2. `docs/workflow-contracts.md`
3. `prisma/schema.prisma`
4. existing route structure and module boundaries
5. current implementation details

If current code conflicts with documented intended architecture, agents must favor the documented architecture unless explicitly instructed otherwise.

---

## Governance

All implementation work MUST comply with `/docs/build-governance-auditor.md`.

No phase is considered complete until the implementation passes Build Governance Audit.

Every implementation must:

- remain within defined phase scope
- preserve existing workflow contracts
- maintain role and permission integrity
- avoid unintended shared system impact

Failure to pass audit means the implementation is NOT complete and must not proceed.

---

## Non-Negotiable Rules

### 1. Do not redesign workflows casually

Agents must not redefine lead, walkthrough, estimate, work order, scheduling, contract, asset, or invoice workflows unless explicitly instructed.

### 2. Do not collapse entities for convenience

Agents must not merge concepts like:

- lead and customer
- walkthrough and work order
- estimate and invoice
- schedule event and work order

These are separate business records by design.

### 3. Do not break role-aware architecture

The platform is intentionally role-aware. Agents must preserve role boundaries and future support for visibility control.

### 4. Do not replace modular architecture with page-local logic

Business rules should not be trapped inside page components if they belong in shared logic.

### 5. Do not make business logic UI-dependent

Business logic must not rely on visual state, temporary labels, or presentation-only assumptions.

### 6. Do not remove traceability

Historical records and conversion relationships must remain traceable.

### 7. Do not silently rename statuses or enums

Statuses are business contracts, not cosmetic text.

### 8. Do not introduce fragile shortcuts

Agents must avoid hacks that solve immediate UI pain while increasing long-term structural risk.

---

## Required Reading Before Major Changes

Before implementing major features, agents must review:

- `docs/product-blueprint.md`
- `docs/workflow-contracts.md`
- `prisma/schema.prisma`

Major changes include:

- schema updates
- workflow changes
- role changes
- new modules
- conversion logic
- assignment logic
- scheduling logic
- cross-module API work

---

## Approved Development Priorities

Agents should generally work in this order:

### Phase 1

- architecture stabilization
- navigation
- role-aware layout
- schema readiness
- platform foundations

### Phase 2

- leads
- customers
- contacts
- sites

### Phase 3

- walkthroughs
- estimates
- lead conversion

### Phase 4

- work orders
- scheduling
- assignment logic

### Phase 5

- technician workspace
- dispatch
- recurring scheduling

### Phase 6

- contracts
- assets
- invoices

### Phase 7

- reports
- notifications
- automations
- AI enhancements

Agents should not skip ahead recklessly if prerequisite data or workflow structure is not ready.

---

## Required Behavior for Agents

### Agents must preserve system integrity

Before modifying shared code, agents must inspect related files and understand dependencies.

### Agents must be regression-conscious

When changing shared architecture, agents must look for potential breakpoints in:

- imports
- role logic
- routing
- schema usage
- component contracts
- API payload shapes

### Agents must verify wiring

If an agent adds a new module or feature, it must verify:

- route exists
- navigation path is correct
- imports resolve
- types align
- schema fields exist
- UI references match actual data structures

### Agents must use best-fit placement

New logic should be added to the correct layer:

- UI components for presentation
- lib for reusable logic
- prisma for data contracts
- docs for workflow or architecture decisions

### Agents must prefer additive evolution over destructive rewrites

Unless explicitly told to rewrite, agents should extend the platform carefully rather than replacing stable foundations.

---

## Required Output Standards

When generating code, agents should:

- use explicit names
- preserve readability
- avoid hidden assumptions
- keep modules focused
- use full implementations when touching a feature deeply
- avoid partial code that leaves the system half-wired
- respect existing naming patterns unless intentionally upgrading them across the whole system

---

## Schema Safety Rules

Agents modifying `prisma/schema.prisma` must:

- preserve existing entity intent
- avoid renaming fields without updating dependents
- avoid removing fields unless migration intent is explicit
- maintain relationship clarity
- maintain enum meaning
- avoid adding niche industry-specific fields unless they can generalize

When unsure, agents should add extensible generic fields rather than overspecialized ones.

---

## Workflow Safety Rules

Agents implementing workflow logic must respect:

### Lead flow

Lead
→ qualify
→ walkthrough if needed
→ estimate if needed
→ customer and site creation
→ work order or contract creation

### Walkthrough flow

Scheduled
→ in progress
→ completed
→ estimate or follow-up

### Estimate flow

Draft
→ sent
→ approved or rejected or expired
→ work order if approved

### Work order flow

New
→ scheduled
→ in progress
→ completed
→ closed
→ invoiced

### Scheduling flow

Scheduled
→ confirmed
→ in progress
→ completed or canceled

Agents must not introduce contradictory behavior.

---

## UI Safety Rules

Agents may improve UI, but must not:

- break route structure
- hardcode business logic into visual components
- destroy role-aware navigation
- create duplicate page systems for the same module
- replace clean shared layout patterns with one-off page wrappers

Agents should prefer shared, reusable components when patterns repeat.

---

## Documentation Rules

Agents must update docs when changes affect:

- workflow meaning
- architecture boundaries
- schema structure
- module purpose
- role responsibilities

At minimum, agents should note when a change requires doc updates, even if not asked.

---

## Forbidden Agent Behaviors

Agents must not:

- invent undocumented workflows
- create unrelated modules without architectural fit
- treat placeholder UI copy as final business logic
- wire fake data as if it were real backend behavior
- change route meaning without updating navigation and docs
- add hidden side effects
- create schema drift between docs and implementation
- ignore existing role structure
- overwrite stable files carelessly

---

## Recommended Specialized Agent Roles

This repository is best served by specialized agents such as:

### Architecture Agent

Focus:

- module boundaries
- file placement
- shared patterns
- route structure

### Schema Agent

Focus:

- Prisma schema
- relations
- enums
- migrations

### Workflow Agent

Focus:

- state transitions
- conversion logic
- operational rules

### UI Agent

Focus:

- layout
- component polish
- role-aware screens
- dashboard and module UX

### API Agent

Focus:

- route handlers
- validation
- payload contracts
- backend wiring

### Regression Guard Agent

Focus:

- dependency checks
- contract verification
- broken import detection
- schema/usage mismatches

### Documentation Agent

Focus:

- docs consistency
- workflow updates
- architecture notes
- change summaries

### Build Governance Auditor

Focus:

- phase scope compliance
- workflow contract integrity
- role and permission integrity
- backend authority preservation
- shared system safety
- data contract consistency
- UI pattern consistency
- regression risk assessment
- file integrity review

This agent audits implementation results against `/docs/build-governance-auditor.md`.

It does not build, redesign, or fix code. It only determines whether the implementation is SAFE or NOT SAFE to proceed.

---

## Implementation Pattern for Future Agent Work

Before coding:

1. identify module and workflow
2. inspect relevant docs
3. inspect relevant schema entities
4. inspect current routes and shared components
5. identify regression risks

During coding:

1. update correct layer
2. preserve shared patterns
3. avoid breaking unrelated modules
4. keep role logic intact

After coding:

1. verify imports
2. verify routes
3. verify schema references
4. verify navigation
5. verify no contract drift
6. run Build Governance Audit before considering the phase complete

---

## Final Rule

Agents are contributors to a governed platform, not autonomous redesigners.

They must protect the long-term integrity of the system while helping it evolve into a production-grade field service SaaS foundation.
