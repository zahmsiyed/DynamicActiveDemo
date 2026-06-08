# Teacher Evaluation & Classroom Observation App

The finished application should support three user roles:

- District admins: view district-wide schools, teachers, evaluations, analytics, and goals.
- School admins: conduct observations, upload recordings, score evaluations, write feedback, and review AI insights.
- Teachers: view reports, feedback, generated recommendations, transcript summaries, and growth over time.

The most important feature is the AI classroom recording workflow:

1. Record or upload classroom audio/video.
2. Convert speech to text.
3. Store timestamped transcript segments.
4. Analyze the transcript.
5. Generate instructional insights.
6. Present the results in a clean teacher-facing report.

## Planned Tech Stack

- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS, shadcn/ui, lucide-react
- Backend: Next.js Route Handlers
- Database: SQLite for local development, Prisma ORM
- Auth: Seeded role-based login with signed HTTP-only cookies
- AI: OpenAI transcription and structured insight generation, with fallback demo data
- Reports: Exportable PDF reports

## Current Status

Phase 1, Phase 2, Phase 3, and Phase 4 are implemented.

Phase 1 added:

- Next.js app foundation
- TypeScript
- Tailwind CSS
- Commented homepage
- Basic project documentation

Phase 2 added:

- Prisma ORM
- Local SQLite database
- Commented database schema
- Seed script with demo district, schools, users, observations, transcript data, and insights
- Shared database helper for later server-side app code
- Database verification script

Phase 3 added:

- Seeded login form
- Signed HTTP-only session cookie
- Login, logout, and current-user API routes
- Middleware protection for dashboard routes
- Role-based redirects
- Minimal protected dashboard placeholders

Phase 4 added:

- District admin dashboard with schools, teacher counts, completion rate, average scores, status tracking, and recent observations
- School admin dashboard with teacher coverage, upcoming evaluations, recording/transcript status, feedback queue, and observation tracker
- Teacher dashboard with personal reports, latest AI summary, recommendations, feedback history, and growth metrics
- Shared dashboard shell and reusable dashboard widgets
- Server-side dashboard query helpers

Observation creation forms, upload UI, report detail pages, and real AI API calls do not exist yet. Those come later.

## Phase 2 Files

`prisma/schema.prisma`

The database blueprint. This file defines the tables, fields, enum values, and relationships.

`prisma/seed.ts`

Creates realistic demo data so future phases have something to display.

`src/lib/db.ts`

A small helper that creates a shared Prisma Client for future API routes and server components.

`scripts/check-db.ts`

A learning/debug script that confirms the database has seeded records and connected relationships.

`.env`

Local database configuration. This file is ignored by Git.

`.env.example`

Safe example environment file showing which variables are needed.

## Phase 3 Files

`src/lib/session.ts`

Pure session/JWT utilities. This file signs and verifies session tokens and maps each role to its dashboard route.

`src/lib/auth.ts`

Server-side auth helpers. This file reads the session cookie, loads the current database user, and protects server-rendered pages.

`middleware.ts`

Runs before protected pages load. It redirects logged-out users to `/login` and keeps users inside their own role-specific dashboard path.

`src/app/api/auth/login/route.ts`

Checks email/password against seeded users, verifies the hashed password, creates the signed cookie, and returns the correct dashboard path.

`src/app/api/auth/logout/route.ts`

Deletes the session cookie.

`src/app/api/auth/me/route.ts`

Returns the current signed-in user. This is useful for testing and later client-side UI.

`src/app/login/page.tsx`

Public login page wrapper.

`src/app/login/login-form.tsx`

Client-side login form with seeded demo account buttons.

`src/app/dashboard/page.tsx`

Dashboard routing hub. Signed-in users are sent to the correct role-specific dashboard.

`src/app/dashboard/district/page.tsx`

Protected placeholder for district admins.

`src/app/dashboard/school/page.tsx`

Protected placeholder for school admins.

`src/app/dashboard/teacher/page.tsx`

Protected placeholder for teachers.

`src/components/logout-button.tsx`

Client-side logout button.

`src/components/phase-three-dashboard.tsx`

This placeholder was removed in Phase 4 after real dashboards replaced it.

## Phase 4 Files

`src/lib/dashboard-data.ts`

Server-side dashboard query helpers. This file reads Prisma data, computes metrics, and transforms database records into dashboard-friendly objects.

