# Business Intelligence Platform

A multi-tenant BI platform that connects to whatever systems a business already runs on,
normalises their very different schemas into a shared canonical model, and generates
reports from the result — including AI-written narrative reports built from spreadsheets
you upload on the spot.

> **Status:** working personal project, actively built. It runs locally end to end;
> it is not a hosted product.

## The problem it solves

Three restaurants keep their orders in three different databases with three different
column names for the same thing. Traditional BI tools make you reshape all of that by hand
before you can ask a single cross-business question.

This platform separates ingestion from meaning:

```
data source  →  raw tables/records  →  field mappings  →  canonical records  →  reports
 (as-is)         (schema preserved)     (per-source)      (shared shape)
```

Raw data lands untouched, so nothing is lost. A **canonical model** — a "golden schema" —
defines the shape you actually want to query, and per-source **field mappings** describe how
each system's columns feed it. Add a fourth restaurant and you write mappings, not migrations.

See [database_architecture.md](database_architecture.md) for the full ER diagram.

## Features

- **Connectors** — MySQL, PostgreSQL, REST APIs, Shopify, and Excel uploads
- **Golden schemas** — define canonical models and map each source's fields onto them
- **Document ingestion pipeline** — a staged pipeline for messy spreadsheets: document
  analysis → layout serialisation → AI extraction → validation, with caching between runs
- **Ad-hoc AI reports** — select spreadsheets, describe what you want in plain English, get
  a print-ready PDF back
- **Report templates & scheduling** — saved configurations executed as background jobs
- **Dashboards & data explorer** — charts over canonical data, plus raw record browsing
- **Multi-tenancy & RBAC** — organisation-scoped data with roles and email team invites

## Stack

| Layer | Choice |
|---|---|
| API | NestJS, TypeScript, Prisma |
| Web | Next.js (App Router, Turbopack), React 19, Tailwind CSS 4, Radix UI |
| Database | PostgreSQL |
| Jobs | BullMQ on Redis |
| Object storage | S3-compatible (MinIO locally) |
| AI | routed through a local OpenAI-compatible gateway |

```
apps/api/   NestJS API — connectors, ingestion, transformation, reports
apps/web/   Next.js dashboard
```

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for Postgres, Redis, and MinIO)

### 1. Infrastructure

```bash
docker compose up -d
```

Brings up PostgreSQL on `5432`, Redis on `6379`, and MinIO on `9000` (console on `9001`).

### 2. Install and configure

```bash
npm install
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/saas_db
PORT=3001

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth — set this. It falls back to a hardcoded default if unset.
JWT_SECRET=replace-me

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=reports
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Outbound email for team invites
SMTP_URL=smtp://localhost:1025

# AI gateway (OpenAI-compatible)
OMNIROUTE_URL=http://localhost:20128/v1
```

A full list lives in `apps/api/.env.example`.

And `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Database

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

`prisma generate` is required before the API will build — several modules import enums
(`Role`, `DataSourceType`, `DataSourceStatus`) from the generated client.

### 4. Run

```bash
npm run dev          # from the repo root, runs both apps
```

API on `http://localhost:3001`, dashboard on `http://localhost:3000`.

## API surface

`/auth`, `/data-sources`, `/canonical-models`, `/analytics`, `/reports`,
`/reports/ad-hoc`, `/report-templates`, `/team`, plus `/external-api/mock-store` — a mock
storefront used to exercise the REST connector without a live third-party API.

## Notes on the AI layer

Report narration and spreadsheet extraction go through an OpenAI-compatible endpoint set by
`OMNIROUTE_URL`, which defaults to a local gateway. Point it at any compatible provider, or
substitute your own in `apps/api/src/utils/ai-generator.util.ts`.

## License

[MIT](LICENSE)
