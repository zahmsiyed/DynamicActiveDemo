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
- Models for District, School, User, Observation, EvaluationScore, Feedback, Transcription, and Insight
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
