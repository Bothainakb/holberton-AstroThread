# AstroThread – Sprint Plan

## 1. Sprint Goal

The goal is to organize AstroThread MVP development into manageable sprints, prioritize features, assign responsibilities, identify dependencies, and define completion criteria.

## 2. Sprint Duration

Development runs for six weeks, divided into three two-week sprints:

| Sprint | Dates | Focus |
|---|---|---|
| Sprint 1 | Oct 15 – Oct 28, 2026 | Setup, accounts, research threads and thread details |
| Sprint 2 | Oct 29 – Nov 11, 2026 | Research features: NASA media, papers, charts and AI assistant |
| Sprint 3 | Nov 12 – Nov 25, 2026 | Should Have features, integration, deployment and final QA |

The schedule can be adjusted according to team progress and the project deadline.

## 3. Team Members, Roles and Responsibilities

| Team Member | Technical Responsibilities | Stage 4 Role |
|---|---|---|
| Alaa | Frontend Development and Backend Development | Source Control Manager (SCM) |
| Bothaina | Backend Development and Database Development | Project Manager (PM) |

Quality Assurance (QA) is shared: each member tests the other member's completed work before it is merged, so no feature is tested only by the person who built it.

- **Project Manager:** plans sprints, keeps the project board up to date, runs check-ins, sprint reviews and retrospectives, and adjusts the plan when tasks fall behind.
- **Source Control Manager:** maintains the branching strategy, reviews pull requests and merges approved work into the `Developer` branch.
- **Quality Assurance:** writes and runs tests, tests endpoints in Postman, records results as testing evidence and logs bugs.

Both members collaborate on integration, testing, code reviews and completing the MVP.

## 4. Sprint 1 – Core Features (Oct 15 – Oct 28)

**Goal:** Set up the project, implement accounts, and connect research thread browsing and thread details to the backend.

| Task | Priority | Responsible | Dependency | Status |
|---|---|---|---|---|
| Set up frontend (React, Vite, TypeScript) and shared components | Must Have | Alaa | None | Done |
| Build Home, Research Threads, Search, Login and Thread Details pages | Must Have | Alaa | Frontend setup | Done |
| Set up Flask backend with PostgreSQL connection | Must Have | Alaa | None | Done |
| Implement `GET /api/threads` with search and unit tests | Must Have | Alaa | Backend setup | Done |
| Connect Home page threads and search to the API | Must Have | Alaa | `GET /api/threads` | Done |
| Install PostgreSQL and create the project database | Must Have | Bothaina | None | Done |
| Create database schema and seed data | Must Have | Bothaina | Database setup | In Progress |
| Agree on folder structure and API naming conventions | Must Have | Alaa and Bothaina | None | In Progress |
| Implement user registration and login (JWT) | Must Have | Bothaina | Database schema | To Do |
| Implement thread details, papers, timeline and chart endpoints | Must Have | Bothaina | Database schema | To Do |
| Build Registration page and connect Login and Registration to the API | Must Have | Alaa | Auth endpoints | To Do |
| Connect Research Threads, Search, timeline, charts and Thread Details to the API | Must Have | Alaa | Thread endpoints | To Do |
| Update technical documentation to match the implementation | Should Have | Bothaina | Database schema | To Do |
| Sprint 1 review and retrospective | Must Have | Alaa and Bothaina | Sprint 1 tasks | To Do |

## 5. Sprint 2 – Research Features (Oct 29 – Nov 11)

**Goal:** Complete the main research experience: NASA media, research papers, interactive charts and the AI research assistant.

| Task | Priority | Responsible | Dependency |
|---|---|---|---|
| Implement NASA API endpoint for thread images and data | Must Have | Bothaina | Thread endpoints, NASA API key |
| Import research paper metadata from OpenAlex | Must Have | Bothaina | Database schema |
| Add chart data for every research thread | Must Have | Bothaina | Database schema |
| Implement AI research assistant endpoint (OpenAI) | Must Have | Bothaina | Authentication, AI API key |
| Connect the NASA Media section to the API | Must Have | Alaa | NASA endpoint |
| Implement interactive data visualizations | Must Have | Alaa | Chart data and endpoints |
| Build the AI Research Assistant interface | Must Have | Alaa | AI endpoint |
| Test all endpoints in Postman and record results | Must Have | Alaa and Bothaina | Implemented endpoints |
| Sprint 2 review and retrospective | Must Have | Alaa and Bothaina | Sprint 2 tasks |

