
# AstroThread · Research Explorer

**A scientific research discovery platform for astronomy and physics. Holberton School, Stage 4 (MVP Development).**

**Live site:** https://astrothread-app.vercel.app

| Field | Details |
|---|---|
| Project | AstroThread – Research Explorer |
| Repository | [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread) |
| Final Branch | `AstroThread-new` |
| Final Application Folder | `AstroThread-new` |
| Project Stage | Holberton School – Stage 4 |
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

Instead of searching through disconnected research papers, users can explore a topic and find related papers, images, and explanations in one place.

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
3. Open paper details and ask the Research Assistant.
4. Discover related papers and images.
5. Save topics and continue learning through My Thread.

---

## 2. Main Features

### 2.1 Scientific Topic Search

- Search for astronomy and physics topics.
- Retrieve real results from the OpenAlex catalogue, filtered to the Physics and Astronomy field.
- Cache search results in the database for 7 days.
- Display popular topics based on user searches.
- Provide filters, sorting, pagination, timeline, and data views.

### 2.2 Research Papers

- Display paper details, including authors, year, journal, abstract, keywords, and topic.
- Generate AI-written methods, key findings, and "why it matters" explanations.
- Display related papers.
- Allow users to copy citations.

### 2.3 Research Assistant

- Allow signed-in users to ask questions about a research paper.
- Generate answers using Groq (`openai/gpt-oss-120b`).
- Use the paper's title and abstract as the source context.
- Indicate when the abstract does not contain enough information to answer a question.

### 2.4 Images

- Display astronomy images related to the searched topic using the NASA Image Library API.

### 2.5 My Thread

- Allow users to save topics to a personal thread.
- Provide learning paths from beginner to advanced, built from real papers.
- Track read papers, journey history, and personal notes.
- Provide overview, journey, and knowledge map views.

### 2.6 User Authentication

- Support passwordless sign-up and sign-in using 6-digit email verification codes (OTP).
- Codes expire after 10 minutes.
- Apply a 30-second wait between code requests.
- Use a secure session cookie (`HttpOnly`, `SameSite=Lax`, and `Secure` in production).
- Sessions last 30 days.

### 2.7 User Profile

- View account information.
- Change display name.
- Delete account.

### 2.8 Admin Features

- Support admin accounts created using an invitation code.
- Allow admins to view verified accounts.
- Allow admins to suspend and reactivate user accounts.

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
| psycopg 3 | PostgreSQL driver |
| PostgreSQL (Neon) | Relational database |
| SQL | Database queries and migrations |
| unittest | Backend automated tests |
| Git / GitHub | Version control and collaboration |
| Vercel | Hosting for frontend and backend |
| OpenAlex API | Scientific research paper data |
| NASA Image Library API | Astronomy images |
| Groq API | AI explanations and Research Assistant |
| Gmail SMTP / Resend | Sending sign-in codes |
| Figma | UI/UX design and prototyping |

---

## 4. Project Architecture

```text
Browser
  |
  v
Frontend (React + Vite) ── Vercel project: astrothread
  |   /api/* is forwarded by vercel.json
  v
Backend (Flask) ── Vercel project: astrothread-api
  |
  ├── Neon PostgreSQL   (users, papers, threads, My Thread)
  ├── OpenAlex API      (research papers)
  ├── NASA Image API    (images)
  ├── Groq API          (AI answers)
  └── Email (SMTP)      (sign-in codes)
```

The browser communicates with the frontend address. All `/api/...` requests are forwarded to the backend, allowing the application to communicate with the API through the frontend domain.

Only the backend holds external API keys.

### 4.1 Frontend

- Displays pages and handles user interactions.
- Manages search input, results, filters, and tabs.
- Communicates with the backend API.
- Displays research papers, images, the Research Assistant, and My Thread.
- Handles sign-up, sign-in, profile, and admin screens.

### 4.2 Backend

- Handles API requests through Flask routes and services.
- Searches OpenAlex and caches results.
- Calls NASA and Groq services.
- Manages accounts, sessions, and email codes.
- Reads and writes database records.

### 4.3 Database

PostgreSQL stores users, email verification codes, research topics, papers, saved topics, and journey steps.

