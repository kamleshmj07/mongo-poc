# HR MongoDB POC

A proof-of-concept replicating a real-world pattern: nested MongoDB documents → Node.js API → flat data for Power BI.

---

## What This POC Does

Simulates an HR/IT system with employee data stored in MongoDB. An API reads the nested documents and flattens them into tabular rows — exactly how a real system feeds data to Power BI.

The POC compares **two API approaches** to identify where performance bottlenecks come from.

---

## Collections (MongoDB)

All collections live in the `hrpoc` database and are linked by `employeeId`.

| Collection | Documents | Description |
|---|---|---|
| `employees` | 5,000 | Master employee record |
| `onboarding` | 5,000 | One per employee — phases, tasks, training |
| `offboarding` | ~1,500 | 30% of employees who left |
| `services` | ~30,000 | Software/tools per employee (5–8 each) |
| `events` | ~60,000 | Audit trail — hired, device assigned, access revoked, etc. |

All documents are **5 levels deep** — nested objects and arrays within arrays.

---

## The Flattening Problem

MongoDB stores rich nested documents. Power BI needs flat rows.

```
MongoDB document (nested)          Power BI row (flat)
─────────────────────────          ──────────────────
onboarding                         onboardingId | employeeId | phaseName | taskName | subtaskName | ...
 └── phases[]
      └── tasks[]
           └── subtasks[]
```

Getting from left to right is called **flattening**. How you do it determines performance.

---

## Two API Approaches

### V1 — Work API Style (slow)
Replicates the current approach used at work.

```
Request → MongoDB: find({}) → all nested docs into Node.js memory → JS loops flatten them → response
```

- MongoDB hands off large nested documents to Node.js
- Node.js flattens them with nested for-loops (single-threaded)
- For 0.1M records: ~5–6 minutes
- **Bottleneck: JS flattening time**

### V2 — Optimized (fast)
MongoDB does all the work using aggregation pipelines.

```
Request → MongoDB: aggregate([{$unwind}, {$project}]) → flat rows arrive directly → response
```

- MongoDB unwinds arrays and projects flat fields internally (C++, parallelized)
- Node.js receives already-flat rows — no processing needed
- For the same data: seconds, not minutes
- **Bottleneck: none significant**

---

## API Routes

All routes require a **Bearer token** in the `Authorization` header.

| Route | Description |
|---|---|
| `GET /health` | Health check (no auth) |
| `GET /api/schema` | Returns all queryable fields and filters per collection |
| `GET /api/:collection` | Flexible query builder — field selection + filters (used by UI) |
| `GET /api/v1/:collection` | Work API style — fetch all, flatten in Node.js |
| `GET /api/v2/:collection` | Optimized — MongoDB pipeline flattening |
| `GET /api/compare/:collection` | Runs both, returns performance metrics side by side |

`:collection` = `employees` / `onboarding` / `offboarding` / `services` / `events`

### Performance Metrics (in every response)
```json
"meta": {
  "mongoQueryTimeMs": 800,
  "flattenTimeMs": 3400,
  "totalTimeMs": 4220,
  "docsFromMongo": 5000,
  "recordsReturned": 75000,
  "memoryDeltaMb": 210.4
}
```