## 6. Sprint 3 – Integration, Deployment and QA (Nov 12 – Nov 25)

**Goal:** Implement the Should Have features, integrate all components, deploy the MVP and complete final QA.

| Task | Priority | Responsible | Dependency |
|---|---|---|---|
| Implement bookmark endpoints | Should Have | Bothaina | Authentication |
| Implement profile and password change endpoints | Should Have | Bothaina | Authentication |
| Implement Owner endpoints for creating, editing and deleting threads | Should Have | Bothaina | Authentication and authorization |
| Build Bookmarks, Profile and Owner Dashboard interfaces | Should Have | Alaa | Matching endpoints |
| Deploy backend and database to production | Must Have | Bothaina | Completed backend |
| Deploy frontend and connect it to the production API | Must Have | Alaa | Deployed backend |
| Perform end-to-end integration testing and fix bugs | Must Have | Alaa and Bothaina | Deployed MVP |
| Sprint 3 review, retrospective and final deliverables | Must Have | Alaa and Bothaina | Sprint 3 tasks |
| Request the manual QA review | Must Have | Alaa and Bothaina | Final testing |
| Add Premium subscription demo functionality | Could Have | Alaa and Bothaina | Core application features |

## 7. MoSCoW Prioritization

### Must Have

- User registration and login.
- Browsing and searching research threads.
- Thread details and related research papers.
- Discovery timelines.
- NASA images and data.
- Interactive data visualizations.
- AI research assistant.

### Should Have

- Bookmarks.
- Profile management and password changes.
- Owner Dashboard for creating, editing and deleting research threads.

### Could Have

- Premium subscription plans.
- Demo activation for Premium features and increased AI usage limits.

### Won't Have in This MVP

- Real payment processing.
- Advanced physics simulations.
- Other features planned for future releases.

## 8. Source Control Workflow

- Each member works on their own branch (`Alaa-Aldwasari` and `Bothaina-Albedah`).
- Completed work is merged into the `Developer` branch through a pull request.
- Every pull request is reviewed by the other team member before merging.
- The `main` branch stays stable and only receives tested work from `Developer` at the end of each sprint.
- Secrets such as database passwords and API keys are stored in `.env` files and never committed.

## 9. Definition of Done

A task is considered complete when:

- The feature works according to its requirements.
- The code follows project standards and has been reviewed through a pull request.
- Relevant tests are written or performed, and they pass.
- Identified bugs are fixed or logged as GitHub Issues.
- The changes are merged into the `Developer` branch.

## 10. Sprint Tracking and Metrics

Tasks are tracked on the GitHub Project board **AstroThread Task Division** using the To Do, In Progress and Done columns. Each task has an assignee and a sprint.

- **Check-ins:** short stand-ups several times a week to share progress, plans and blockers.
- **Sprint review:** at the end of each sprint, completed features are demonstrated.
- **Sprint retrospective:** the team discusses what worked well, what challenges came up and what to improve in the next sprint.
- **Metrics:** sprint velocity (tasks completed per sprint), percentage of planned tasks completed, and bug count and resolution rate.
- **Bug tracking:** bugs are logged as GitHub Issues and linked to the related task.

## 11. Dependencies and Risks

- Frontend integration depends on the availability of backend API endpoints.
- Backend features that use stored data depend on the database schema and configuration.
- NASA, OpenAlex and AI features depend on external API availability, rate limits and API keys.
- Integration testing and deployment depend on the completion of the relevant features.
- With a two-person team, a delay from one member directly affects the other. Blockers are raised at check-ins so tasks can be reassigned early.

The team will prioritize Must Have features and adjust the schedule if technical issues or time constraints arise.