See [Database](#14-database).

### 4.4 Application Structure

```text
holberton-AstroThread/
├── README.md
├── Project_Charter.md
├── Documentation.md
├── AstroThread-Technical-Documentation.md
├── PROTOTYPE_Figma.md
└── AstroThread-new/
    ├── README.md
    ├── frontend/
    │   ├── src/
    │   ├── vercel.json
    │   └── package.json
    ├── backend/
    │   ├── app/
    │   │   ├── routes/
    │   │   └── services/
    │   ├── migrations/
    │   ├── tests/
    │   ├── manage.py
    │   ├── wsgi.py
    │   └── requirements.txt
    └── testing-evidence/
        └── e2e/
```

- `frontend/`: React, TypeScript, and Vite application.
- `backend/app/routes/`: API endpoints.
- `backend/app/services/`: External API and application services.
- `backend/migrations/`: SQL migration files.
- `backend/tests/`: Python unittest files.
- `testing-evidence/`: Testing evidence and screenshots.

---

## 5. Installation and Setup

### 5.1 Requirements

- Python 3.12+
- Node.js 20+
- npm
- A PostgreSQL database (local or Neon)

### 5.2 Backend Setup

Navigate to the backend directory:

```bash
cd AstroThread-new/backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Linux or macOS:

```bash
source .venv/bin/activate
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the required values in `.env`.

Run database migrations:

```bash
python manage.py migrate
```

Start the Flask application:

```bash
python app.py
```

The backend runs locally on:

`http://localhost:5000`

### 5.3 Backend Environment Variables

The following settings are configured in `backend/.env`.

Never commit this file or expose its values publicly.

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Signs session cookies |
| `SESSION_COOKIE_SECURE` | `true` on HTTPS and `false` locally |
| `EMAIL_MODE` | Email delivery mode |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT` | Gmail SMTP email settings |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional Resend email settings |
| `OPENALEX_API_KEY` | OpenAlex access |
| `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` | Groq AI settings |
| `ADMIN_INVITATION_CODE` | Required to create admin accounts |

### 5.4 Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd AstroThread-new/frontend
```

Install dependencies:

```bash
npm install
```

Make sure `frontend/.env.development` contains:

```env
VITE_SEARCH_SOURCE=api
```

Start the frontend:

```bash
npm run dev
```

The frontend runs locally on:

`http://localhost:5173`

Vite forwards `/api` requests to:

`http://localhost:5000`

### 5.5 Run the Checks

Run backend tests:

```bash
cd AstroThread-new/backend
python -m unittest discover tests
```

Run frontend checks:

```bash
cd ../frontend
npm run lint
npm run build
```

---

## 6. Sprint Planning

The team used GitHub Projects and GitHub Issues to organize sprint planning, track tasks, and monitor project progress.

### GitHub Project Board

[AstroThread – GitHub Projects Board](https://github.com/users/Bothainakb/projects/1)

### GitHub Issues

[View Project Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)

### Sprint Schedule

| Sprint | Dates | Main Focus |
|---|---|---|
| Sprint 1 | October 15–28, 2026 | Project setup, UI/UX design, scientific search, and research paper pages |
| Sprint 2 | October 29–November 11, 2026 | Backend integration, AI assistant, authentication, and My Thread |
| Sprint 3 | November 12–25, 2026 | Deployment, admin features, learning paths, testing, and bug fixing |

The team used the project board to organize tasks and follow their progress throughout development.

---

## 7. Sprint Reviews

Sprint reviews were used to evaluate the progress of AstroThread and review the features developed during each sprint.

### Sprint 1 – Project Setup and Design

- Established the project idea and requirements.
- Created the initial UI/UX design.
- Started developing the frontend and scientific search functionality.

### Sprint 2 – Core Features Development

- Developed backend functionality and API integration.
- Implemented user authentication.
- Worked on the Research Assistant and My Thread features.

### Sprint 3 – Deployment and Testing

- Deployed the frontend and backend.
- Integrated the production database.
- Tested the main user journeys.
- Fixed deployment and application issues.

**Review Outcome:** The project progressed from initial design and development to a deployed application with its main features implemented and tested.
---

## 8. Retrospectives

The team reflected on the development process to identify successes, challenges, and possible improvements.

### What Went Well

- Team collaboration and task distribution.
- Development of the main application features.
- Integration of external APIs.
- Successful deployment of the application.

### Challenges

- Backend and frontend integration.
- Production deployment configuration.
- Database migration issues.
- External API availability and configuration.
- Limited development time.

### Improvements

- Improve communication and progress tracking.
- Test features earlier during development.
- Integrate frontend and backend continuously.
- Document bugs and solutions.
- Allocate more time for final testing.

**Retrospective Outcome:** The team identified areas for improvement in communication, integration, testing, and time management.
---

## 9. Source Repository

The source code is maintained in GitHub.

**Repository:** [holberton-AstroThread](https://github.com/Bothainakb/holberton-AstroThread)

**Final application branch:** `AstroThread-new`

**Final application folder:** `AstroThread-new/`

The final submission version is maintained in the `AstroThread-new` branch.

### Branching Workflow

The team used Git branches to organize development:

1. Create a feature branch for a specific task.
2. Implement and test the changes.
3. Push the branch to GitHub.
4. Open a Pull Request.
5. Review the changes.
6. Merge the verified changes into the appropriate branch.

---

## 10. Bug Tracking

GitHub Issues was used to report, organize, and track bugs during development.

**Issue Tracker:** [AstroThread GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)

### Bug Reporting Process

1. Identify and reproduce the issue.
2. Record the expected behavior.
3. Record the actual behavior.
4. Create a GitHub Issue for confirmed bugs.
5. Apply the `bug` label.
6. Assign the issue to a team member.
7. Implement and review the fix.
8. Retest the affected feature.
9. Close the issue after verification.

### Notable Development Issues Addressed

| Issue | Resolution |
|---|---|
| Backend deployment missing required environment dependencies | Added the required dependencies. |
| Frontend deployed with an incorrect Vercel project configuration | Separated frontend and backend Vercel projects. |
| API forwarding caused an infinite loop | Corrected the backend deployment and API forwarding configuration. |
| Sign-up verification failed because database migrations were not applied | Applied the required Neon database migrations. |
| Previous AI model was no longer available | Switched to `openai/gpt-oss-120b`. |
| Learning path referenced unavailable sample paper IDs | Added a paper lookup endpoint. |
| My Thread frontend build had missing imports and state | Restored the required imports and state handling. |
| Resend free tier required a verified domain | Retained Gmail SMTP as the email delivery option. |

---

## 11. Testing Evidence and Results

Testing was performed to verify the backend, frontend, API integration, and complete user journeys.

### 11.1 Backend Unit Tests

- Framework: Python `unittest`.
- Test files: 10.
- Total tests: 132.
- External services and database interactions were mocked where appropriate.

Run the tests using:

```bash
python -m unittest discover tests
```

**Recorded result:** 132 tests passed.

### 11.2 Frontend Checks

The frontend was checked using the following commands:

```bash
npm run lint
npm run build
```

| Check | Result |
|---|---|
| Frontend build | Passed |
| Lint errors | 0 |
| Lint warnings | 8 |

### 11.3 Manual Frontend Testing

A manual frontend test plan was prepared with 72 test cases:

- 52 frontend and sample-data test cases.
- 20 API-related test cases.

### 11.4 Testing Summary

| Test Type | Result |
|---|---|
| Backend unit tests | 132/132 passed |
| Frontend build | Passed |
| Frontend lint | 0 errors, 8 warnings |
| Manual E2E scenarios | 4/4 passed |

### 11.5 Testing Evidence

Testing evidence and screenshots are stored in the project repository:

[AstroThread Testing Evidence](https://github.com/Bothainakb/holberton-AstroThread/tree/AstroThread-new/AstroThread-new/testing-evidence)

The evidence folder contains the project's testing materials.

---

## 12. End-to-End Testing

End-to-end testing was performed manually on the deployed application to verify complete user journeys.

**Test Environment:** [AstroThread Live Application](https://astrothread-app.vercel.app)

### E2E Test Scenarios

| Test ID | Scenario | Expected Result | Recorded Result |
|---|---|---|---|
| E2E-01 | Search for Black Holes | Relevant research papers are displayed from OpenAlex. | Passed |
| E2E-02 | Open a paper and ask the Research Assistant to summarize it | Paper details and an AI-generated answer are displayed. | Passed |
| E2E-03 | Sign in using the email verification code and refresh the page | The user remains signed in. | Passed |
| E2E-04 | Save a topic, open My Thread, and mark a paper as read | The saved topic, learning path, and read paper appear in My Thread. | Passed |

### E2E Results

**Recorded result: 4 out of 4 scenarios passed.**

Testing evidence:

[View E2E Testing Evidence](https://github.com/Bothainakb/holberton-AstroThread/tree/AstroThread-new/AstroThread-new/testing-evidence)

---

## 13. Production Environment

AstroThread is deployed using Vercel for the frontend and backend, with Neon PostgreSQL as the production database.

### 13.1 Production URLs

| Component | URL |
|---|---|
| Frontend | [https://astrothread-app.vercel.app](https://astrothread-app.vercel.app) |
| Backend Health Check | [https://astrothread-api.vercel.app/api/health](https://astrothread-api.vercel.app/api/health) |
| Source Repository | [GitHub](https://github.com/Bothainakb/holberton-AstroThread) |

### 13.2 Deployment Architecture

| Service | Deployment |
|---|---|
| Frontend | Vercel project `astrothread` |
| Backend | Vercel project `astrothread-api` |
| Database | Neon PostgreSQL |

### 13.3 Production Configuration

- The frontend is deployed separately from the Flask backend.
- The frontend forwards `/api/*` requests to the backend using `vercel.json`.
- The backend connects to Neon PostgreSQL using `DATABASE_URL`.
- Production secrets are stored in Vercel environment variables.
- API keys and database credentials are not committed to GitHub.
- HTTPS is used for the production application.

### 13.4 Local and Production Environments

| Area | Local | Production |
|---|---|---|
| Frontend | `localhost:5173` | Vercel frontend |
| Backend | `localhost:5000` | Vercel backend |
| Database | Local PostgreSQL or configured database | Neon PostgreSQL |
| Environment variables | Local `.env` files | Vercel environment variables |
| API forwarding | Vite proxy | `vercel.json` |

### 13.5 Deployment Verification

Before deploying changes:

1. Run backend tests.
2. Run frontend lint.
3. Run frontend build.
4. Apply required database migrations.
5. Verify Vercel project configuration.
6. Deploy the frontend and backend.
7. Check the production health endpoint.
8. Test the main user journeys.

---

## 14. Database

AstroThread uses PostgreSQL hosted on Neon.

The database stores research information, user accounts, saved topics, and learning journey data.

### 14.1 Database Migrations

The project uses SQL migration files to create and update the database schema.

| Migration | Purpose |
|---|---|
| `001_create_tables.sql` | Initial database tables |
| `002_topic_overview.sql` | Topic overview data |
| `003_paper_details.sql` | Research paper details |
| `004_create_users.sql` | User accounts |
| `005_my_thread.sql` | My Thread functionality |
| `006_account_status.sql` | Account status management |

### 14.2 Main Database Tables

| Table | Purpose |
|---|---|
| `research_threads` | Scientific topics |
| `research_papers` | Research paper records |
| `thread_papers` | Relationship between topics and papers |
| `users` | User accounts |
| `otp_codes` | Email verification codes |
| `saved_topics` | Topics saved by users |
| `journey_steps` | Learning path progress |

### 14.3 Database Security

- Use environment variables for database credentials.
- Use parameterized SQL queries.
- Avoid exposing sensitive user information.
- Keep production credentials outside the source repository.

---

## 15. API Documentation

The backend provides REST API endpoints used by the frontend.

**Base URL:** `https://astrothread-api.vercel.app`

Responses use JSON.

### 15.1 General Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/topics/popular` | Retrieve popular topics |
| GET | `/api/search` | Search scientific research |
| GET | `/api/topics/<slug>/overview` | Retrieve topic overview |
| GET | `/api/images` | Retrieve NASA images |

### 15.2 Research Paper Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/papers/<id>` | Retrieve paper details |
| GET | `/api/papers/<id>/related` | Retrieve related papers |
| GET | `/api/papers/lookup` | Look up papers |
| POST | `/api/papers/<id>/ask` | Ask the Research Assistant |

### 15.3 Authentication Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Request sign-up verification |
| POST | `/api/auth/verify` | Verify email code |
| POST | `/api/auth/login` | Request sign-in verification |
| GET | `/api/auth/me` | Retrieve current user |
| PATCH | `/api/auth/me` | Update profile |
| DELETE | `/api/auth/me` | Delete account |
| POST | `/api/auth/logout` | Sign out |

### 15.4 My Thread Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/my-thread` | Retrieve personal thread |
| POST | `/api/my-thread/topics` | Save a topic |
| DELETE | `/api/my-thread/topics/<id>` | Remove a saved topic |
| POST | `/api/my-thread/steps` | Update journey steps |
| GET | `/api/my-thread/learning-paths` | Retrieve learning paths |

### 15.5 Admin Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/users` | View user accounts |
| PATCH | `/api/admin/users/<id>/status` | Update account status |

### 15.6 Error Handling

The API uses standard HTTP status codes.

| Status Code | Meaning |
|---|---|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

Error responses are returned in JSON format.

---

## 16. Team Contributions

The project was developed collaboratively by the team.

### Alaa

- Frontend design and page development.
- Design system and interface consistency.
- Search result views.
- My Thread interface.

### Bothaina

- Email OTP authentication.
- Admin dashboard and account suspension.
- User profile.
- Learning paths using real research papers.
- Resend email support.

### Dana

- Backend NASA image integration.
- AI Research Assistant.
- Popular topics.
- My Thread backend functionality.
- Frontend and backend integration.
- Research paper lookup.
- Vercel and Neon deployment.
- Production issue resolution.

Team members should verify that the contribution descriptions accurately reflect the work completed before submission.

---

## 17. Known Limitations and Future Improvements

### 17.1 Known Limitations

- Resend email delivery requires a verified domain; Gmail SMTP is retained as the email option.
- Read-paper status is currently browser-based.
- AI answers use the paper title and abstract rather than the full paper.
- Search results depend on the availability and response of OpenAlex.
- The frontend lint check reports 8 warnings.
- Free-tier hosting and external API limits may affect availability.

### 17.2 Future Improvements

- Configure a custom domain and verified email delivery domain.
- Store read-paper progress in the database.
- Resolve remaining frontend lint warnings.
- Expand scientific topic coverage.
- Improve search relevance and filtering.
- Add more automated frontend and E2E tests.
- Add continuous integration workflows.
- Improve API rate limiting and monitoring.

---

## 18. UI/UX Design and Prototype

The project interface was designed using Figma.

The prototype demonstrates the main user experience and application screens.

**Figma Prototype:**

[Open AstroThread – Research Explorer Prototype](https://www.figma.com/proto/5NnyTCEOvJdC5YbM9ZnxM6/AstroThread-Research-Explorer-%E2%80%94-Prototype?node-id=2-3&t=fdl21QCf0NDZQCO2-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A3)

The design focuses on:

- Clear scientific information.
- Simple navigation.
- Readable research paper details.
- Consistent interface components.
- A structured research discovery experience.

---

## 19. Stage 4 Deliverables Checklist

The following checklist summarizes the Stage 4 project deliverables.

| Deliverable | Location / Evidence | Status |
|---|---|---|
| Sprint Planning | [GitHub Projects Board](https://github.com/users/Bothainakb/projects/1) | Available |
| Sprint Reviews | Section 7 | Requires actual review records |
| Retrospectives | Section 8 | Requires actual retrospective records |
| Source Repository | [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread) | Available |
| Bug Tracking | [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues) | Available |
| Testing Evidence and Results | [Testing Evidence Folder](https://github.com/Bothainakb/holberton-AstroThread/tree/AstroThread-new/AstroThread-new/testing-evidence) | Available |
| End-to-End Testing | Section 12 | 4/4 recorded as passed |
| Production Environment | [Live Application](https://astrothread-app.vercel.app) | Deployed |
| Backend Health Check | [API Health](https://astrothread-api.vercel.app/api/health) | Available |

**AstroThread – Research Explorer**

*Follow the thread of a scientific idea — from the first discovery to the latest research.*
