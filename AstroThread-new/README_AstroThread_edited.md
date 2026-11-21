# AstroThread · Research Explorer

**A scientific research discovery platform for astronomy and physics. Holberton School, Stage 4 (MVP Development).**

**Live site:** https://astrothread-app.vercel.app

| Field | Details |
|---|---|
| Project | AstroThread – Research Explorer |
| Repository | [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread) |
| Branch | `AstroThread-new` |
| Final application folder | `AstroThread-new` |
| Project stage | Holberton School – Stage 4 |
| Frontend | React, TypeScript, Vite |
| Backend | Python, Flask |
| Database | PostgreSQL (Neon) |
| Hosting | Vercel |
| AI | Groq, model `openai/gpt-oss-120b` |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Main Features](#2-main-features)
3. [Technology Stack](#3-technology-stack)
4. [Project Architecture](#4-project-architecture)
5. [Installation and Setup](#5-installation-and-setup)
6. [Sprint Planning](#6-sprint-planning)
7. [Sprint Reviews](#7-sprint-reviews)
8. [Retrospectives](#8-retrospectives)
9. [Source Repository](#9-source-repository)
10. [Bug Tracking](#10-bug-tracking)
11. [Testing Evidence and Results](#11-testing-evidence-and-results)
12. [End-to-End Testing](#12-end-to-end-testing)
13. [Production Environment](#13-production-environment)
14. [Database](#14-database)
15. [API Documentation](#15-api-documentation)
16. [Team Contributions](#16-team-contributions)
17. [Known Limitations and Future Improvements](#17-known-limitations-and-future-improvements)
18. [UI/UX Design and Prototype](#18-uiux-design-and-prototype)
19. [Stage 4 Deliverables Checklist](#19-stage-4-deliverables-checklist)

---

## 1. Project Overview

AstroThread is a scientific research discovery platform focused on astronomy and physics.

The platform helps users explore scientific topics, discover real research papers, ask an AI assistant about a paper, and follow learning paths from beginner to advanced.

Instead of searching through disconnected research papers, users explore a topic and find related papers, images, and explanations in one place.

### Project Goal

To make scientific research easier to discover and understand by providing a structured search and exploration experience.

### Target Users

- Students interested in astronomy and physics.
- Researchers looking for relevant scientific papers.
- Users who want to explore scientific topics.
- Anyone interested in discovering scientific knowledge.

### Main Concept

1. Search for a scientific topic.
2. Explore related research papers.
3. Open paper details and ask the research assistant.
4. Discover related papers and images.
5. Save topics and continue learning through My Thread.

---

## 2. Main Features

### 2.1 Scientific Topic Search

- Search for astronomy and physics topics.
- Real results from the OpenAlex catalogue, filtered to the Physics and Astronomy field.
- Results are cached in the database for 7 days.
- Popular topics based on what users search most.
- Filters, sorting, pagination, timeline and data views.

### 2.2 Research Papers

- Paper details: authors, year, journal, abstract, keywords and topic.
- AI-written method, key findings and "why it matters", generated once and stored.
- Related papers.
- Copy citation.

### 2.3 Research Assistant

- Ask questions about a paper (signed-in users).
- Answers come from Groq (`openai/gpt-oss-120b`) and use only the paper's title and abstract.
- The prompt tells the model to say when the abstract doesn't cover the question.

### 2.4 Images

- Astronomy images for the searched topic from the NASA Image Library.

### 2.5 My Thread

- Save topics to a personal thread.
- Learning paths from beginner to advanced, built from real papers.
- Track read papers, journey history and personal notes.
- Overview, journey and knowledge map views.

### 2.6 User Authentication

- Passwordless sign-up and sign-in with 6-digit email codes (OTP).
- Codes expire after 10 minutes, with a 30-second wait between codes.
- Secure session cookie (HttpOnly, SameSite=Lax, Secure in production) that lasts 30 days.

### 2.7 User Profile

- View account information.
- Change display name.
- Delete account.

### 2.8 Admin Features

- Admin accounts (created with an invitation code).
- View all verified accounts.
- Suspend and reactivate user accounts.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| React | Building the user interface |
| TypeScript | Type-safe frontend development |
| Vite | Frontend development server and build tool |
| CSS | Styling and layout |
| oxlint | Frontend linting |
| Python | Backend development |
| Flask | Backend API framework |
| psycopg 3 | PostgreSQL driver (parameterised queries) |
| PostgreSQL (Neon) | Relational database |
| SQL | Database queries and migrations |
| unittest | Backend automated tests |
| Git / GitHub | Version control and collaboration |
| Vercel | Hosting for frontend and backend |
| OpenAlex API | Scientific research paper data |
| NASA Image Library API | Astronomy images |
| Groq API | AI explanations and research assistant |
| Gmail SMTP / Resend | Sending sign-in codes |
| Figma | UI/UX design and prototyping |

---

## 4. Project Architecture

```
Browser
  │
  ▼
Frontend (React + Vite) ── Vercel project: astrothread
  │   /api/* is forwarded by vercel.json
  ▼
Backend (Flask) ── Vercel project: astrothread-api
  ├── Neon PostgreSQL   (users, papers, threads, My Thread)
  ├── OpenAlex API      (research papers)
  ├── NASA Image API    (images)
  ├── Groq API          (AI answers)
  └── Email (SMTP)      (sign-in codes)
```

The browser only talks to the frontend's address. All `/api/...` requests are forwarded to the backend, so cookies work without CORS. Only the backend holds API keys.

### 4.1 Frontend

- Displays pages and handles user interactions.
- Manages search input, results, filters and tabs.
- Calls the backend API.
- Shows papers, images, the research assistant and My Thread.
- Handles sign-up, sign-in, profile and admin screens.

### 4.2 Backend

- Handles API requests (Flask blueprints: home, papers, images, topics, auth, my_thread, admin).
- Searches OpenAlex and caches results.
- Calls NASA and Groq.
- Manages accounts, sessions and email codes.
- Reads and writes the database.

### 4.3 Database

PostgreSQL stores users, email verification codes, research topics, papers, saved topics and journey steps. See [Database](#14-database).

### 4.4 Application Structure

```
holberton-AstroThread/
├── README.md
├── Project_Charter.md
├── Documentation.md
├── AstroThread-Technical-Documentation.md
├── PROTOTYPE_Figma.md
└── AstroThread-new/
    ├── README_AstroThread_edited.md
    ├── frontend/            React + TypeScript + Vite
    │   ├── src/
    │   ├── vercel.json      /api forwarding + SPA routing
    │   └── package.json
    ├── backend/             Flask API
    │   ├── app/
    │   │   ├── routes/      API endpoints
    │   │   └── services/    OpenAlex, NASA, AI, email, database logic
    │   ├── migrations/      SQL files (001–006)
    │   ├── tests/           unittest files
    │   ├── manage.py        python manage.py migrate
    │   ├── wsgi.py          Vercel entry point
    │   └── requirements.txt
    └── testing-evidence/
        └── e2e/             End-to-end test screenshots
```

---

## 5. Installation and Setup

### 5.1 Requirements

- Python 3.12+
- Node.js 20+
- A PostgreSQL database (local or Neon)

### 5.2 Backend

```bash
cd AstroThread-new/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values
python manage.py migrate    # creates the tables
python app.py               # runs on http://localhost:5000
```

Main settings in `backend/.env` (never commit this file):

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Signs session cookies |
| `SESSION_COOKIE_SECURE` | `true` on HTTPS, `false` locally |
| `EMAIL_MODE` | `console` locally prints codes in the terminal |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT` | Email sending (Gmail) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional: send with Resend instead |
| `OPENALEX_API_KEY` | OpenAlex access |
| `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` | Groq AI settings |
| `ADMIN_INVITATION_CODE` | Required to create admin accounts |

### 5.3 Frontend

```bash
cd AstroThread-new/frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

`frontend/.env.development` must contain `VITE_SEARCH_SOURCE=api` to use the real backend. Vite forwards `/api` to `http://localhost:5000`.

### 5.4 Run the Checks

```bash
cd AstroThread-new/backend
python -m unittest discover tests

cd ../frontend
npm run lint
npm run build
```

---

## 6. Sprint Planning

The team used GitHub Projects and GitHub Issues to organize work and track progress.

### 6.1 Planning Approach

Sprint planning was used to:

- Identify the features required for the MVP.
- Break large features into smaller tasks.
- Assign tasks to team members.
- Prioritize development work.
- Track task progress.
- Review incomplete tasks.

### 6.2 Task Management

| Tool | Purpose |
|---|---|
| GitHub Projects | Sprint planning and task organization |
| GitHub Issues | Task descriptions and tracking |
| Pull Requests | Code review and integration |
| Git branches | Separate development work |

### 6.3 Sprint Schedule

| Sprint | Dates | Main Focus |
|---|---|---|
| Sprint 1 | October 15–28, 2026 | Project setup, design system, search and paper pages |
| Sprint 2 | October 29–November 11, 2026 | Backend integration, AI, authentication, My Thread |
| Sprint 3 | November 12–25, 2026 | Deployment, admin, learning paths, testing, bug fixing |

### 6.4 Planning Resources

- [GitHub Projects](TODO-add-project-board-link)
- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)

---

## 7. Sprint Reviews

<!-- TODO: fill each sprint with what was actually demoed and completed -->

| Sprint | Planned | Completed | Not Completed | Demo / Notes |
|---|---|---|---|---|
| Sprint 1 | TODO | TODO | TODO | TODO |
| Sprint 2 | TODO | TODO | TODO | TODO |
| Sprint 3 | TODO | TODO | TODO | TODO |

---

## 8. Retrospectives

Retrospectives help the team reflect on its process and improve the next sprint.

<!-- TODO: fill with the team's own answers -->

| Sprint | What went well | What didn't go well | What we'll improve |
|---|---|---|---|
| Sprint 1 | TODO | TODO | TODO |
| Sprint 2 | TODO | TODO | TODO |
| Sprint 3 | TODO | TODO | TODO |

---

## 9. Source Repository

### 9.1 Repository

[AstroThread GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)

### 9.2 Branching Strategy

The final application lives on the `AstroThread-new` branch.

1. Create a feature branch.
2. Implement the assigned feature.
3. Push the branch to GitHub.
4. Open a Pull Request.
5. Review the changes.
6. Merge tested work into the integration branch.
7. Merge the verified final version into the submission branch.

---

## 10. Bug Tracking

GitHub Issues were used to report and track tasks and problems.

### 10.1 Bug Tracking Process

1. Identify a problem during development or testing.
2. Reproduce the problem.
3. Record the expected result.
4. Record the actual result.
5. Create a GitHub Issue if a confirmed bug is found.
6. Add the `bug` label.
7. Assign the issue to a responsible team member.
8. Fix the problem.
9. Retest the affected functionality.
10. Close the issue after verification.

### 10.2 Bug Report Information

| Field | Description |
|---|---|
| Bug Title | Short description of the problem |
| Description | Explanation of the issue |
| Steps to Reproduce | Steps needed to reproduce it |
| Expected Result | What should happen |
| Actual Result | What happened |
| Environment | Browser, operating system, or environment |
| Severity | Impact of the problem |
| Status | Open, In Progress, or Closed |

### 10.3 Notable Bugs Fixed

| Problem | Cause | Fix |
|---|---|---|
| Backend crashed on Vercel (`No module named 'dotenv'`) | Vercel read dependencies from `pyproject.toml`, which had none | Added the dependency list to `pyproject.toml` |
| Frontend build failed with "No Flask entrypoint found" | Frontend folder linked to the backend Vercel project | Created a separate `astrothread` project; set `framework: vite` |
| `508 INFINITE_LOOP_DETECTED` | Frontend deployed into the backend project, so `/api` forwarded to itself | Redeployed the backend from its own folder |
| "Unable to check your code" after sign-up | New migration (account status) not run on the production database | Ran `python manage.py migrate` against Neon |
| AI answers unavailable | Groq retired `llama-3.3-70b-versatile` (HTTP 404) | Switched to `openai/gpt-oss-120b` |
| Learning-path papers showed "We couldn't find this paper" | Paths used sample ids unknown to the backend | Added `/api/papers/lookup` to find the real paper on OpenAlex |
| My Thread build failed ("Cannot find name …") | Some lines of a commit were not pushed | Restored the missing imports and state |
| Sign-up codes not delivered with Resend | Resend free tier only sends to the account owner without a verified domain | Kept Gmail SMTP in production; Resend stays supported |

### 10.4 Resources

- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)

**Note:** Only confirmed bugs are reported as bugs. A failed test is investigated before it is classified as an application defect.

---

## 11. Testing Evidence and Results

### 11.1 Testing Types

| Testing Type | Purpose |
|---|---|
| Unit Testing | Tests individual functions and routes |
| Integration Testing | Tests communication between components |
| Manual Testing | Checks behaviour through the user interface |
| API Testing | Checks backend endpoints and responses |
| End-to-End Testing | Tests complete user journeys on the live site |

### 11.2 Backend Unit Tests

- 10 test files, 132 tests.
- External services (OpenAlex, NASA, Groq, email) and the database are mocked, so tests are fast and don't need the internet.
- Run with: `python -m unittest discover tests`

| Run | Environment | Result |
|---|---|---|
| November 21, 2026 | GitHub Codespace, Python 3.14, real project dependencies | **132 tests, OK** |

### 11.3 Frontend Checks

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | **Passed** (no TypeScript errors) |
| Lint | `npm run lint` (oxlint) | **Passed**: 0 errors, 8 warnings (React performance suggestions, no functional issues) |

### 11.4 Frontend Manual Test Plan

| Test Category | Number of Cases |
|---|---:|
| Sample Data / Frontend | 52 |
| API | 20 |
| **Total** | **72** |

### 11.5 Test Results Summary

| Test Area | Status |
|---|---|
| Backend unit tests | ✅ Passed (132/132) |
| Frontend build | ✅ Passed |
| Frontend lint | ✅ 0 errors (8 warnings) |
| E2E tests | ✅ 4/4 passed (see [section 12](#12-end-to-end-testing)) |

### 11.6 Testing Evidence

```
AstroThread-new/
└── testing-evidence/
    └── e2e/
        ├── E2E-01-search.png
        ├── E2E-02-paper-details.png
        ├── E2E-03-login.png
        └── E2E-04-my-thread.png
```

---

## 12. End-to-End Testing

Tested manually on the live site (https://astrothread-app.vercel.app), following each flow the way a user would.

### 12.1 E2E Scenarios

| Test ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| E2E-01 | Search | Search "black holes" | Real papers from OpenAlex appear |
| E2E-02 | Paper details + AI | Open a paper, ask "Summarize this paper" | Paper details and an AI answer appear |
| E2E-03 | Login | Enter email, enter the 6-digit code, refresh | User is signed in and stays signed in |
| E2E-04 | My Thread | Save a topic, open My Thread, tick a paper | Topic, learning path and read papers appear |

### 12.2 E2E Results

| Test ID | Result |
|---|---|
| E2E-01 | ✅ Pass |
| E2E-02 | ✅ Pass |
| E2E-03 | ✅ Pass |
| E2E-04 | ✅ Pass |

### 12.3 Evidence

**E2E-01 Search**
![E2E-01 Search](testing-evidence/e2e/E2E-01-search.png)

**E2E-02 Paper details and AI answer**
![E2E-02 Paper details](testing-evidence/e2e/E2E-02-paper-details.png)

**E2E-03 Login**
![E2E-03 Login](testing-evidence/e2e/E2E-03-login.png)

**E2E-04 My Thread**
![E2E-04 My Thread](testing-evidence/e2e/E2E-04-my-thread.png)

---

## 13. Production Environment

### 13.1 Deployment Links

| Service | URL |
|---|---|
| Live site (frontend) | https://astrothread-app.vercel.app |
| Backend health check | https://astrothread-api.vercel.app/api/health |

### 13.2 Hosting

| Part | Where it runs | Notes |
|---|---|---|
| Frontend | Vercel project `astrothread` | Static Vite build; `vercel.json` forwards `/api/*` to the backend |
| Backend | Vercel project `astrothread-api` | Flask on Vercel's Python runtime (`wsgi.py`, `pyproject.toml`) |
| Database | Neon PostgreSQL | Pooled connection string in `DATABASE_URL` |

Secrets are stored only in Vercel environment variables, never in GitHub.

### 13.3 Local vs Production

| | Local development | Production |
|---|---|---|
| Frontend | Vite on `localhost:5173` | `astrothread-app.vercel.app` |
| Backend | Flask on `localhost:5000` | `astrothread-api.vercel.app` |
| `/api` forwarding | `vite.config.ts` proxy | `vercel.json` rewrite |
| Settings | `backend/.env` or Codespace secrets | Vercel environment variables |
| Email codes | Printed in the terminal (`EMAIL_MODE=console`) | Sent by email (Gmail SMTP) |

### 13.4 Deploying

```bash
# backend (check .vercel/project.json says astrothread-api)
cd AstroThread-new/backend
python -m unittest discover tests
npx vercel --prod

# frontend (check .vercel/project.json says astrothread)
cd ../frontend
npm run build
npx vercel --prod
```

New migration files are applied to Neon first with `python manage.py migrate`.

---

## 14. Database

PostgreSQL on Neon. Tables are created by the SQL files in `backend/migrations/`, applied with `python manage.py migrate`. Every file can be run again safely (`IF NOT EXISTS`).

| Table | Purpose |
|---|---|
| `research_threads` | Searched topics, search counts, cache time, AI overview |
| `research_papers` | Papers from OpenAlex, plus AI-written details |
| `thread_papers` | Which papers belong to which topic, in rank order |
| `users` | Accounts: name, email, account type, status (active or suspended) |
| `otp_codes` | Email verification codes and their expiry |
| `saved_topics` | Topics each user saved to My Thread |
| `journey_steps` | Each user's searches and opened papers, with notes |

| Migration | Adds |
|---|---|
| `001_create_tables.sql` | Topics, papers and their link |
| `002_topic_overview.sql` | AI topic overview |
| `003_paper_details.sql` | Venue, topic, keywords, authors, AI paper details |
| `004_create_users.sql` | Users and OTP codes |
| `005_my_thread.sql` | Saved topics and journey steps |
| `006_account_status.sql` | Account status for suspension |

All queries use psycopg's `%s` placeholders to prevent SQL injection.

---

## 15. API Documentation

Base URL: `https://astrothread-api.vercel.app` (the frontend calls it as `/api/...`). All responses are JSON. 🔒 = requires sign-in.

### General

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check → `{"status": "ok"}` |
| GET | `/api/topics/popular` | Most searched topics |
| GET | `/api/search?q=<topic>` | Search papers (2–100 characters) |
| GET | `/api/topics/<slug>/overview` | AI overview of a topic |
| GET | `/api/images?q=<topic>` | NASA images for a topic |

### Papers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/papers/<id>` | Paper details (AI details generated on first visit) |
| GET | `/api/papers/<id>/related` | Related papers |
| GET | `/api/papers/lookup?title=<title>&year=<year>` | Find a paper by title; fetched from OpenAlex if new |
| POST | `/api/papers/<id>/ask` 🔒 | Ask the AI about a paper. Body: `{"question": "..."}` |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Start sign-up and email a code |
| POST | `/api/auth/verify` | Check the code and sign in |
| POST | `/api/auth/login` | Email a sign-in code to an existing account |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/me` 🔒 | Change display name |
| DELETE | `/api/auth/me` 🔒 | Delete account |
| POST | `/api/auth/logout` | Sign out |

### My Thread 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/my-thread` | Saved topics and journey |
| POST | `/api/my-thread/topics` | Save a topic |
| DELETE | `/api/my-thread/topics/<topic>` | Remove a topic |
| POST | `/api/my-thread/steps` | Add a journey step |
| PATCH | `/api/my-thread/steps/<step_key>` | Edit a step's note |
| DELETE | `/api/my-thread/steps/<step_key>` | Remove a step |
| GET | `/api/my-thread/paths/<topic>` | Learning path for a topic |

### Admin 🔒 (admin accounts only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List verified accounts |
| PATCH | `/api/admin/users/<id>/status` | Suspend or reactivate an account |

### Error Format

```json
{"error": "Short message for the user"}
```

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Not signed in |
| 403 | Not allowed (e.g. not an admin, or account suspended) |
| 404 | Not found |
| 500 | Database error |
| 502 / 503 / 504 | External service failed, not configured, or too slow |

---

## 16. Team Contributions

<!-- TODO: each member checks and corrects their own row -->

| Member | Main Contributions |
|---|---|
| Alaa | Frontend design and pages, design system, search results views, My Thread interface |
| Bothaina | Email sign-in (OTP), admin dashboard and account suspension, profile, learning paths from real papers, Resend support |
| Dana | Backend features (NASA images, research assistant AI, popular topics, My Thread backend), connecting the frontend to the backend, paper lookup, deployment to Vercel and Neon, production bug fixes |

---

## 17. Known Limitations and Future Improvements

### 17.1 Known Limitations

- Email codes are sent with Gmail SMTP. Resend is supported in the code but needs a verified domain to send to all users.
- Ticks on learning-path papers are stored in the browser, so they don't sync across devices yet.
- The AI only reads a paper's title and abstract, not the full text.
- Search depends on OpenAlex being available; cached results are used when it fails.
- Lint reports 8 warnings (React Compiler performance suggestions).
- Free-tier limits apply to Groq, Neon and Vercel.

### 17.2 Future Improvements

- Verify a custom domain and send email codes with Resend.
- Store learning-path ticks in the database.
- Resolve the remaining lint warnings.
- Expand scientific topic coverage and learning paths.
- Improve search relevance.
- Add automated frontend and E2E tests.
- Add a continuous integration pipeline.
- Add API rate limiting.

---

## 18. UI/UX Design and Prototype

[Open AstroThread Figma Prototype](https://www.figma.com/proto/5NnyTCEOvJdC5YbM9ZnxM6/AstroThread-Research-Explorer-%E2%80%94-Prototype?node-id=2-3&t=fdl21QCf0NDZQCO2-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A3)

---

## 19. Stage 4 Deliverables Checklist

| Deliverable | Status |
|---|---|
| Source repository | ✅ [GitHub](https://github.com/Bothainakb/holberton-AstroThread) |
| Deployed frontend | ✅ https://astrothread-app.vercel.app |
| Deployed backend | ✅ https://astrothread-api.vercel.app/api/health |
| Backend unit tests | ✅ 132 passing |
| Frontend build | ✅ Passing |
| Frontend lint | ✅ 0 errors (8 warnings) |
| E2E tests and screenshots | ✅ 4/4 passed |
| GitHub Projects link | TODO |
| Sprint reviews | TODO |
| Retrospectives | TODO |

---

**AstroThread – Research Explorer**

*Follow the thread of a scientific idea — from discovery to research and beyond.*
