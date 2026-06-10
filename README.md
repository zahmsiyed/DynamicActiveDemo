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

Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, Phase 10, and Phase 11 are implemented.

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

Phase 5 added:

- School admin observation creation form
- Role-scoped observation list API
- Role-scoped single-observation read API
- School-admin observation update API for Phase 5 fields
- Rubric score validation and storage
- Written feedback storage
- Teacher-facing observation report page
- Dashboard links into report pages

Phase 6 added:

- Timestamped transcript viewer on observation reports
- Speaker labels for teacher, student, group, and unknown speaker turns
- Transcript duration, segment count, speaker count, and provider metadata
- Role-scoped transcript read API
- School-admin demo fallback transcript creation API
- Demo fallback transcript button for reports without a transcript
- Database verification output for transcription records

Phase 7 added:

- School-admin classroom recording upload form on observation reports
- Local file validation for MP3, WAV, MP4, M4A, and WebM
- 25 MB prototype upload limit
- Local ignored `.uploads/` storage for recording files
- `AudioUpload` metadata create/update behavior
- Automatic fallback transcript creation after upload
- Database verification output for audio upload records

Phase 8 added:

- `OPENAI_API_KEY` support through ignored `.env.local`
- OpenAI finalized file transcription for uploaded recordings
- `gpt-4o-transcribe-diarize` diarized transcript requests
- Parsing diarized speaker segments into `TranscriptSegment` rows
- Automatic OpenAI-or-fallback transcript generation after upload
- Manual school-admin transcript regeneration from the report page
- A dedicated `POST /api/observations/:id/transcribe` route

Phase 9 added:

- Zod-backed classroom insight schema
- OpenAI Structured Outputs insight generation
- `POST /api/observations/:id/analyze` route
- Deterministic fallback insight generation when OpenAI is unavailable
- Insight storage in the existing `Insight` Prisma model
- Report-page AI analysis button
- Structured insight panel with summary, metrics, pacing note, sentiment, heatmap, recommendations, and highlights

Phase 10 added:

- A reusable insight view parser for safe JSON-to-UI conversion
- Polished insight summary cards
- Talk-balance and instructional score charts
- Priority-styled coaching recommendations
- Simple CSS-based recommendation illustrations
- Participation heatmap display
- Transcript evidence cards
- Highlighted transcript rows that match AI evidence timestamps

Phase 11 added:

- Browser microphone recorder on school-admin observation reports
- OpenAI Realtime session route at `POST /api/realtime/session`
- WebRTC offer/answer exchange through the app server
- Live transcript preview from Realtime transcription delta/completion events
- Final local recording upload after the live session ends
- Fallback behavior when live Realtime setup cannot run

PDF export and notifications do not exist yet. Those come later.

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

## Phase 5 Files

`src/lib/evaluation.ts`

Shared rubric labels, category descriptions, category ordering, and average-score calculation.

`src/lib/observation-input.ts`

Shared API validation helpers. This file turns unknown JSON request data into safe observation fields and rubric score rows.

`src/lib/observations.ts`

Shared observation query and authorization helpers. This keeps report access rules in one place.

`src/app/api/observations/route.ts`

Observation collection API. `GET` returns observations scoped to the signed-in role, and `POST` creates a new observation for a teacher in the school admin's school.

`src/app/api/observations/[id]/route.ts`

Single-observation API. `GET` returns one allowed report, and `PATCH` updates Phase 5 editable fields for school admins.

`src/app/observations/new/page.tsx`

Protected school-admin page for creating a teacher observation.

`src/app/observations/new/observation-form.tsx`

Client-side form for teacher selection, observation details, scoring, summary, and feedback.

`src/app/observations/[id]/page.tsx`

Shared report page. District admins, school admins, and teachers can open only the reports they are allowed to see.

`src/components/dashboard-widgets.tsx`

The observation table now links each row to its report page.

## Phase 6 Files

`src/lib/transcripts.ts`

Shared transcript helpers. This file formats timestamps, labels speaker types, reads role-scoped transcripts, and creates demo fallback transcript rows.

`src/app/api/observations/[id]/transcript/route.ts`

Transcript API. `GET` reads one allowed observation transcript, and `POST` creates a demo fallback transcript for school admins.

`src/components/transcript-viewer.tsx`

Server-rendered transcript viewer for report pages. It shows transcript metrics and timestamped speaker turns.

`src/components/transcript-fallback-button.tsx`

Client-side button that asks the transcript API to create fallback transcript data, then refreshes the report.

