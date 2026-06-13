# Teacher Evaluation Studio

Teacher Evaluation Studio is a Next.js prototype for classroom observation workflows. It gives district admins, school admins, and teachers role-scoped dashboards for creating observations, reviewing rubric feedback, attaching classroom recordings, generating transcripts, producing coaching insights, and exporting PDF reports.

The app is useful as a local demo and codebase reference. It is not production-ready without replacing local file storage and hardening the production controls described below.

## Contents

- [Product Summary](#product-summary)
- [Current Capabilities](#current-capabilities)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Demo Accounts](#demo-accounts)
- [Codebase Map](#codebase-map)
- [How To Read The Code](#how-to-read-the-code)
- [Data Model](#data-model)
- [Auth And Role Scope](#auth-and-role-scope)
- [Routes](#routes)
- [API Overview](#api-overview)
- [AI Workflow](#ai-workflow)
- [State And Storage](#state-and-storage)
- [Testing](#testing)
- [Vercel And Production Readiness](#vercel-and-production-readiness)
- [Known Limitations](#known-limitations)

## Product Summary

The product problem:

- School leaders need a structured way to create teacher observations, score rubric categories, attach feedback, and review classroom evidence.
- Teachers need a clear place to review reports, feedback, transcript evidence, and AI-generated coaching recommendations.
- District leaders need district-wide visibility across schools, teachers, completion status, and evaluation trends.

The main workflow:

1. A school admin creates or opens an observation.
2. The observation stores rubric scores and written feedback.
3. The school admin records live audio or uploads classroom media.
4. The server stores upload metadata and generates a final transcript.
5. If `OPENAI_API_KEY` exists, transcription and insight generation use OpenAI.
6. If OpenAI is unavailable, deterministic fallback transcript and insight data keep the demo usable.
7. A teacher can view the report, transcript, AI insight, recommendations, and PDF export.
8. Finalized reports create in-app notifications and simulated email log rows.

## Current Capabilities

Implemented today:

- Public overview at `/` for signed-out users.
- Seeded role-based login with bcrypt password verification.
- Signed JWT sessions stored in an HTTP-only cookie named `teacher_eval_session`.
- Middleware protection for dashboard and observation pages.
- Server-side auth checks in pages and API routes.
- District, school admin, and teacher dashboards.
- Observation creation for school admins.
- Role-scoped observation report pages.
- Rubric scoring with six categories and score range 1 to 5.
- Written feedback storage.
- Recording upload UI for MP3, WAV, MP4, M4A, and WebM.
- Local ignored `.uploads/` storage for uploaded classroom recordings.
- OpenAI file transcription when `OPENAI_API_KEY` exists.
- Realtime browser microphone workflow using WebRTC and `POST /api/realtime/session`.
- OpenAI structured insight generation when `OPENAI_API_KEY` exists.
- Deterministic fallback transcript and insight generation.
- PDF export route at `GET /api/observations/:id/report.pdf`.
- In-app notification center and simulated email logs.
- Repeatable seed data and smoke test script.

## Tech Stack

| Area | Current implementation |
| --- | --- |
| Framework | Next.js App Router in `src/app` |
| UI | React 19, TypeScript, Server Components by default |
| Client interactivity | Client components for login, logout, forms, uploads, transcription, insight generation, and realtime recording |
| Styling | Tailwind CSS v4 through `@tailwindcss/postcss` and `src/app/globals.css` |
| Database | Prisma ORM with Supabase PostgreSQL |
| Auth | Seeded users, `bcryptjs`, `jose`, signed HTTP-only JWT cookie |
| AI transcription | OpenAI file transcription via `gpt-4o-transcribe-diarize` when configured |
| Realtime transcription | OpenAI Realtime WebRTC session route using `gpt-realtime-whisper` |
| AI insights | OpenAI Responses API structured output plus Zod validation |
| Fallback AI | Deterministic transcript and insight generation without `OPENAI_API_KEY` |
| PDF | Local dependency-free PDF generator in `src/lib/pdf-report.ts` |
| Scripts | `tsx` for TypeScript scripts |
| Quality checks | ESLint and `next build` |

There is no shadcn/ui package or lucide icon dependency in the current `package.json`. The app uses local components in `src/components`.

## Local Setup

Requirements:

- Node 20 or newer.
- npm.
- A Supabase project with PostgreSQL connection strings.

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Minimum local environment values:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require"
JWT_SECRET="replace-this-with-a-long-random-secret"
```

Supabase connection convention:

- `DATABASE_URL` should use the Supabase pooler connection string for app/runtime queries.
- `DIRECT_URL` should use the direct database host, usually `db.<project-ref>.supabase.co:5432`, for Prisma migrations.
- Use the full connection strings copied from Supabase when possible. If a password is typed manually, URL-encode reserved characters such as `#`, `@`, `/`, `?`, and `%`.
- Do not use the public Supabase API URL (`https://<project-ref>.supabase.co`) as either Prisma database URL.

Optional OpenAI values:

```bash
OPENAI_API_KEY="sk-..."
OPENAI_INSIGHT_MODEL="gpt-4o-mini"
```

Apply migrations and seed the database:

```bash
npm run db:deploy
npm run db:seed
```

Use `npm run db:migrate` only when you are intentionally creating a new
development migration. For a fresh checkout with existing migrations,
`npm run db:deploy` is the safer command because it applies committed migration
files without opening an interactive migration workflow.

Start the dev server:

```bash
npm run dev -- --port 3001
```

Open `http://localhost:3001`.

To start from a clean demo state before presenting or manually testing, run:

```bash
npm run db:reset
npm run db:check
npm run dev -- --port 3001
```

Leave the dev server running at `http://localhost:3001`. In a second terminal, run:

```bash
APP_BASE_URL=http://localhost:3001 npm run test:smoke
```

Useful local commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the Next.js app. |
| `npm run start` | Start the production server after a build. |
| `npm run lint` | Run ESLint. |
| `npm run db:generate` | Generate Prisma Client from `prisma/schema.prisma`. |
| `npm run db:migrate` | Create/apply development Prisma migrations. |
| `npm run db:deploy` | Apply existing Prisma migrations without creating new ones. |
| `npm run db:push` | Push the current schema without creating a migration. Use carefully for prototypes only. |
| `npm run db:seed` | Seed deterministic demo data. |
| `npm run db:reset` | Destructively reset the configured database, then seed demo data. Use only on disposable/dev databases. |
| `npm run db:check` | Print database counts and a sample observation. |
| `npm run test:smoke` | Run the local smoke script against `APP_BASE_URL`. |
| `npm run db:studio` | Open Prisma Studio. |

Database scripts run through `scripts/with-env.mjs` so Prisma and `tsx` scripts
read `.env.local`, matching how Next.js loads local environment values.

## Demo Accounts

All seeded users use password `password123`.

| Role | Email |
| --- | --- |
| District Admin | `district@example.com` |
| School Admin | `school@example.com` |
| Teacher | `teacher@example.com` |

The seed file includes additional demo users for broader dashboard data.

## Codebase Map

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages, layouts, and API route handlers. |
| `src/app/page.tsx` | Public overview for signed-out users; signed-in users redirect by role. |
| `src/app/login` | Login page and client login form. |
| `src/app/dashboard` | Role dashboards and dashboard redirect hub. |
| `src/app/observations` | Observation creation and report pages. |
| `src/app/api` | Route handlers for auth, observations, transcripts, insights, PDFs, and Realtime. |
| `src/components` | Shared UI and client components. |
| `src/lib/db.ts` | Shared Prisma client helper. |
| `src/lib/session.ts` | JWT signing, verification, cookie name, role labels, and dashboard paths. |
| `src/lib/auth.ts` | Cookie-to-user helpers and server-side auth helpers. |
| `src/lib/dashboard-data.ts` | Dashboard queries and view models. |
| `src/lib/observations.ts` | Observation access checks and report query shape. |
| `src/lib/audio-uploads.ts` | Upload validation, local storage, and path guard. |
| `src/lib/transcripts.ts` | Transcript formatting, OpenAI transcription, fallback transcript generation, and persistence. |
| `src/lib/insights.ts` | Zod insight schema, OpenAI insight generation, fallback generation, and persistence. |
| `src/lib/pdf-report.ts` | Dependency-free PDF builder. |
| `prisma/schema.prisma` | Database models, enums, relations, and uniqueness constraints. |
| `prisma/migrations` | Committed PostgreSQL migrations applied with `npm run db:deploy`. |
| `prisma/seed.ts` | Deterministic demo dataset. |
| `scripts/with-env.mjs` | Loads `.env.local` for Prisma and standalone scripts. |
| `scripts/check-db.ts` | Configured database sanity check. |
| `scripts/smoke-test.ts` | Local end-to-end smoke test. |

## How To Read The Code

Recommended order:

1. `prisma/schema.prisma`
   Read the enums and models first. This explains the domain vocabulary and relationships.

2. `prisma/seed.ts`
   Understand the demo district, schools, users, observations, transcripts, insights, notifications, and email logs.

3. `src/lib/session.ts` and `src/lib/auth.ts`
   Learn how sessions are signed, verified, and converted into current users.

4. `middleware.ts`
   See route-entry protection and role-specific dashboard redirects.

5. `src/lib/dashboard-data.ts` and `src/app/dashboard/*/page.tsx`
   Follow how role dashboards query and shape data.

6. `src/lib/observations.ts` and `src/app/observations/[id]/page.tsx`
   Follow report loading and record-level access checks.

7. `src/lib/audio-uploads.ts`, `src/lib/transcripts.ts`, and `src/lib/insights.ts`
   Read the recording, transcription, fallback, and AI insight workflow.

8. `src/app/api/**/route.ts`
   Review route handlers after you understand the shared helpers they call.

## Data Model

The Prisma schema is the database source of truth.

Core models:

| Model | Meaning |
| --- | --- |
| `District` | Top-level organization. Owns schools, users, and observations. |
| `School` | Belongs to one district. Groups school admins, teachers, and observations. |
| `User` | Login identity. Role determines access. `districtId` and `schoolId` determine scope. |
| `Observation` | Central report/workflow record. Connects teacher, observer, school, district, scores, feedback, recording, transcript, insight, notifications, and email logs. |
| `EvaluationScore` | One rubric score for one category on one observation. |
| `Feedback` | Written admin feedback to a teacher for one observation. |
| `AudioUpload` | Metadata for one current classroom recording. |
| `Transcription` | Full transcript text and provider/model metadata. |
| `TranscriptSegment` | Timestamped speaker turn under one transcription. |
| `Insight` | Structured AI coaching output stored as JSON sections. |
| `Notification` | In-app notification for one user, optionally tied to an observation. |
| `EmailLog` | Simulated email send record for one user, optionally tied to an observation. |

Key enums:

- `Role`: `DISTRICT_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`
- `ObservationStatus`: `DRAFT`, `SCHEDULED`, `RECORDED`, `TRANSCRIBED`, `ANALYZED`, `FINALIZED`
- `EvaluationCategory`: the six rubric categories shown in the observation form and report.
- `SpeakerType`: `TEACHER`, `STUDENT`, `GROUP`, `UNKNOWN`

## Database Workflow

The app now uses Supabase PostgreSQL through Prisma. There are no committed
SQLite database files, and local `.db` files are ignored as old workflow
artifacts.

For a fresh checkout:

```bash
npm install
cp .env.example .env.local
npm run db:deploy
npm run db:seed
npm run db:check
```

For a schema change:

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate -- --name short_descriptive_name`.
3. Review the new SQL file under `prisma/migrations`.
4. Run `npm run db:seed` only if demo data needs to be refreshed.
5. Run `npm run db:check`, `npm run lint`, and `npm run build`.

For an existing environment:

- Use `npm run db:deploy` to apply committed migrations.
- Avoid `npm run db:reset` unless the configured database is disposable. It
  destroys and recreates data before reseeding.

## Auth And Role Scope

Auth flow:

1. User posts credentials to `POST /api/auth/login`.
2. The route finds a seeded user by email and verifies the bcrypt password.
3. `src/lib/session.ts` signs a JWT with `JWT_SECRET`.
4. The response sets the HTTP-only `teacher_eval_session` cookie.
5. Server components and API routes call auth helpers to load the current user from the cookie.

Role scope:

| Role | Main access |
| --- | --- |
| District Admin | Can view district-level dashboards and observations in their district. |
| School Admin | Can view school-level dashboards, create observations for teachers in their school, update school observations, upload recordings, generate transcripts, and generate insights. |
| Teacher | Can view teacher dashboards and reports attached to their own user account. |

Middleware protects `/login`, `/dashboard`, `/dashboard/:path*`, and `/observations/:path*`. API routes still enforce auth and record-level access server-side; they do not rely on middleware alone.

## Routes

Page routes:

| Route | Purpose |
| --- | --- |
| `/` | Public overview, or role redirect when signed in. |
| `/login` | Login form and demo account buttons. |
| `/dashboard` | Signed-in dashboard redirect hub. |
| `/dashboard/district` | District admin dashboard. |
| `/dashboard/school` | School admin dashboard. |
| `/dashboard/teacher` | Teacher dashboard. |
| `/observations/new` | School-admin-only observation creation page. |
| `/observations/:id` | Shared role-scoped observation report. |

## API Overview

Auth:

- `POST /api/auth/login`: sign in and set session cookie.
- `POST /api/auth/logout`: clear session cookie.
- `GET /api/auth/me`: return current signed-in user.

Observations and reports:

- `GET /api/observations`: list observations scoped to the signed-in role.
- `POST /api/observations`: create an observation as a school admin.
- `GET /api/observations/:id`: read one authorized observation report.
- `PATCH /api/observations/:id`: update school-admin editable report fields.
- `GET /api/observations/:id/report.pdf`: download a generated PDF.

Recording, transcript, and AI:

- `POST /api/observations/:id/audio`: upload one recording, store metadata, and attempt transcript generation.
- `POST /api/observations/:id/transcribe`: regenerate the final transcript from an uploaded recording.
- `GET /api/observations/:id/transcript`: read the stored transcript.
- `POST /api/observations/:id/transcript`: create a deterministic fallback transcript.
- `POST /api/observations/:id/analyze`: generate or regenerate structured insight.
- `POST /api/realtime/session?observationId=:id`: create an OpenAI Realtime WebRTC transcription session.

## AI Workflow

File transcription:

1. School admin uploads or records classroom media.
2. The app validates file type, size, and basic container signature.
3. The route stores upload metadata and local file bytes under `.uploads/`.
4. If `OPENAI_API_KEY` exists and the stored file is available, the app asks OpenAI for a diarized transcript.
5. The app normalizes speaker turns into `TranscriptSegment` rows.
6. If OpenAI is unavailable or returns unusable output, the app stores deterministic fallback transcript rows.

Realtime transcription:

1. Browser requests microphone access.
2. Browser starts a WebRTC session through `POST /api/realtime/session`.
3. Live transcript text appears during the session.
4. When stopped, the browser uploads the final recording through the existing upload route.
5. The durable report transcript still comes from the finalized file transcription path.

Insight generation:

1. School admin clicks the report-page insight action.
2. The server loads transcript, rubric scores, feedback, and observation context.
3. If `OPENAI_API_KEY` exists, the server requests a structured JSON insight.
4. Zod validates the output shape before persistence.
5. If OpenAI is unavailable, deterministic fallback insight data is stored.

## State And Storage

| State | Current owner | Notes |
| --- | --- | --- |
| Users, observations, scores, feedback, transcripts, insights, notifications, email logs | Prisma/Supabase PostgreSQL | Hosted prototype database. |
| Session state | HTTP-only JWT cookie | Cookie stores a small signed payload; database remains source of truth for current user fields. |
| Uploaded recordings | `.uploads/` local folder | Ignored by Git. Production should use object storage. |
| Seed data | `prisma/seed.ts` | Deterministic demo baseline, not production data logic. |
| PDF reports | Generated on request | Not stored. |

## Testing

Current local checks:

```bash
npm run lint
npm run build
npm run db:check
APP_BASE_URL=http://localhost:3001 npm run test:smoke
```

The smoke script verifies the main demo path: signed-out overview, invalid login rejection, seeded data readiness, role logins, `/api/auth/me`, role dashboards, signed-in `/` redirect, scoped observations API, seeded report access, cross-role dashboard redirect, PDF response, and Realtime guard behavior.

Missing today:

- Unit tests.
- Component tests.
- Formal integration tests with a test database.
- Browser automation in CI.
- Upload/transcription tests with real media fixtures.
- OpenAI mocked contract tests.

## Vercel And Production Readiness

The app can use Vercel for the Next.js runtime, with Supabase PostgreSQL as the database.

Before using Vercel for anything beyond a short-lived demo:

1. Use `npm run db:deploy` for production migration application.
2. Replace `.uploads/` local file writes with object storage.
3. Decide whether seeded auth is acceptable or replace it with a production auth provider.
4. Add consent, retention, deletion, and audit policies for classroom recordings.
5. Add real email delivery if notifications should leave the app.
6. Add rate limits, abuse protection, observability, backups, and error monitoring.

Deployment environment variables:

| Variable | Required | Current use |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection used by the app. |
| `DIRECT_URL` | Yes | Supabase PostgreSQL connection used by Prisma migrations. |
| `JWT_SECRET` | Required in production | Signs and verifies session JWTs. |
| `OPENAI_API_KEY` | Optional | Enables OpenAI transcription, Realtime, and insight generation. |
| `OPENAI_INSIGHT_MODEL` | Optional | Overrides insight model; defaults to `gpt-4o-mini`. |

## Known Limitations

- Local `.uploads/` storage is not production-safe.
- There is no production auth provider.
- Realtime transcription requires browser microphone permissions and `OPENAI_API_KEY`.
- OpenAI calls are server-side but not queued or retried through background jobs.
- Email delivery is simulated only.
- There is no production audit log.
- Consent, retention, deletion, and export workflows are not implemented.
- There is no formal automated test suite beyond the smoke script.
- Large observation, transcript, and notification lists are not paginated.
