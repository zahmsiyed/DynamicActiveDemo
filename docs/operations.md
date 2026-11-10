# Operational rollout

## Database access

Use a fresh production Supabase project. Apply committed Prisma migrations with
the migration-owner connection (`DIRECT_URL`); do not run `db:push`, seed, or reset
in production. The queue extension is enabled by a committed SQL migration.

Migrations create two non-login group roles: `dynamic_active_web` and
`dynamic_active_worker`. Create distinct password-bearing login roles through a
secure operator session and grant the matching group. For example, create a
`da_web` login, grant `dynamic_active_web`, then use `\password da_web` interactively.
Do the same for `da_worker`. Do not write passwords into migration files or shell
history. Use the project-specific connection/pooler format documented by Supabase.

Use `da_web` for Vercel's `DATABASE_URL`; use `da_worker` for worker and maintenance
`DATABASE_URL`. Keep the migration-owner credential out of both runtime services.
Use a privileged operator connection for the bootstrap command and test suites.

Auth identities do not automatically become Prisma/RLS identities. Application
scope is enforced in server queries. Public Data API roles have no table grants
and RLS is enabled; trusted server group policies deliberately allow their
application operations. Browser clients never receive those database credentials.
Check the project's Data API exposure settings and security advisors before launch.

## Storage, Auth, and provider setup

1. Create the private recording bucket with a 25 MB object limit. Disable public
   access; do not add anonymous upload/read policies. Signed upload URLs target a
   single generated path and expire after two hours.
2. Disable Auth public signup, configure SMTP and the canonical site URL, and copy
   the invitation/recovery templates. Validate delivered links on staging.
3. Configure Vercel with Auth/Storage credentials and `APP_ORIGIN`. The worker needs
   restricted DB access, Storage service credentials, and the existing OpenAI key's
   **secret value**. A key ID cannot authenticate requests and cannot be recovered
   into a secret by this repository.
4. Set per-district retention before enabling uploads. Retention starts from record
   creation, recording completion, and transcript/run creation as appropriate.
   Policy shortening can expire old data at the next hourly cleanup.
5. Existing transcription model defaults remain configurable. Verify model access,
   request limits, availability, and announced deprecations with the provider before
   scheduling a live benchmark or production launch.

## Queue behavior and recovery

Messages contain a run ID. The domain write and `pgmq.send` share one transaction.
A worker claims a 90-second lease and renews it every 20 seconds. Provider work is
bounded to ten minutes per claimed run. Successful transcription is checkpointed
before analysis, so an analysis retry reuses the transcript.

Transient errors receive at most five claimed attempts with exponential backoff
and jitter. Permanent configuration, media, schema, refusal, or evidence failures
enter the dead-letter queue immediately. Crashes count toward the attempt budget.
The provider may be called more than once after a crash; committed outputs are
fenced and idempotent. This is not a claim of exactly-once external API execution.

An owning-school admin can replay a failed current run through the report UI.
Replay archives its dead-letter entries, records an audit event, resets the attempt
budget, and enqueues the same durable run. It preserves prior stage-attempt history.
Replacing a recording supersedes old runs. Results for an older input version
cannot replace the current report. Finalization is explicit and transactionally
writes approved scores, a revision snapshot, an audit event, and one notification.

`SIGTERM`/`SIGINT` stop the worker after its current operation. Configure the host
termination grace period for ten minutes where supported; if it kills the process
earlier, its lease eventually expires and another worker resumes. Scale with
multiple worker processes rather than an unbounded in-process concurrency setting.

## Retention and deletion

Maintenance tombstones a recording before deleting the external Storage object.
A failed delete remains pending and is retried; an object is marked purged only
on successful Storage deletion. Explicit report deletion hides the observation,
purges all versioned objects, then removes database content. An unexpired signed
upload URL can recreate an object after removal, so cleanup deliberately waits
until its two-hour capability lifetime plus one minute of clock skew has passed.
The delete endpoint returns 202 while this cleanup is pending. Failed deletions
remain hidden and maintenance resumes them.

Transcript expiration removes the current transcript, generated insight quotes,
run checkpoints/analysis, and transcript/analysis copies in old report snapshots.
Approved scores and written feedback remain until report expiration. Audit events
contain identifiers and action metadata, not classroom text.

The delete endpoint is `POST /api/observations/:id/delete` and is restricted to the
owning school's administrators. There is no student-facing deletion workflow.
Supabase backup snapshots may retain deleted data until backup expiration. Set
backup retention and access controls to the district's agreed policy; record the
backup recovery implications in the district's operational agreement. The app's
cleanup command cannot rewrite historical managed backups or provider-held logs.

## Staging acceptance and rollback

Before enabling real recording uploads:

- Run all 24 Playwright cases and nine queue/database scenarios on an isolated
  test project. Then verify real SMTP invitations, a real upload, a real provider
  run, human approval, teacher visibility, PDF export, and explicit deletion in staging.
- Run with two workers; terminate one during processing; verify lease recovery and
  absence of duplicate committed results/notifications. Exercise dead-letter replay.
- Check restricted web/worker permissions and public Data API denial using actual
  credentials. Confirm both district and school boundaries and disabled-user denial.
- Run retention with shortened staging policies and verify Storage removal plus
  every transcript copy. Simulate a failed Storage deletion and rerun maintenance.
- Configure backups and actually restore a backup into an isolated environment;
  verify tenant relationships and object references before trusting recovery.
- Configure external alerts on `/api/health`, `queue:status`, maintenance failures,
  provider error rate, and processing latency. Do not send transcript text in logs.
- Review dependency advisories (`npm audit`) and provider data-handling settings
  before a production release. No live deployment or backup restore is performed by
  committing the source/configuration files.

Roll out migrations first, then the new web and worker versions together. This
upgrade intentionally retires the old custom sessions and synchronous endpoints.
If application code must be rolled back, pause intake and workers and use a known
compatible build; do not drop queue/job tables or restore an old app that can bypass
human review. Recover database snapshots only through a staged restore procedure.
