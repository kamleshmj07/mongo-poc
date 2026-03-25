# How `$unwind` Works — Explained with Staffing POC Examples

## The Core Idea

MongoDB stores data as **nested documents**. Power BI needs **flat rows**.

`$unwind` takes one array inside a document and **explodes it** — turning one document with N items in an array into N separate documents, one per item. The rest of the document is copied onto each row.

---

## The Document We're Working With

Every `onboards` document looks like this (simplified):

```json
{
  "docId": "VWQW-A2DDD",
  "onboard": {
    "commonName": "Stanley Xu",
    "department": "Finance",
    "joinDateStr": "2024-03-15"
  },
  "workflow": {
    "Status": "Completed",
    "Data": [
      { "Action": "Create Request",   "Status": "Done", "DoneDate": "2024-03-01" },
      { "Action": "Manager Approval", "Status": "Done", "DoneDate": "2024-03-05" },
      { "Action": "Services Process", "Status": "Done", "DoneDate": "2024-03-15" }
    ]
  },
  "services": [
    {
      "name": "Create Windows Account",
      "status": "Done",
      "resp": ["echo.chen@coo.company.com"],
      "fields": []
    },
    {
      "name": "Deploy PC",
      "status": "Done",
      "resp": ["echo.chen@coo.company.com"],
      "fields": [
        { "key": "AssetTag",     "value": "PC-00421" },
        { "key": "DeviceType",   "value": "Laptop"   },
        { "key": "SerialNumber", "value": "SN-88X91" }
      ]
    },
    {
      "name": "Create Concur Account",
      "status": "Done",
      "resp": ["summer.he@coo.company.com"],
      "fields": [
        { "key": "venderNumber",        "value": "EA9921" },
        { "key": "costCenterIndiviual", "value": "A93221" }
      ]
    }
  ]
}
```

**1 document, 3 services, some services have fields inside them.**

---

## Level 1 — Unwind a Simple Array

### Example: `$unwind: '$workflow.Data'`

Each workflow step becomes its own row. The rest of the document is repeated on each.

**Before** — 1 document with 3 workflow steps:
```
docId        | commonName  | workflow.Data (array)
-------------|-------------|--------------------------------------------
VWQW-A2DDD  | Stanley Xu  | [ Create Request, Manager Approval, Services Process ]
```

**After `$unwind: '$workflow.Data'`** — 3 rows:
```
docId        | commonName  | workflow.Data.Action    | workflow.Data.Status | workflow.Data.DoneDate
-------------|-------------|-------------------------|----------------------|------------------------
VWQW-A2DDD  | Stanley Xu  | Create Request          | Done                 | 2024-03-01
VWQW-A2DDD  | Stanley Xu  | Manager Approval        | Done                 | 2024-03-05
VWQW-A2DDD  | Stanley Xu  | Services Process        | Done                 | 2024-03-15
```

**This is what `/api/split/onboards/workflow-steps` does.**

**Rule: 1 doc × 3 steps = 3 rows. `docId` and `commonName` are repeated on each.**

---

## Level 1 — Unwind a Deeper Array

### Example: `$unwind: '$services'`

Each service task becomes its own row.

**Before** — 1 document with 3 services:
```
docId        | commonName  | services (array)
-------------|-------------|----------------------------------------------
VWQW-A2DDD  | Stanley Xu  | [ Windows Account, Deploy PC, Concur Account ]
```

**After `$unwind: '$services'`** — 3 rows:
```
docId        | commonName  | services.name           | services.status | services.resp
-------------|-------------|-------------------------|-----------------|--------------------------------
VWQW-A2DDD  | Stanley Xu  | Create Windows Account  | Done            | echo.chen@coo.company.com
VWQW-A2DDD  | Stanley Xu  | Deploy PC               | Done            | echo.chen@coo.company.com
VWQW-A2DDD  | Stanley Xu  | Create Concur Account   | Done            | summer.he@coo.company.com
```

**This is the foundation of `/api/split/onboards/services` and what v1 flatten and v2 pipeline both produce.**

**Rule: 1 doc × 3 services = 3 rows.**

---

## Level 2 — Unwind Two Arrays in Sequence

### Example: `$unwind: '$services'` → then `$unwind: '$services.fields'`

Each field inside each service becomes its own row.

**Before** — 1 document, 3 services, 5 fields total:
```
docId        | commonName  | services
-------------|-------------|-------------------------------------------------------
VWQW-A2DDD  | Stanley Xu  | Windows Account (0 fields), Deploy PC (3 fields), Concur (2 fields)
```

**After first unwind `$services`** — 3 rows (each still has fields array):
```
docId        | commonName  | services.name           | services.fields (still an array)
-------------|-------------|-------------------------|----------------------------------
VWQW-A2DDD  | Stanley Xu  | Create Windows Account  | []
VWQW-A2DDD  | Stanley Xu  | Deploy PC               | [ AssetTag, DeviceType, SerialNumber ]
VWQW-A2DDD  | Stanley Xu  | Create Concur Account   | [ venderNumber, costCenterIndiviual ]
```