`src/components/dashboard-shell.tsx`

Shared dashboard page shell. It renders the header, user identity, role scope, navigation, and logout button around each dashboard.

`src/components/dashboard-widgets.tsx`

Reusable dashboard UI components including metric cards, observation tables, status tracking, school rows, teacher rows, recommendations, and feedback lists.

`src/app/dashboard/district/page.tsx`

District admin dashboard. It shows district-wide school and observation analytics.

`src/app/dashboard/school/page.tsx`

School admin dashboard. It shows operational queues and school-level observation tracking.

`src/app/dashboard/teacher/page.tsx`

Teacher dashboard. It shows the teacher's observation history, feedback, and AI insight summary.

## Database Commands

Create the SQLite database, generate Prisma Client, and seed demo data:

```bash
npm run db:reset
```

Check that the seed data exists:

```bash
npm run db:check
```

Open Prisma Studio to browse the data visually:

```bash
npm run db:studio
```

The local SQLite file is created at:

```text
prisma/dev.db
```

That database file is ignored by Git because it is generated local state.

## Authentication Flow

The Phase 3 login flow is:

```text
Login form
-> POST /api/auth/login
-> find user by email in SQLite
-> compare password with passwordHash
-> sign JWT session token
-> store token in HTTP-only cookie
-> redirect to role dashboard
```

The protected route flow is:

```text
User opens /dashboard/*
-> middleware checks session cookie
-> logged-out users go to /login
-> signed-in users stay in their own role route
-> server page loads fresh user data from Prisma
```

Role redirects:

```text
DISTRICT_ADMIN -> /dashboard/district
SCHOOL_ADMIN   -> /dashboard/school
TEACHER        -> /dashboard/teacher
```

Auth routes:

- `GET /login`: public login page
- `POST /api/auth/login`: create session
- `POST /api/auth/logout`: clear session
- `GET /api/auth/me`: inspect current session user
- `GET /dashboard`: redirect hub
- `GET /dashboard/district`: district admin dashboard
- `GET /dashboard/school`: school admin dashboard
- `GET /dashboard/teacher`: teacher dashboard

## Dashboard Data Flow

The Phase 4 dashboard flow is:

```text
Protected dashboard page
-> requireCurrentUser(...)
-> role check
-> dashboard-data query helper
-> Prisma reads SQLite
-> helper computes metrics
-> dashboard components render prepared data
```

The dashboard pages are server components. That means they can query the database directly on the server without exposing database credentials or query logic to the browser.

Dashboard responsibilities:

- District dashboard: broad district-wide reporting.
- School dashboard: operational observation management.
- Teacher dashboard: personal feedback and growth tracking.

Phase 4 does not create or edit observations. It only displays the seeded Phase 2 data through the protected Phase 3 auth system.

## Phase 2 Data Model

The main relationship chain is:

```text
District -> School -> User
District -> School -> Observation
Observation -> EvaluationScore
Observation -> Feedback
Observation -> AudioUpload
Observation -> Transcription -> TranscriptSegment
Observation -> Insight
Observation -> Notification
Observation -> EmailLog
```

Model meanings:

- `District`: top-level organization.
- `School`: belongs to one district.
- `User`: district admin, school admin, or teacher.
- `Observation`: the central classroom observation record.
- `EvaluationScore`: rubric category score for one observation.
- `Feedback`: written coaching feedback from an admin to a teacher.
- `AudioUpload`: metadata for a classroom recording.
- `Transcription`: full transcript text for an observation.
- `TranscriptSegment`: timestamped speaker turn inside a transcript.
- `Insight`: structured AI coaching output from transcript analysis.
- `Notification`: in-app notification for future UI.
- `EmailLog`: simulated email notification for future UI.

## Full Build Path

### Phase 1: Project Foundation

Set up the app skeleton only.

Build:

- Next.js + TypeScript app
- Tailwind styling
- Basic folder structure
- README with assignment goal
- Home page that explains the product briefly
- Local dev server working

Understand:

- What Next.js is doing
- Where pages live
- Where API routes live
- How the app runs locally

### Phase 2: Data Model

Design the database before building screens.

Build:

