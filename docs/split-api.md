# Split API — Documentation

## What Is the Split API?

The split API breaks each MongoDB collection into **one endpoint per nesting level**.

Instead of one endpoint that unwinds all arrays and returns a single massive flat table, the split API returns focused tables — one per concept. Power BI then joins them using shared keys, exactly like a relational database.

---

## The Problem It Solves

A single flat endpoint for `onboarding` at 25k employees:
- Unwinds phases → tasks → subtasks in one shot
- Returns **375,000 rows**, each repeating all base fields (employeeId, name, dept...)
- Sends ~14M field values over the wire

The split approach for the same data:
- `summary` → 25,000 rows (no unwind)
- `phases` → 75,000 rows (one unwind)
- `tasks` → 375,000 rows (two unwinds, but only task fields — no repeated base fields)
- Total: ~5.9M field values — **2.4x less data transferred**

Each endpoint is also faster individually because it uses at most **one or two `$unwind` stages**.

---

## How Power BI Uses It

```
summary     ──── onboardingId ────►  tasks
                                     taskId ──────►  subtasks
            ──── onboardingId ────►  training
            ──── onboardingId ────►  access (permissions)
```

In Power BI: Get Data → Web for each endpoint → define relationships in the data model → build visuals across all tables.

---

## All Endpoints

All endpoints require: `Authorization: Bearer <token>`

Base URL: `http://localhost:3000`

### Pagination

All endpoints support pagination via query parameters:

| Parameter | Default | Max | Description |
|---|---|---|---|
| `?limit=N` | 1000 | 10000 | Number of rows to return |
| `?skip=N` | 0 | — | Number of rows to skip (for paging) |

Example: `GET /api/split/onboarding/tasks?limit=500&skip=1000`

The `meta` block in every response includes `limit` and `skip` so you can tell what page you're on.

---

### Employees

| Endpoint | Rows | Join Key | Description |
|---|---|---|---|
| `GET /api/split/employees` | 1 per employee | `employeeId` | All employee fields flattened — no arrays in employees |

---

### Onboarding

| Endpoint | Rows | Join Key | Description |
|---|---|---|---|
| `GET /api/split/onboarding/summary` | 1 per employee | `onboardingId` / `employeeId` | Header fields — batch, dates, HR contact, buddy |
| `GET /api/split/onboarding/phases` | 1 per phase | `onboardingId` | Phase name, status, dates, task count |
| `GET /api/split/onboarding/tasks` | 1 per task | `onboardingId` | Task category, name, assignee, status, due/completed dates |
| `GET /api/split/onboarding/subtasks` | 1 per subtask | `onboardingId` + `taskId` | Subtask name, completed by, checklist items |
| `GET /api/split/onboarding/training` | 1 per module | `onboardingId` | Module name, score, attempts, pass/fail, hardest category |
| `GET /api/split/onboarding/access` | 1 per permission | `onboardingId` | System, role, permission key, granted by, scope |

---

### Offboarding

| Endpoint | Rows | Join Key | Description |
|---|---|---|---|
| `GET /api/split/offboarding/summary` | 1 per employee | `offboardingId` / `employeeId` | Header — separation type, dates, payroll, exit interview |
| `GET /api/split/offboarding/tasks` | 1 per task | `offboardingId` | Phase, task name, category, assignee, status |
| `GET /api/split/offboarding/verifications` | 1 per verification | `offboardingId` + `taskId` | Verified by, method, evidence type and location |
| `GET /api/split/offboarding/asset-return` | 1 per device | `offboardingId` | Device serial, condition grade, disposition, repair cost |
| `GET /api/split/offboarding/knowledge-areas` | 1 per KT area | `offboardingId` | Area name, status, handover to, document count |

---

### Services