**After second unwind `$services.fields`** — 5 rows (Windows Account disappears because its fields array is empty, unless you use `preserveNullAndEmptyArrays`):
```
docId        | commonName  | services.name          | services.fields.key     | services.fields.value
-------------|-------------|------------------------|-------------------------|----------------------
VWQW-A2DDD  | Stanley Xu  | Deploy PC              | AssetTag                | PC-00421
VWQW-A2DDD  | Stanley Xu  | Deploy PC              | DeviceType              | Laptop
VWQW-A2DDD  | Stanley Xu  | Deploy PC              | SerialNumber            | SN-88X91
VWQW-A2DDD  | Stanley Xu  | Create Concur Account  | venderNumber            | EA9921
VWQW-A2DDD  | Stanley Xu  | Create Concur Account  | costCenterIndiviual     | A93221
```

**Rule: 1 doc × 3 services × their fields = 5 rows. Rows multiply at every unwind.**

---

## Level 2 — The Pivot Alternative (What We Actually Do)

Instead of one row per field, we **pivot fields into columns** using `$arrayToObject`:

```js
{ $addFields: {
    _fieldsObj: {
      $arrayToObject: {
        $map: {
          input: '$services.fields',
          as: 'f',
          in: { k: { $concat: ['field_', '$$f.key'] }, v: '$$f.value' }
        }
      }
    }
}}
```

This turns the fields array into an object `{ field_AssetTag: "PC-00421", field_DeviceType: "Laptop", ... }` which gets merged into the service row.

**Result** — still 3 rows (one per service), but fields become columns:
```
docId       | serviceName            | field_AssetTag | field_DeviceType | field_SerialNumber | field_venderNumber | field_costCenterIndiviual
------------|------------------------|----------------|------------------|--------------------|--------------------|---------------------------
VWQW-A2DDD | Create Windows Account | (null)         | (null)           | (null)             | (null)             | (null)
VWQW-A2DDD | Deploy PC              | PC-00421       | Laptop           | SN-88X91           | (null)             | (null)
VWQW-A2DDD | Create Concur Account  | (null)         | (null)           | (null)             | EA9921             | A93221
```

**This is what `/api/split/onboards/services`, `v1`, and `v2` all do — one row per service, fields as columns.**

---

## Real Scale — What Happens at 1000 Documents

Assuming each onboard has ~7 services on average:

| Stage | Rows |
|---|---|
| Raw `onboards` collection | 1,000 |
| After `$unwind: '$services'` | ~7,000 |
| After second unwind `$services.fields` | ~18,000 (only services that have fields) |
| After `$unwind: '$workflow.Data'` | ~3,000 (3 steps per doc) |

**This is why row counts jump between endpoints** — each unwind multiplies by the average array size.

---

## `preserveNullAndEmptyArrays` — Keep Docs With Empty Arrays

Without it, documents where the array is empty or missing are **dropped**:

```js
// Create Windows Account has fields: [] — this doc vanishes after unwind
{ $unwind: '$services.fields' }
```

With it, they survive with `null` in the array field:

```js
{ $unwind: { path: '$services.fields', preserveNullAndEmptyArrays: true } }
```

```
serviceName             | fields.key | fields.value
------------------------|------------|-------------
Create Windows Account  | null       | null          ← kept
Deploy PC               | AssetTag   | PC-00421
Deploy PC               | DeviceType | Laptop
```

**We use this on optional arrays (fields[], logs[]) so no documents are silently lost.**

---

## companyprofiles — Same Concept, Different Arrays

A `companyprofiles` document has `acls[]` and inside each ACL is `values[]` (list of emails):

```json
{
  "unit": "COO",
  "name": "Nexara China",
  "acls": [
    { "key": "Author",     "values": ["anni.ma@coo.company.com", "rachel.tang@coo.company.com"] },
    { "key": "KeyUser",    "values": ["ashley.chen@coo.company.com"] },
    { "key": "SuperReader","values": ["anni.ma@coo.company.com", "susan.dan@coo.company.com"] }
  ]
}
```

**After `$unwind: '$acls'`** — 3 rows (one per ACL role):
```
unit | name          | acls.key   | acls.values (still an array)
-----|---------------|------------|------------------------------
COO  | Nexara China  | Author     | [anni.ma, rachel.tang]
COO  | Nexara China  | KeyUser    | [ashley.chen]
COO  | Nexara China  | SuperReader| [anni.ma, susan.dan]
```

In our split API we join the `values[]` into a semicolon string using `$reduce` instead of unwinding again — because for Power BI, a single `aclValues` column with `"anni.ma;rachel.tang"` is more useful than two separate rows.

---

## Summary — The Pattern

```
Array depth    Stage                        Rows per original doc
─────────────  ───────────────────────────  ─────────────────────
No unwind      $project only                1
One unwind     $unwind services[]           × avg services count (~7)
Two unwinds    $unwind services.fields[]    × avg services × avg fields
Two unwinds    $unwind workflow.Data[]      × workflow steps (~3)
Pivot instead  $arrayToObject on fields[]   stays at 1 per service — fields become columns
```

**The key decision:** unwind when each array item is an independent entity worth its own row (services, workflow steps). Pivot or join when the array items are attributes of the parent (fields on a service, email lists on an ACL role).