`src/app/observations/[id]/page.tsx`

The report page now renders the transcript viewer below the workflow readiness section.

`scripts/check-db.ts`

The database check now reports both transcription records and transcript segment records.

## Phase 7 Files

`src/lib/audio-uploads.ts`

Shared audio upload helpers. This file validates recording type and size, formats file sizes, stores recordings in `.uploads/`, and removes replaced local files.

`src/app/api/observations/[id]/audio/route.ts`

Audio upload API. `POST` accepts one school-admin recording upload, validates scope and file type, stores metadata in `AudioUpload`, and now starts Phase 8 transcript generation.

`src/components/audio-upload-form.tsx`

Client-side recording upload form used on the report page.

`src/app/observations/[id]/page.tsx`

The report page now shows recording metadata and the upload form for school admins.

`.gitignore`

Ignores the local `.uploads/` directory so classroom recording files are not committed.

`scripts/check-db.ts`

The database check now reports audio upload records and sample upload metadata.

## Phase 8 Files

`src/lib/transcripts.ts`

Shared transcript helpers. This file now formats transcript data, reads role-scoped transcript data, builds fallback transcript rows, calls OpenAI finalized transcription, parses diarized segments, replaces stored transcript rows, and updates observation status.

`src/app/api/observations/[id]/transcribe/route.ts`

Final transcription API. `POST` lets a school admin generate or regenerate the finalized transcript for an observation that already has an uploaded recording.

`src/app/api/observations/[id]/audio/route.ts`

The upload API now chains into Phase 8 after saving the file, so a successful upload also attempts transcript generation.

`src/components/transcribe-button.tsx`

Client-side report button for manual final transcript generation. It shows loading, error, OpenAI success, and fallback messages.

`src/app/observations/[id]/page.tsx`

The report page now shows the Phase 8 transcription control when a recording has been uploaded.

`.env.local`

Ignored local environment file. This is where `OPENAI_API_KEY` is stored for real OpenAI transcription during local development.

## Phase 9 Files

`src/lib/insights.ts`

Shared AI insight helper. This file defines the Zod schema, creates the OpenAI JSON Schema, builds the prompt, calls the Responses API with Structured Outputs, validates the parsed result, creates fallback insights, stores the `Insight` row, and updates observation status.

`src/app/api/observations/[id]/analyze/route.ts`

AI analysis API. `POST` lets a school admin generate or regenerate structured insights for an observation that already has a transcript.

`src/components/analyze-insight-button.tsx`

Client-side report button for insight generation. It shows loading, error, OpenAI success, and fallback messages.

`src/components/insight-panel.tsx`

Server-rendered structured insight panel. It safely reads JSON fields and displays summary, metrics, pacing notes, sentiment, heatmap, recommendations, and transcript highlights.

`src/app/observations/[id]/page.tsx`

The report page now shows a Phase 9 AI analysis workflow section and renders the structured insight panel.

`package.json`

Adds `zod` so server code can validate the generated insight object before it is stored.

## Phase 10 Files

`src/lib/insight-view.ts`

Shared view-model helper. This file turns raw Prisma JSON fields from `Insight` into typed display data for the report UI.

`src/components/insight-panel.tsx`

The structured insight panel now renders summary cards, simple charts, recommendation illustrations, priority labels, sentiment, heatmap rows, and evidence cards.

`src/components/transcript-viewer.tsx`

The transcript viewer now accepts insight highlight timestamps and marks matching transcript rows as `Insight highlight`.

`src/app/observations/[id]/page.tsx`

The report page now creates one parsed insight view and shares it with both the insight panel and transcript viewer.

`src/app/page.tsx`

The public overview reflects the polished insight report layer, while authenticated users are redirected to their role dashboard.

## Phase 11 Files

`src/app/api/realtime/session/route.ts`

Server-side OpenAI Realtime session route. The browser sends an SDP offer to this route, and the route checks authentication, validates school-admin observation scope, and forwards the offer to OpenAI with a transcription-only session configuration.

`src/components/realtime-recorder.tsx`

Client-side live recorder. It asks for microphone access, starts a `MediaRecorder`, creates a WebRTC peer connection, listens for transcript deltas on the OpenAI data channel, and uploads the final recording through the existing Phase 7 audio route when stopped.

`src/app/observations/[id]/page.tsx`

The report page now shows the live classroom recording workflow for school admins before the manual recording upload card.

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

Uploaded classroom recordings are saved locally at:

```text
.uploads/observations/<observation-id>/
```

