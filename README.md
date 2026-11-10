# DynamicActive Classroom Evaluation

A district-scoped classroom evaluation platform built with Next.js, TypeScript,
Prisma, Supabase Auth/PostgreSQL/Storage, and Supabase Queues (PGMQ).

School administrators schedule observations, upload private recordings, and review
AI-generated rubric suggestions before publishing a report. Teachers see their
own finalized reports; district administrators see only their district.

## Current implementation

- Invite-only Supabase Auth with current database membership checks.
- Central record authorization for reports, transcripts, PDFs, recordings, and jobs.
- Direct signed recording uploads, limited to 25 MB, with explicit authorization
  attestation and district-configured retention.
- Transactional queue sends and durable worker checkpoints, expiring leases,
  bounded retries, dead letters, and authorized replay.
- Evidence-linked suggestions for six rubric categories, separate from approved
  scores. Missing evidence can produce an unscored suggestion.
- Explicit review/finalization, audit events, revision snapshots, and in-app
  notifications. Provider failures never generate invented fallback content.
- Retention cleanup for recordings, transcripts, job payloads, report snapshots,
  and reports, including durable retry of failed Storage deletions.
- 13 unit tests, 9 database/queue integration scenarios, and 24 Playwright cases.
  CI requires the browser/database suites to pass against a dedicated test project.

**Verification status:** local lint, types, formatting, unit tests, build, and
public-page browser checks can run without hosted credentials. Database migrations,
real Auth/Storage/queues, the full Playwright suite, and live AI performance still
require an active configured Supabase test project. Test discovery is not a pass.
Do not treat this branch as a verified production deployment before those checks.

## Setup without Docker

Use Node 22.12+ and an active Supabase **development** project. Local containers
are not required. Keep development, testing, staging, and production separate.

```bash
npm ci
cp .env.example .env.local
npm run db:generate
npm run db:deploy
npm run dev -- --port 3001
```

Configure the ignored `.env.local` using the variables in `.env.example`:

| Variable                     | Purpose                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Restricted application database connection, using the Supabase pooler where appropriate |
| `DIRECT_URL`                 | Migration-owner connection; provide only to migration/operator commands                 |
| `SUPABASE_URL`               | Project origin                                                                          |
| `SUPABASE_PUBLISHABLE_KEY`   | Auth client key; not the service role                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`  | Privileged Auth/Storage integration, server only                                        |
| `SUPABASE_RECORDINGS_BUCKET` | Existing private bucket, capped at 26,214,400 bytes                                     |
| `APP_ORIGIN`                 | Canonical web origin; localhost:3001 during development                                 |
| `OPENAI_API_KEY`             | Actual secret value configured securely; a Platform key ID is insufficient              |
| `OPENAI_TRANSCRIPTION_MODEL` | Defaults to `gpt-4o-transcribe-diarize`                                                 |
| `OPENAI_INSIGHT_MODEL`       | Defaults to `gpt-4o-mini`                                                               |

The web process does not need the OpenAI key; only the evaluation worker does.
Never place a service role, database password, or OpenAI secret in `NEXT_PUBLIC_*`.
Review provider model availability before deployment; models are configurable.

## Provision users and district policy

Disable public signup in the hosted Supabase Auth dashboard. Configure SMTP, the
canonical site URL, allowed redirect URLs, and the invitation/recovery HTML
from `supabase/templates/`. `supabase/config.toml` records corresponding local
settings; committing that file does **not** configure a hosted project.

Bootstrap the first district/admin/school from an operator terminal with privileged
DB credentials, then grant the normal web process its restricted login:

```bash
npm run district:create -- "Example District" "District Admin" "admin@example.org" "Example School"
```

The invited administrator accepts their email link, sets a password, opens
`/settings`, selects retention periods, and invites school admins and teachers.
Operators provision additional schools through controlled database administration;
there is no self-service tenant creation or billing in this release.

Legacy demo seed accounts have no Supabase Auth identity and cannot log in. Do
not seed or reset a production database. `db:reset` destroys data.

## Run processing and maintenance

In a separate native Node process, using the worker database login:

```bash
npm run worker
```

Run `npm run maintenance` at least hourly using your hosting scheduler. Configure
alerts for a nonzero exit status. The native Node deployment blueprint in
`render.yaml` provides worker and maintenance services; Next.js runs on Vercel.
No container runtime is used by these commands.

Useful operator commands:

```bash
npm run queue:status
npm run benchmark -- RUN_ID
```

Health is available at `/api/health`; it returns 503 if the DB cannot be reached or
no worker heartbeat was seen in the last minute. Queue status exits nonzero for
missing workers, dead letters, or queue age above five minutes.

## Tests and CI

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test:unit
npm run build
APP_BASE_URL=http://localhost:3001 npm run test:smoke
npx playwright test --list
```

For the integration and browser suites, configure a **dedicated hosted test
project**, create its private recordings bucket, and export these variables into
the shell that runs the tests:

- `E2E_DATABASE_URL` (migration owner; synthetic test fixtures need queue inspection)
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_PUBLISHABLE_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_RECORDINGS_BUCKET`

Apply committed migrations to that test database, then run:

```bash
npx playwright install chromium
npm run test:integration
npm run test:e2e
```

The fixture creates two synthetic districts and several role-scoped identities,
uses real Auth/Storage/PostgreSQL/PGMQ, and cleans up only IDs it created. AI
outputs are injected at the worker provider boundary, not mocked browser APIs.
Never run these suites against a project with real classroom records or an active
production worker. Run one suite at a time against its dedicated queues.

GitHub Actions uses the `testing` environment. Add the first four `E2E_*` variables
as environment secrets and `E2E_RECORDINGS_BUCKET` as an environment variable.
Missing configuration fails the test job; it does not silently skip tests. Require
`quality` and `platform-tests` checks in branch protection before merging. Branch
protection and environment secrets are repository settings, not applied by YAML.
Forked PRs need a trusted review before running workflows with test credentials.

## Code map

| Area                            | Entry point                                  |
| ------------------------------- | -------------------------------------------- |
| Identity and tenant scope       | `src/lib/auth.ts`, `src/lib/access.ts`       |
| Upload, polling, review API     | `src/app/api/observations/`                  |
| Processing contracts and leases | `src/lib/jobs/`                              |
| Browser workflow                | `src/components/evaluation-workflow.tsx`     |
| Retention and deletion          | `src/lib/lifecycle/retention.ts`             |
| Schema, server roles, PGMQ      | `prisma/schema.prisma`, `prisma/migrations/` |
| Operational rollout             | `docs/operations.md`                         |

Legacy synchronous transcription/analysis/upload, fallback generation, and live
preview routes return 410. Consumers must migrate to signed uploads and durable
runs. Existing report reads and PDF paths remain available with stricter scope.

## Performance evidence

The internship's approximately two-hours-to-one-minute result is historical
measurement, not a benchmark reproduced by this checkout. `npm run benchmark`
reports actual queue wait and processing-stage times for a run. Measure upload,
recording duration, human review time, model version, input size, and multiple
representative runs before claiming this deployment achieves the same result.