- Prisma setup
- SQLite database
- Models for District, School, User, Observation, EvaluationScore, Feedback, AudioUpload, Transcription, TranscriptSegment, Insight, Notification, and EmailLog
- Seed script with demo users and demo observations

Understand:

- What each table represents
- How users connect to schools and districts
- How observations connect teachers, admins, transcripts, and insights

### Phase 3: Authentication

Add login and role awareness.

Build:

- Login page
- Seeded demo accounts for district admin, school admin, and teacher
- Session cookie
- Logout
- Protected dashboard routes
- Role-based redirects

Understand:

- How login works
- What a session cookie is
- How role-based access control works
- Why different users see different pages

### Phase 4: Dashboards

Build the three main role experiences.

Build:

- District admin dashboard
- School admin dashboard
- Teacher dashboard
- Shared navigation
- Summary cards and tables

Understand:

- What each role needs
- How dashboard data is queried
- How UI changes based on role

### Phase 5: Observation Workflow

Build the core non-AI product flow.

Build:

- School admin creates an observation
- Teacher selection
- Subject, grade, and title fields
- Evaluation category scoring
- Written feedback
- Teacher report view

Understand:

- How forms submit data
- How observations move through statuses
- How teachers see finalized reports

### Phase 6: Transcript Storage

Add the transcript system before real AI.

Build:

- Transcript database tables
- Demo transcript viewer
- Timestamped transcript segments
- Speaker labels such as Teacher and Student
- Manual seeded transcript fallback

Understand:

- What a transcript is in the database
- Why transcript segments matter
- How speaker diarization fits later

### Phase 7: Audio Upload

Add the classroom recording workflow.

Build:

- Upload MP3, WAV, MP4, M4A, or WebM files
- Validate file type and size
- Store upload metadata
- Attach uploads to observations
- Generate fallback transcript after upload

Understand:

- How file upload works
- Why uploads need validation
- How audio connects to transcription

### Phase 8: AI Speech-To-Text

Add real transcription once upload works.

Build:

- `OPENAI_API_KEY` environment setup
- OpenAI transcription API route
- Fallback transcript when no API key exists
- Generated transcript storage

Understand:

- The client uploads audio
- The server sends audio to OpenAI
- OpenAI returns text
- The app stores and displays the transcript

### Phase 9: AI Insights

Turn transcripts into classroom coaching feedback.

Build:

- Zod insight schema
- AI analysis API route
- Generated lesson summary
- Teacher/student talk ratio
- Question count
- Pacing notes
- Sentiment analysis
- Recommendations
- Transcript highlights

Understand:

- Why structured output matters
- How prompts shape analysis
- How AI output becomes app data

### Phase 10: Insights UI

Make the main feature feel polished.

Build:

- Insight summary cards
- Charts
- Recommendation list
- Highlighted transcript sections
- Simple recommendation illustrations
- Participation heatmap

Understand:

- How raw AI output becomes usable feedback
- Which insights matter most to teachers
- How product design supports coaching

### Phase 11: Realtime Transcription

Add the advanced live transcription layer.

Build:

- Browser microphone recorder
- OpenAI Realtime session route
- Live transcript display
- Final recording upload after session ends

Understand:

- Difference between realtime transcription and file transcription
- Why realtime is more complex
- How WebRTC fits into the app

### Phase 12: Reports And Notifications

Finish the assignment features.

Build:

- Exportable PDF report
- In-app notifications
- Simulated email logs
- Historical teacher growth chart

Understand:

- How reports summarize observations
- How notifications fit the workflow
- What would change in production

### Phase 13: Testing And Demo Prep

Make the project presentable.

Check:

- Login as each role
- Create an observation
- Upload a recording
- Generate a transcript
- Generate insights
- View teacher report
- Export PDF
- README setup instructions
- Demo video walkthrough outline

## Demo Accounts

These accounts will be created during the seed-data phase:

| Role | Email | Password |
| --- | --- | --- |
| District Admin | `district@example.com` | `password123` |
| School Admin | `school@example.com` | `password123` |
| Teacher | `teacher@example.com` | `password123` |

## AI Fallback Strategy

The app should work even without an OpenAI API key.

- If `OPENAI_API_KEY` exists, the app uses real transcription and AI analysis.
- If `OPENAI_API_KEY` is missing, the app uses seeded transcript and insight data.

This makes local demos reliable while still allowing a real AI workflow when credentials are available.