That upload directory is ignored by Git because recordings are generated local files.

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
- `GET /observations/new`: create observation page for school admins
- `GET /observations/:id`: role-scoped observation report page
- `GET /api/observations`: role-scoped observation list API
- `POST /api/observations`: create observation API
- `GET /api/observations/:id`: role-scoped observation read API
- `PATCH /api/observations/:id`: school-admin update API
- `POST /api/observations/:id/audio`: school-admin recording upload API
- `POST /api/observations/:id/transcribe`: school-admin finalized transcription API
- `POST /api/observations/:id/analyze`: school-admin structured insight API
- `GET /api/observations/:id/transcript`: role-scoped transcript read API
- `POST /api/observations/:id/transcript`: school-admin fallback transcript API

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

## Observation Workflow

The Phase 5 observation flow is:

```text
School admin dashboard
-> Create observation
-> choose teacher in the same school
-> enter title, subject, grade, and date
-> score every rubric category from 1 to 5
-> optionally write summary and feedback
-> POST /api/observations
-> Prisma creates Observation, EvaluationScore rows, and Feedback
-> redirect to /observations/:id
-> report page checks role scope before rendering
```

Phase 5 authorization rules:

- District admins can read observations in their district.
- School admins can create and update observations only for their school.
- Teachers can read observations attached to their own user account.

Phase 5 intentionally does not handle audio, transcription, AI analysis, PDF export, or notifications. Those are separate phases so each workflow is understandable before adding the next layer.

## Transcript Storage Flow

The Phase 6 transcript flow is:

```text
Observation report
-> report loads observation.transcription with ordered TranscriptSegment rows
-> transcript viewer renders speaker, time range, confidence, and text
-> if no transcript exists, school admins can create a demo fallback transcript
-> POST /api/observations/:id/transcript
-> Prisma creates Transcription and TranscriptSegment rows
-> observation status moves to TRANSCRIBED unless it was already FINALIZED or ANALYZED
-> report refreshes and shows the new transcript
```

Transcript storage responsibilities:

- `Transcription` stores the full transcript text and provider/model metadata.
- `TranscriptSegment` stores each speaker turn with start time, end time, speaker label, speaker type, confidence, and text.
- Speaker diarization means separating speech by speaker. In Phase 6 this is simulated with seeded labels; later OpenAI transcription can produce similar segment records from uploaded classroom audio.

Phase 6 still does not upload files or call OpenAI. It proves the transcript data shape and UI before adding real audio processing.

## Audio Upload Flow

The Phase 7 upload flow is:

```text
Observation report
-> school admin chooses a recording file
-> POST /api/observations/:id/audio
-> route checks the signed-in user and school scope
-> route validates file type and size
-> file is stored under .uploads/observations/:id/
-> AudioUpload metadata is created or replaced
-> Phase 8 tries to generate the final transcript from the upload
-> report refreshes with recording metadata and transcript segments
```

Accepted file types:

- MP3: `audio/mpeg`, `audio/mp3`
- WAV: `audio/wav`, `audio/x-wav`
- MP4/M4A: `video/mp4`, `audio/mp4`, `audio/m4a`
- WebM: `audio/webm`, `video/webm`

Phase 7 stores files locally for the prototype. In production, this would move to object storage such as S3, Vercel Blob, or another durable file store.

## Final Transcription Flow

The Phase 8 finalized transcription flow is:

```text
Observation report
-> school admin uploads a recording or clicks Generate final transcript
-> POST /api/observations/:id/transcribe
-> route checks the signed-in user and school scope
-> route confirms the observation has AudioUpload metadata
-> if OPENAI_API_KEY exists and the local file is available, server sends multipart form-data to OpenAI
-> OpenAI returns diarized JSON with speaker segments
-> app replaces the current Transcription and TranscriptSegment rows
-> observation status moves to TRANSCRIBED unless it was already FINALIZED or ANALYZED
-> if OpenAI cannot run, app stores the deterministic fallback transcript
-> report refreshes with the stored transcript
```

OpenAI request shape:

```text
POST https://api.openai.com/v1/audio/transcriptions
model = gpt-4o-transcribe-diarize
response_format = diarized_json
chunking_strategy = auto
file = uploaded classroom recording
```

The implementation follows the official OpenAI Speech to text and transcription API docs:

- [Speech to text guide](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Create transcription API reference](https://developers.openai.com/api/docs/api-reference/audio/createTranscription)
- [GPT-4o Transcribe Diarize model page](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize)

Phase 8 fallback cases:

- `missing_api_key`: `.env.local` does not provide `OPENAI_API_KEY`.
- `stored_upload_unavailable`: the database has upload metadata, but the local file is not available under `.uploads/`.
- `invalid_audio_file`: the stored file does not match a supported MP3, WAV, MP4, M4A, or WebM container.
- `openai_error`: OpenAI rejected the file or returned no usable diarized segments.

Fallback does not mean the route failed. It means the prototype saved demo transcript rows so the report workflow remains usable.

## AI Insight Generation Flow

The Phase 9 insight flow is:

```text
Observation report
-> school admin clicks Generate AI insight
-> POST /api/observations/:id/analyze
-> route checks the signed-in user and school scope
-> route confirms the observation has a stored transcript
-> server builds transcript, rubric, and observation context
-> if OPENAI_API_KEY exists, server asks OpenAI for a structured JSON insight
-> Zod validates the parsed insight object
-> app upserts the Insight row
-> observation status moves to ANALYZED unless it was already FINALIZED
-> if OpenAI cannot run, app stores a deterministic fallback insight
-> report refreshes with summary, metrics, recommendations, sentiment, heatmap, and highlights
```

OpenAI request shape:

```text
POST https://api.openai.com/v1/responses
model = OPENAI_INSIGHT_MODEL or gpt-4o-mini
text.format.type = json_schema
text.format.strict = true
schema = JSON Schema generated from the Zod classroom insight schema
```

The implementation follows the official OpenAI Structured Outputs and Responses API docs:

- [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Create response API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)

Phase 9 fallback cases:

- `missing_api_key`: `.env.local` does not provide `OPENAI_API_KEY`.
- `openai_error`: OpenAI rejected the request, refused the request, or returned unusable structured text.

The fallback insight uses transcript speaker timing and keyword counts to create the same data shape as the OpenAI path. That makes local demos reliable while preserving the contract the UI expects.

## Insight Presentation Flow

The Phase 10 insight UI flow is:

```text
Observation report
-> report loads the stored Insight row
-> readInsightView converts JSON fields into display-safe values
-> InsightPanel renders summary cards, charts, recommendation cards, sentiment, heatmap, and evidence
-> TranscriptViewer receives highlight timestamps
-> transcript rows that match AI evidence are labeled Insight highlight
```

Phase 10 does not create new AI data. It makes the Phase 9 data easier to scan, compare, and explain during a coaching conversation.

## Realtime Transcription Flow

The Phase 11 live transcription flow is:

```text
School admin opens an observation report
-> RealtimeRecorder requests microphone access
-> browser starts MediaRecorder for the final classroom recording
-> browser creates an RTCPeerConnection and SDP offer
-> POST /api/realtime/session receives the SDP offer
-> route validates auth and observation scope
-> route sends the offer plus transcription session config to OpenAI
-> browser receives OpenAI SDP answer and sets the remote description
-> transcript delta/completion events arrive on the data channel
-> user stops recording
-> final browser recording uploads to POST /api/observations/:id/audio
-> Phase 8 file transcription creates the durable saved transcript
```

Realtime transcription is intentionally a preview layer. The durable report transcript still comes from the finalized file transcription route because that path supports diarization and stores normalized `TranscriptSegment` rows.

The implementation follows the official OpenAI Realtime docs:

- [Realtime transcription guide](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [Realtime WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)

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
- Role-scoped observation read/update APIs

Understand:

- How forms submit data
- How observations move through statuses
- How scores and feedback attach to a report
- How teachers see assigned reports

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
- OpenAI finalized transcription API route
- OpenAI diarized JSON parsing
- Fallback transcript when no API key exists or OpenAI cannot process the recording
- Generated transcript storage
- Manual report-page transcript generation button

Understand:

- The client uploads audio, but the server sends the stored file to OpenAI
- OpenAI returns diarized speaker segments
- The app stores and displays the transcript
- Why the fallback path keeps local demos reliable

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

- If `OPENAI_API_KEY` exists and the uploaded file is usable, Phase 8 uses real OpenAI transcription.
- If `OPENAI_API_KEY` is missing, the local file is unavailable, or OpenAI cannot process the file, Phase 8 stores fallback transcript data.
- If `OPENAI_API_KEY` exists and the transcript can be analyzed, Phase 9 uses OpenAI Structured Outputs for insight generation.
- If `OPENAI_API_KEY` is missing or OpenAI cannot return usable structured output, Phase 9 stores fallback insight data.

This makes local demos reliable while still allowing a real AI workflow when credentials are available.