### Compare Endpoint Response
```
GET /api/compare/onboarding
```
```json
{
  "collection": "onboarding",

  "summary": {
    "v1_totalTimeMs": 4800,       ← total wall-clock time for v1 (ms)
    "v2_totalTimeMs": 420,        ← total wall-clock time for v2 (ms)
    "speedupFactor": "11.4x faster with v2",
    "v1_recordsOut": 75000,       ← flat rows produced by v1
    "v2_recordsOut": 75000,       ← flat rows produced by v2 (should match)
    "v1_memoryDeltaMb": 210.4,    ← Node.js heap consumed by v1
    "v2_memoryDeltaMb": 18.2      ← Node.js heap consumed by v2
  },

  "v1": {
    "approach": "js-flatten (work API style)",
    "docsFromMongo": 5000,        ← raw nested documents pulled into Node.js memory
    "recordsReturned": 75000,     ← flat rows after JS unwind (5000 docs × ~15 tasks each)
    "mongoQueryTimeMs": 900,      ← time MongoDB took to return the raw docs
    "flattenTimeMs": 3900,        ← time Node.js spent looping and flattening ← THE BOTTLENECK
    "totalTimeMs": 4800,
    "memoryDeltaMb": 210.4,       ← high because full nested docs live in memory during flatten
    "bottleneck": "JS flattening"
  },

  "v2": {
    "approach": "mongodb-pipeline (optimized)",
    "docsFromMongo": 75000,       ← already-flat rows from MongoDB (no nested docs ever loaded)
    "recordsReturned": 75000,
    "mongoQueryTimeMs": 420,      ← MongoDB did the unwind + project internally
    "flattenTimeMs": 0,           ← no JS work needed — rows arrive flat
    "totalTimeMs": 420,
    "memoryDeltaMb": 18.2,        ← low because Node.js only holds flat rows, not full docs
    "bottleneck": "none significant"
  }
}
```

**How to read this:**
- `docsFromMongo` vs `recordsReturned` — in v1, 5000 nested docs expand to 75000 flat rows after JS unwind. In v2, MongoDB returns 75000 flat rows directly — the ratio is the same but the work happens in different places.
- `flattenTimeMs` — this is the cost of nested JS for-loops. In v1 this is the dominant cost. In v2 it is always 0.
- `memoryDeltaMb` — v1 loads full nested documents (large) then builds a second flat array in memory simultaneously. v2 only ever holds flat rows.
- `speedupFactor` — how many times faster v2 is than v1 for this collection.

---

## Split API

A third API approach built separately from v1/v2. Instead of one endpoint returning everything flat, it exposes **one endpoint per nesting level** — Power BI joins them using shared keys.

| Endpoint group | Sub-endpoints |
|---|---|
| `/api/split/employees` | 1 endpoint — no arrays |
| `/api/split/onboarding/*` | summary, phases, tasks, subtasks, training, access |
| `/api/split/offboarding/*` | summary, tasks, verifications, asset-return, knowledge-areas |
| `/api/split/services/*` | summary, features, weekly-usage, escalation |
| `/api/split/events/*` | summary, changes, rules |

**Why:** Avoids repeating base fields on every row, each endpoint uses at most 1–2 `$unwind` stages, and Power BI refreshes each table independently.

All split endpoints support pagination:

| Parameter | Default | Max |
|---|---|---|
| `?limit=N` | 1000 | 10000 |
| `?skip=N` | 0 | — |

Example: `GET /api/split/onboarding/tasks?limit=500&skip=1000`

See [`docs/split-api.md`](./docs/split-api.md) for full endpoint reference, response format, and Power BI setup guide.

---

## Vue UI — Query Builder

A browser-based config UI to explore data without writing any code.

- Pick a collection
- Check which fields you want returned
- Set filters (department, status, date range, etc.)
- Run the query — results appear in a table
- Copies the exact API URL ready for Power BI's Web connector

---

## Project Structure

```
mongo-poc/
├── docker-compose.yml        ← MongoDB + Mongo Express (browser DB viewer)
├── .env                      ← credentials and JWT secret
│
├── seed/                     ← generates and inserts all data
│   ├── seed.js               ← main script: node seed.js 5000
│   ├── generators/           ← one generator per collection
│   └── data/                 ← static catalogs (departments, software, hardware)
│
├── api/                      ← Express API
│   ├── server.js
│   ├── routes/
│   │   ├── query.js          ← flexible query builder (/api)
│   │   ├── v1.js             ← work API style (/api/v1)
│   │   ├── v2.js             ← optimized (/api/v2)
│   │   └── compare.js        ← performance comparison (/api/compare)
│   ├── flatten/              ← JS flatten functions (v1 approach)
│   ├── pipelines/            ← MongoDB aggregation pipelines (v2 approach)
│   └── queries/              ← field maps and pipeline builder for UI
│
└── ui/                       ← Vue 3 query builder UI
    └── src/
        └── App.vue
```

