# Field Service Platform Workflow Contracts

## Purpose

This document defines the core workflow contracts for the field service platform.

These workflows are the operational backbone of the application. All future features, APIs, UI modules, automations, and agent-driven changes must respect these contracts unless the contracts are intentionally revised.

This file exists to:

- define how core records move through the system
- prevent accidental workflow redesign
- create a stable foundation for future agents
- reduce regression risk when adding modules
- make cross-module behavior predictable

---

## Global Workflow Rules

- Every major workflow must map to existing entity relationships in the Prisma schema
- Workflow changes must not silently alter downstream behavior
- UI changes must not redefine workflow meaning
- Status values must be treated as business contracts, not cosmetic labels
- Conversions between records must be explicit and traceable
- Activity logs should be created for major transitions
- Role visibility must not be confused with workflow ownership
- New workflow steps must be documented before implementation if they affect system behavior

---

## Workflow 1: Lead Intake to Customer Conversion

### Purpose

This workflow governs how a potential service opportunity enters the platform and becomes a real customer relationship.

### Primary entities

- Lead
- Walkthrough
- Estimate
- Customer
- Site
- WorkOrder
- ActivityLog

### Standard flow

Lead
→ qualification
→ walkthrough decision
→ estimate decision
→ customer and site creation
→ work order creation or contract creation

### Detailed workflow

#### Step 1: Lead created

A lead enters the system through:

- manual entry
- quote form
- sales intake
- support intake
- import or integration later

Expected outputs:

- Lead record exists
- status defaults to `new`
- activity log may be created

#### Step 2: Lead reviewed

A sales or support role reviews the lead.

Possible actions:

- update notes
- assign owner
- qualify or disqualify
- determine whether walkthrough is needed

Status movement may include:

- `new` → `qualified`
- `new` → `lost`
- `qualified` → `walkthrough_needed`
- `qualified` → `quoted`

#### Step 3: Walkthrough required or skipped

If on-site review is needed:

- create walkthrough
- link walkthrough to lead
- assign staff
- schedule assessment

If no walkthrough is needed:

- proceed directly to estimate creation or manual conversion flow

#### Step 4: Estimate created

An estimate may be created from:

- a lead
- a walkthrough
- an existing customer request later

Expected outputs:

- Estimate linked to lead or walkthrough
- estimate status starts as `draft`

#### Step 5: Estimate outcome

Possible estimate outcomes:

- `draft` → `sent`
- `sent` → `approved`
- `sent` → `rejected`
- `sent` → `expired`

#### Step 6: Lead conversion

If service is won:

- create customer record if none exists
- create one or more site records if needed
- link customer to original lead
- set lead status to `won`
- create work order or contract depending on service model

If not won:

- set lead status to `lost`

### Workflow rules

- A lead should not directly become a completed work order without explicit conversion steps
- Converting a lead must preserve traceability
- Winning a lead should not destroy original lead history
- Customer creation should be explicit and not inferred silently
- Site creation should occur before work order creation when work is tied to a location
- Estimate approval does not automatically imply work has been scheduled unless explicitly implemented later

---

## Workflow 2: Walkthrough and Assessment Flow

### Purpose

This workflow governs how site visits and assessments are scheduled, performed, and used downstream.

### Primary entities

- Walkthrough
- Lead
- Customer
- Site
- Estimate
- ActivityLog

### Standard flow

Walkthrough scheduled
→ assigned
→ performed
→ findings recorded
→ recommendation produced
→ estimate created or follow-up decision made

### Detailed workflow

#### Step 1: Walkthrough created

A walkthrough may be created from:

- a lead
- an existing customer request
- an internal operations need later

Expected outputs:

- Walkthrough record exists
- status defaults to `scheduled`

#### Step 2: Walkthrough assigned

An operations or support role assigns the walkthrough to a user.

Expected outputs:

- assigned user recorded
- scheduled start and end may be set

#### Step 3: Walkthrough performed

Staff completes the assessment.

Possible data recorded:

- notes
- findings
- recommendations
- site issues
- service scope clarification
- photos later

Status movement:

- `scheduled` → `in_progress`
- `in_progress` → `completed`
- `scheduled` → `canceled`

#### Step 4: Downstream action

After completion, the walkthrough may lead to:

- estimate creation
- work order planning later
- no action
- follow-up tasks later

### Workflow rules

- A walkthrough can exist without a customer if still tied to a lead
- A completed walkthrough should preserve findings for later estimate generation
- Walkthrough completion does not equal service completion
- Walkthrough data should remain readable after downstream conversion

---

## Workflow 3: Estimate to Work Order Flow

### Purpose

This workflow governs how quoted work becomes operational work.

### Primary entities

- Estimate
- Customer
- Site
- WorkOrder
- ActivityLog

### Standard flow

Estimate drafted
→ sent
→ approved
→ work order created

### Detailed workflow

#### Step 1: Estimate drafted

Estimate is created with:

- title
- scope
- totals
- service description
- linked lead, customer, or walkthrough

#### Step 2: Estimate sent

Estimate is moved to `sent`.

Expected outputs:

- sent timestamp may be recorded

#### Step 3: Estimate approved or rejected

If approved:

- approved timestamp may be recorded
- operational handoff may begin

If rejected:

- estimate remains historical record
- no work order is created

#### Step 4: Work order created

Approved estimates may create a work order.

Expected outputs:

- work order linked to customer
- work order linked to site
- work order optionally linked to estimate
- work order starts with `new` or `scheduled`

### Workflow rules

- Work orders should not be automatically created from unapproved estimates
- Estimate history must remain intact after work order creation
- Estimate totals and work order execution are related but not identical contracts
- Work order creation should capture enough scope for operations to act without rereading all prior records

