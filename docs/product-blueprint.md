# Field Service Platform Product Blueprint

## Product Vision

This platform is a general field service operations system designed for service-based businesses such as:

- commercial cleaning
- landscaping
- HVAC
- pest control
- maintenance
- inspection services
- mobile repair teams
- specialty service contractors

The goal is to provide a reusable SaaS foundation that supports sales, operations, dispatch, field execution, recurring service, and administrative control.

The platform must be modular, role-aware, and adaptable across industries.

---

## Core Product Principles

- Build for reuse across multiple service industries
- Keep the architecture modular and scalable
- Support role-based visibility and permissions
- Separate customer and site data from operational execution
- Treat work orders as the operational engine
- Support future recurring service, billing, and reporting
- Keep workflows explicit and document-driven
- Avoid coupling UI decisions to core business logic

---

## Core Roles

Initial supported roles:

- admin
- operations_manager
- support
- sales
- technician

Future roles may include:

- dispatcher
- accounting
- inspector
- supervisor
- customer_portal_user

---

## Primary Modules

### Dashboard

Purpose:

- give each role a high-level operational overview
- surface KPIs, activity, quick actions, and workload

Core capabilities:

- summary cards
- recent activity
- alerts
- shortcuts
- role-based dashboard views

---

### Leads

Purpose:

- capture and manage incoming service opportunities

Core capabilities:

- lead intake
- qualification
- status tracking
- assignment
- notes
- conversion into walkthroughs, customers, and estimates

Key statuses:

- new
- qualified
- walkthrough_needed
- quoted
- won
- lost
- archived

---

### Customers

Purpose:

- manage account-level service relationships

Core capabilities:

- company and account records
- billing info
- service history
- linked sites
- linked contacts
- contract relationships
- account notes

---

### Contacts

Purpose:

- store people linked to customers and sites

Core capabilities:

- multiple contacts per customer
- role labels
- phone and email
- primary contact designation
- site-specific contacts
- billing contacts
- operations contacts

---

### Sites

Purpose:

- represent service locations where work is performed

Core capabilities:

- physical addresses
- geolocation later
- access notes
- safety notes
- service instructions
- linked assets and equipment
- linked work history
- linked walkthroughs

---

### Walkthroughs

Purpose:

- support pre-service visits, inspections, and assessments

Core capabilities:

- schedule walkthrough
- assign responsible staff
- capture notes
- record findings
- attach photos later
- recommend scope
- hand off to estimate or operations

Key statuses:

- scheduled
- in_progress
- completed
- canceled

---

### Estimates

Purpose:

- create and manage quotes for prospective or existing customers

Core capabilities:

- line items
- service descriptions
- pricing totals
- optional add-ons
- approval status
- conversion into work orders or contracts

Key statuses:

- draft
- sent
- approved
- rejected
- expired

---

### Work Orders

Purpose:

- serve as the operational engine for service execution

Core capabilities:

- define scope of work
- link customer and site
- assign ownership
- track status
- hold internal notes
- attach service outcomes
- become the source record for work performed

Key statuses:

- new
- scheduled
- in_progress
- on_hold
- completed
- canceled
- closed

---

### Scheduling

Purpose:

- plan and manage operational calendar events

Core capabilities:

- assign jobs
- create schedule events
- view workload
- support future dispatch board
- support recurring jobs later

---

### Dispatch

Purpose:

- provide drag-and-drop or calendar-based operational assignment views

Future capabilities:

- assign technicians
- optimize schedules
- monitor capacity
- route work geographically
- rebalance workload

---

### Technicians

Purpose:

- support field staff records and future technician workspace

Core capabilities:

- technician profile
- role assignment
- work assignment
- daily jobs
- job status updates
- notes and checklists later

---

### Contracts

Purpose:

- manage recurring service agreements and customer commitments

Core capabilities:

- service frequency
- billing frequency
- linked customers
- linked sites
- renewal dates
- status
- recurring service generation later

---

### Assets

Purpose:

- track equipment or serviceable property at a site

Core capabilities:

- asset records
- equipment identifiers
- service history
- maintenance planning later
- notes and condition tracking

---

### Invoices

Purpose:

- manage billing records tied to completed work

Core capabilities:

- invoice generation
- invoice status
- customer billing history
- payment tracking later
- integration with billing systems later

---

### Activity Logs

Purpose:

- create a system-wide audit trail of important changes

Core capabilities:

- capture status changes
- capture assignments
- capture record creation
- capture workflow transitions
- support future reporting and debugging

---

### Notifications

Purpose:

- alert the right people when workflow events occur

Future capabilities:

- lead notifications
- job assignment notifications
- walkthrough reminders
- contract renewal reminders
- invoice reminders

---

### Reports

Purpose:

- give management insight into business and operational performance

Future capabilities:

- lead conversion
- workload
- completion rates
- technician productivity
- customer retention
- revenue and service mix

---

### Settings

Purpose:

- manage internal application controls

Core capabilities:

- role and permission configuration later
- company settings
- workflow defaults
- module visibility later
- internal configuration

---

## Core Data Relationships

- A Lead may be linked to a Customer later
- A Customer can have many Contacts
- A Customer can have many Sites
- A Site belongs to one Customer
- A Site can have many Walkthroughs
- A Site can have many Work Orders
- A Site can have many Assets
- A Walkthrough may produce one or more Estimates
- An Estimate may convert into a Work Order or Contract
- A Work Order belongs to one Customer and one Site
- A Work Order may have many Schedule Events
- A Work Order may be assigned to one technician or staff user
- A Contract belongs to one Customer and may cover one or more Sites later
- An Invoice belongs to one Customer and may reference a Work Order
- Activity Logs may reference any major entity

---

## Core Workflow Contracts

### Sales Workflow

Lead
→ qualify
→ walkthrough
→ estimate
→ approval
→ convert to customer and site
→ create work order or contract

### Operations Workflow

Work Order
→ assign
→ schedule
→ execute
→ complete
→ review
→ close
→ invoice

### Recurring Service Workflow

Contract
→ recurring service plan
→ generate work orders
→ schedule work
→ complete work
→ invoice customer

### Asset Service Workflow

Site
→ asset record
→ service activity
→ update condition
→ maintain history
→ plan recurring maintenance later

---

## Initial Phase Priorities

### Phase 1

- roles
- permissions foundation
- platform navigation
- Prisma schema
- database structure
- activity log foundation

### Phase 2

- leads
- customers
- contacts
- sites

### Phase 3

- walkthroughs
- estimates
- lead conversion flow

### Phase 4

- work orders
- scheduling
- assignments

### Phase 5

- technician workspace
- dispatch views
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

---

## Non-Goals Right Now

The platform should not begin with:

- overbuilt billing automation
- unnecessary visual complexity
- niche industry assumptions
- premature mobile apps
- full customer portal
- advanced dispatch optimization
- inventory depth beyond foundational models

---

## Build Standard

Every feature added to this platform should:

- fit the defined data model
- respect role boundaries
- support future workflow growth
- avoid breaking existing contracts
- be documented when it changes workflow behavior
- remain general enough for reuse across service industries