| Endpoint | Rows | Join Key | Description |
|---|---|---|---|
| `GET /api/split/services/summary` | 1 per service | `serviceId` / `employeeId` | App name, vendor, license, cost, compliance, usage KPIs |
| `GET /api/split/services/features` | 1 per feature | `serviceId` | Feature name, enabled status, storage/API limits |
| `GET /api/split/services/weekly-usage` | 1 per week | `serviceId` | Weekly logins, data transfer, errors, peak hour, device type |
| `GET /api/split/services/escalation` | 1 per escalation contact | `serviceId` | L1/L2/L3 contacts, response times, escalation policy |

---

### Events

| Endpoint | Rows | Join Key | Description |
|---|---|---|---|
| `GET /api/split/events/summary` | 1 per event | `eventId` / `employeeId` | Event type, severity, module, audit, approval, credentials |
| `GET /api/split/events/changes` | 1 per field change | `eventId` | Field changed, old/new value, validation pass/fail |
| `GET /api/split/events/rules` | 1 per validation rule | `eventId` + `changeField` | Rule name, passed, message |

---

## Response Format

Every endpoint returns:

```json
{
  "meta": {
    "endpoint": "/api/split/onboarding/tasks",
    "description": "One row per onboarding task — join to phases on onboardingId",
    "joinKey": "onboardingId",
    "limit": 1000,
    "skip": 0,
    "recordsReturned": 1000,
    "totalTimeMs": 820
  },
  "data": [ ... ]
}
```

| Field | Meaning |
|---|---|
| `endpoint` | The URL that was called |
| `description` | What one row represents in this table |
| `joinKey` | The field(s) to use when joining to the parent table in Power BI |
| `limit` | Max rows requested |
| `skip` | Rows skipped (current page offset) |
| `recordsReturned` | Number of flat rows actually returned |
| `totalTimeMs` | End-to-end response time in milliseconds |

---

## Power BI Setup — Step by Step

1. Open Power BI Desktop
2. **Get Data → Web** → enter `http://localhost:3000/api/split/onboarding/summary`
3. **Advanced** → add header: `Authorization` = `Bearer <your-token>`
4. Click OK — Power BI parses the `data` array into a table
5. Rename the query to `OnboardingSummary`
6. Repeat for each endpoint you need
7. Go to **Model view** → drag `OnboardingSummary.onboardingId` to `OnboardingTasks.onboardingId` to create the relationship
8. Build visuals across tables — Power BI handles the join

---

## Recommended Power BI Data Model

```
Employees (employeeId)
    │
    ├── OnboardingSummary (employeeId → onboardingId)
    │       ├── OnboardingPhases    (onboardingId)
    │       ├── OnboardingTasks     (onboardingId)
    │       ├── OnboardingSubtasks  (onboardingId + taskId)
    │       ├── OnboardingTraining  (onboardingId)
    │       └── OnboardingAccess    (onboardingId)
    │
    ├── OffboardingSummary (employeeId → offboardingId)
    │       ├── OffboardingTasks          (offboardingId)
    │       ├── OffboardingVerifications  (offboardingId + taskId)
    │       ├── OffboardingAssetReturn    (offboardingId)
    │       └── OffboardingKnowledgeAreas (offboardingId)
    │
    ├── ServicesSummary (employeeId → serviceId)
    │       ├── ServicesFeatures    (serviceId)
    │       ├── ServicesWeeklyUsage (serviceId)
    │       └── ServicesEscalation  (serviceId)
    │
    └── EventsSummary (employeeId → eventId)
            ├── EventsChanges (eventId)
            └── EventsRules   (eventId + changeField)
```

---

## Why This Is Better Than a Single Flat Endpoint

| | Single flat endpoint | Split API |
|---|---|---|
| Data transferred | All base fields repeated per row | Base fields sent once in summary |
| `$unwind` stages per query | 2–3 chained | 0–2 max |
| Response size | Large | Small per endpoint |
| Power BI refresh | One slow call | Multiple fast calls, cached independently |
| Debugging | Hard — one huge table | Easy — each table has a clear purpose |
| Flexibility | Fixed | Add new split endpoints without changing existing ones |