---

## Workflow 4: Work Order Execution Flow

### Purpose

This workflow governs how service work is planned, assigned, executed, and closed.

### Primary entities

- WorkOrder
- Customer
- Site
- User
- ScheduleEvent
- Invoice
- ActivityLog

### Standard flow

Work order created
→ assigned
→ scheduled
→ in progress
→ completed
→ closed
→ invoiced

### Detailed workflow

#### Step 1: Work order created

A work order may come from:

- approved estimate
- customer service request later
- recurring contract later
- internal operations creation later

Expected outputs:

- linked customer
- linked site
- title
- service type or scope
- initial status `new`

#### Step 2: Work order assigned

An owner may be set for operational responsibility.

Expected outputs:

- assignedTo populated
- activity log recommended

#### Step 3: Work order scheduled

A schedule event may be created for the work order.

Possible status movement:

- `new` → `scheduled`

#### Step 4: Work begins

When execution starts:

- status may move to `in_progress`

#### Step 5: Work completed

When field execution is done:

- status moves to `completed`
- completion timestamp may be stored

#### Step 6: Work reviewed and closed

Administrative or operational review may occur before final closure.

Possible status movement:

- `completed` → `closed`

#### Step 7: Work invoiced

An invoice may be created after completion or closure.

### Workflow rules

- A work order must belong to a customer and site
- Work order completion is not the same as invoice payment
- Work order closure is an administrative state, not just a field completion state
- Cancellation should preserve history
- On-hold states should not destroy schedule history

---

## Workflow 5: Scheduling and Dispatch Flow

### Purpose

This workflow governs how work is placed on calendars and assigned to people.

### Primary entities

- ScheduleEvent
- WorkOrder
- User
- ActivityLog

### Standard flow

Work order ready
→ schedule event created
→ assigned to staff
→ confirmed
→ completed or rescheduled

### Detailed workflow

#### Step 1: Schedule event created

An event is created with:

- title
- start time
- end time
- linked work order optionally
- assigned user optionally

Status defaults to `scheduled`

#### Step 2: Schedule confirmation

Operations may confirm timing or assignment.

Status movement:

- `scheduled` → `confirmed`

#### Step 3: Execution

During active work:

- `confirmed` → `in_progress`

#### Step 4: Completion or cancellation

Possible status movement:

- `in_progress` → `completed`
- `scheduled` → `canceled`
- `confirmed` → `canceled`

### Workflow rules

- Schedule events may exist before full dispatch board functionality exists
- Schedule events should remain separate from work order status even if related
- A work order may eventually support multiple schedule events
- Rescheduling should preserve historical record where possible

---

## Workflow 6: Contract and Recurring Service Flow

### Purpose

This workflow governs long-term recurring service relationships.

### Primary entities

- Contract
- Customer
- Site
- WorkOrder
- ScheduleEvent
- Invoice
- ActivityLog

### Standard future flow

Contract created
→ activated
→ recurring service generated
→ work orders created
→ scheduled
→ completed
→ invoiced

### Current implementation note

This workflow is planned and modeled, but not yet fully implemented.

### Workflow rules

- Contracts are long-term relationship records
- Contracts should not replace work orders
- Recurring service should generate operational records rather than existing only as schedule text
- Contract status and work execution status are separate concerns

---

## Workflow 7: Asset Service Flow

### Purpose

This workflow governs equipment or asset tracking tied to sites.

### Primary entities

- Asset
- Site
- WorkOrder
- ActivityLog

### Standard future flow

Asset created
→ linked to site
→ inspected or serviced
→ history updated
→ future maintenance planned

### Workflow rules

- Assets belong to sites
- Asset history should remain readable independent of current service status
- Asset records should support future maintenance workflows without redesign

---

## Workflow 8: Billing Flow

### Purpose

This workflow governs invoice creation and status progression.

### Primary entities

- Invoice
- Customer
- WorkOrder
- ActivityLog

### Standard flow

Invoice drafted
→ issued
→ paid or overdue
→ archived later if needed

### Status movement

- `draft` → `issued`
- `issued` → `paid`
- `issued` → `overdue`
- `draft` or `issued` → `void`

### Workflow rules

- Invoice creation should not imply payment
- Paid status should be explicit
- Void status must preserve historical traceability
- Invoices may exist without payment integration at first

---

## Activity Logging Contract

### Purpose

Major changes should be traceable across modules.

### Recommended activity triggers

- record created
- status changed
- assignment changed
- estimate approved
- lead converted
- work order completed
- invoice issued
- contract activated

### Rules

- Activity logs should describe what happened clearly
- Activity logs should identify actor when possible
- Activity logs should not be treated as the sole source of truth for business state
- Activity logs supplement, not replace, entity records

---

## Role Responsibility Guidance

### Admin

- full platform visibility
- settings
- oversight
- workflow correction
- cross-module administration

### Operations Manager

- scheduling
- work orders
- walkthrough coordination
- technician oversight
- site readiness

### Support

- intake help
- updates
- administrative coordination
- record maintenance

### Sales

- lead handling
- qualification
- estimate flow
- customer conversion

### Technician

- assigned work visibility
- schedule visibility
- job execution updates later

---

## Workflow Protection Rules

The following changes must not be made casually:

- changing status names without updating all dependent logic
- skipping conversion steps between entity types
- collapsing multiple entities into one for UI convenience
- making estimates function as invoices
- making walkthroughs function as work orders
- using schedule events as the only source of job history
- silently removing historical records during conversion

---

## Revision Rule

If future development changes workflow meaning, this file must be updated before or alongside implementation.