---

## Running the POC

**Prerequisites:** Docker Desktop, Node.js

**1. Start MongoDB**
```bash
docker compose up -d
```
Mongo Express (DB browser): http://localhost:8081

**2. Seed the database**
```bash
cd seed
npm install
node seed.js 5000
```

**3. Generate your bearer token** (valid 6 months)
```bash
cd api
npm install
node generate-token.js
```

**4. Start the API**
```bash
node server.js
```
API runs on http://localhost:3000

**5. Start the UI**
```bash
cd ui
npm install
npm run dev
```
UI runs on http://localhost:5173

---

## Power BI Connection

1. Power BI Desktop → **Get Data → Web**
2. URL: `http://localhost:3000/api/v2/onboarding`
3. Add header: `Authorization` = `Bearer <your-token>`
4. Power BI receives a flat JSON array — map directly to a table
5. Repeat for each collection and join on `employeeId`

Use **v2 endpoints** for Power BI — significantly faster than v1.

---

## Performance Test Results (2026-03-22)

Tests run on `onboarding` collection — the deepest nested collection (phases → tasks → subtasks).

### 5,000 employees → 75,000 flat rows

| | v1 (JS flatten) | v2 (MongoDB pipeline) |
|---|---|---|
| MongoDB fetch | 2,455ms | 6,054ms |
| JS flatten | 64ms | 0ms |
| **Total** | **2,520ms** | **6,054ms** |
| Memory used | 130MB | 223MB |
| **Winner** | **v1 — 2.4x faster** | |

### 25,000 employees → 375,000 flat rows

| | v1 (JS flatten) | v2 (MongoDB pipeline) |
|---|---|---|
| MongoDB fetch | 11,113ms | 31,015ms |
| JS flatten | 401ms | 0ms |
| **Total** | **11,514ms** | **31,015ms** |
| Memory used | 651MB | 981MB |
| **Winner** | **v1 — 2.7x faster** | |

> 50,000 employee seed failed due to local machine memory limits. Max tested: 25,000.

---

## Key Finding — v2 is Slower Than Expected

The `$unwind` aggregation approach was expected to win. It did not. Here is why:

**v1 transfers:** 25,000 nested docs from MongoDB → Node.js
**v2 transfers:** 375,000 flat rows from MongoDB → Node.js

`$unwind` multiplies the rows MongoDB must stream back. Each flat row repeats base fields (employeeId, name, department...) for every task — so v2 sends roughly **6x more bytes** over the wire than v1, even on localhost.

JS flattening grew from 64ms (5k) to 401ms (25k) — linear and manageable. It is not the bottleneck at this scale.

**The real bottleneck in both approaches is MongoDB fetch and data transfer time.**

---

## What This Means for the Work API

The work API takes 5–6 minutes for 100k records. Based on this POC the likely causes are:

1. **Remote DB network latency** — not local Docker, adds significant transfer time
2. **Memory / GC pressure** — loading 100k+ large nested docs into Node.js heap causes garbage collection pauses
3. **JS flatten grows linearly** — at 100k docs it becomes more significant but is still secondary

### What Actually Fixes It

| Fix | Impact |
|---|---|
| **Pagination / cursor streaming** — don't fetch all at once, stream in batches of 500–1000 | High |
| **Projection on `find()`** — only fetch fields that are needed, reduces transfer size | High |
| **Indexes** on filtered fields — reduce docs scanned for filtered queries | Medium |
| Moving to MongoDB pipeline (`$unwind`) | Low at current scale, may help at 500k+ |

---

## Key Takeaway

> The bottleneck is not JS flattening — it is fetching and transferring large volumes of data in one shot.
> The fix is pagination and projection, not rewriting the flatten logic.
> This POC provides measurable evidence to bring to the dev team.
