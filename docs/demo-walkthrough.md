# Demo Walkthrough

This walkthrough is the presentation path for the local Teacher Evaluation
Studio prototype. It is intentionally repeatable: reset the database, run the
smoke test, then demo the same role-based workflow every time.

## 1. Start From A Clean Demo State

Run these commands from the project root:

```bash
npm run db:reset
npm run db:check
npm run dev -- --port 3001
```

Leave the dev server running at `http://localhost:3001`.

In a second terminal, run the smoke test:

```bash
npm run test:smoke
```

The smoke test confirms seeded data, seeded logins, role dashboard access,
observation API access, PDF export, notifications, simulated email logs, and
Realtime route guard behavior.

## 2. Demo Accounts

| Role | Email | Password | Starting Dashboard |
| --- | --- | --- | --- |
| District Admin | `district@example.com` | `password123` | `/dashboard/district` |
| School Admin | `school@example.com` | `password123` | `/dashboard/school` |
| Teacher | `teacher@example.com` | `password123` | `/dashboard/teacher` |

## 3. Signed-Out Overview

Open `http://localhost:3001`.

Show:

- Public overview for signed-out users
- One clear sign-in path
- No role dashboard options until a user authenticates

Once signed in, returning to `/` should redirect to the signed-in user's
role-specific dashboard.

## 4. District Admin Path

Sign in as `district@example.com`.

Show:

- District-level dashboard metrics
- School and teacher coverage
- Observation completion and score averages
- Notification center and simulated email log in the dashboard shell

Explain that district admins can view district-wide reports but do not create
school observations in this prototype.

## 5. School Admin Path

Sign out, then sign in as `school@example.com`.

Show:

- School-level observation queue
- Teacher status and feedback workflow
- Link to an existing observation report
- `New Observation` flow for creating a teacher observation

On a report page, show:

- Rubric scores
- Written feedback
- Recording upload controls
- Live Realtime recording card
- Transcript panel
- AI insight panel
- `Export PDF` link

If `OPENAI_API_KEY` is missing or an OpenAI call fails, explain that the app
uses deterministic fallback transcript and insight data so the local demo keeps
working.

## 6. Teacher Path

Sign out, then sign in as `teacher@example.com`.

Show:

- Personal dashboard
- Latest report and growth trend
- Feedback history
- AI recommendation summary
- Notification center showing report-ready messages

Open the finalized report and show:

- Transcript evidence
- AI highlights
- Coaching recommendations
- Downloadable PDF report

## 7. PDF Export

From a report page, select `Export PDF`.

The route is:

```text
/api/observations/:id/report.pdf
```

The PDF uses the same role-scoped report access checks as the HTML report page.

## 8. What To Say About The Smoke Test

The smoke test does not add a product feature. It makes the prototype easier to
trust and present by verifying:

- A repeatable smoke test command
- A documented demo path
- A quick way to verify seeded auth, reports, notifications, PDF export, and
  Realtime guard behavior before showing the app
