# AstroThread · Research Explorer

**A scientific research discovery platform for astronomy and physics. Holberton School, Stage 4 (MVP Development).**

| Field | Details |
|---|---|
| Project | AstroThread – Research Explorer |
| Repository | [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread) |
| Final submission version | `AstroThread-new` |
| Latest reported commit | `0d46689` |
| Project stage | Holberton School – Stage 4 |
| Frontend | React, TypeScript, Vite |
| Backend | Python, Flask |
| Database | PostgreSQL |

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

The platform helps users explore scientific topics, discover relevant research papers, and follow connections between scientific ideas.

Instead of searching through disconnected research papers, users can explore a topic and discover related scientific information in one place.

### Project Goal

To make scientific research easier to discover and understand by providing a structured search and exploration experience.

### Target Users

- Students interested in astronomy and physics.
- Researchers looking for relevant scientific papers.
- Users who want to explore scientific topics.
- Anyone interested in discovering scientific knowledge.

### Main Concept

AstroThread follows a topic-based research discovery approach:

1. Search for a scientific topic.
2. Explore related research papers.
3. Open paper details.
4. Discover related information.
5. Save topics and continue exploring through My Thread.

---

## 2. Main Features

### 2.1 Scientific Topic Search

- Search for astronomy and physics topics.
- Display relevant research results.
- Explore popular scientific topics.
- Filter and navigate through search results.

### 2.2 Research Papers

- Discover scientific research papers.
- View paper information and details.
- Access available paper sources.
- Explore related research.

### 2.3 Research Assistant

- Provides AI-assisted support for exploring scientific topics.
- Helps users understand research-related information.
- Uses available AI services to generate responses.

### 2.4 My Thread

- Allows users to save topics.
- Provides a personal space for saved research interests.
- Helps users continue their research exploration.

### 2.5 User Authentication

- Supports passwordless sign-in using email verification codes (OTP).
- Provides account access for registered users.

### 2.6 User Profile

- Provides a personal account area.
- Displays user-related information.

### 2.7 Admin Features

- Provides administrative account functionality.
- Supports account management actions such as suspending and reactivating accounts.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| React | Building the user interface |
| TypeScript | Type-safe frontend development |
| Vite | Frontend development and build tool |
| CSS | Styling and layout |
| Python | Backend development |
| Flask | Backend API framework |
| PostgreSQL | Relational database |
| SQL | Database queries and migrations |
| Git | Version control |
| GitHub | Source code hosting and collaboration |
| Vercel | Application deployment |
| OpenAlex API | Scientific research paper data |
| NASA API | Astronomy-related media and information |
| OpenAI API | AI-assisted research functionality |
| Figma | UI/UX design and prototyping |

---

## 4. Project Architecture

AstroThread follows a frontend/backend architecture.

### 4.1 Frontend

The frontend is responsible for:

- Displaying application pages.
- Handling user interactions.
- Managing search input and results.
- Communicating with backend APIs.
- Displaying research papers and topic information.
- Managing authentication-related screens.

### 4.2 Backend

The backend is responsible for:

- Handling API requests.
- Processing search operations.
- Communicating with external APIs.
- Managing user-related operations.
- Accessing and updating database records.
- Providing data to the frontend.

### 4.3 Database

PostgreSQL stores application data, including:

- User accounts.
- Research topics.
- Research papers.
- Saved topics.
- OTP verification records.
- User journey information.

### 4.4 Application Structure

The intended final repository structure is:

    holberton-AstroThread/
    ├── README.md
    ├── Project_Charter.md
    ├── Documentation.md
    ├── AstroThread-Technical-Documentation.md
    ├── PROTOTYPE_Figma.md
    └── AstroThread-new/
        ├── frontend/
        ├── backend/
        ├── database/
        └── ...

The structure above describes the intended final submission layout. Confirm that the files and folders exist in the submitted branch before relying on these paths.

---

## 5. Installation and Setup

### 5.1 Prerequisites

Make sure the following tools are installed:

- Git
- Node.js
- npm
- Python 3
- PostgreSQL

### 5.2 Clone the Repository

    git clone https://github.com/Bothainakb/holberton-AstroThread.git

    cd holberton-AstroThread

### 5.3 Open the Final Project Folder

    cd AstroThread-new

### 5.4 Frontend Setup

Navigate to the frontend directory:

    cd frontend

Install dependencies:

    npm install

Start the development server:

    npm run dev

### 5.5 Backend Setup

Open another terminal and navigate to the backend directory:

    cd backend

Create a virtual environment:

    python -m venv venv

Activate it on Windows PowerShell:

    .\venv\Scripts\Activate.ps1

Install dependencies:

    pip install -r requirements.txt

Configure the required environment variables in the `.env` file.

Start the Flask application using the project's configured entry point.

### 5.6 Database Setup

1. Install and start PostgreSQL.
2. Create the required database.
3. Configure the database connection string.
4. Run the database migrations in the correct order.
5. Verify the database connection.

**Important:** Environment variables and API keys must not be committed to the repository.

---

## 6. Sprint Planning

The team used GitHub Projects and GitHub Issues to organize development work and track progress.

### 6.1 Planning Approach

Sprint planning was used to:

- Identify the features required for the MVP.
- Break large features into smaller tasks.
- Assign tasks to team members.
- Prioritize development work.
- Track task progress.
- Review incomplete tasks.

### 6.2 Task Management

GitHub Issues were used to document development tasks and issues.

GitHub Projects was used to organize tasks and monitor progress.

| Tool | Purpose |
|---|---|
| GitHub Projects | Sprint planning and task organization |
| GitHub Issues | Task descriptions and tracking |
| Pull Requests | Code review and integration |
| Git branches | Separate development work |

### 6.3 Sprint Schedule

The project planning documentation refers to the following three-sprint schedule:

| Sprint | Planned Dates | Main Focus |
|---|---|---|
| Sprint 1 | October 15–28, 2026 | Initial project setup and core development |
| Sprint 2 | October 29–November 11, 2026 | Main feature development and integration |
| Sprint 3 | November 12–25, 2026 | Testing, bug fixing, and final preparation |

These are the planned sprint dates. Actual completion dates and outcomes should be documented in the sprint reviews.

### 6.4 Planning Resources

- [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)
- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)
- GitHub Projects: Add the direct project board URL here.

---

## 7. Sprint Reviews

Sprint Reviews are used to evaluate the work completed during each sprint.

Each review should document:

- Features completed during the sprint.
- Demonstration of completed functionality.
- Work that was not completed.
- Feedback received from the team or supervisor.
- Actions required for the next sprint.

### 7.1 Sprint Review Records

| Sprint | Review Status | Documentation |
|---|---|---|
| Sprint 1 | Pending documentation | Add the actual sprint review |
| Sprint 2 | Pending documentation | Add the actual sprint review |
| Sprint 3 | Pending documentation | Add the actual sprint review |

### 7.2 Sprint Review Template

Use the following structure for each actual review:

#### Sprint [Number] Review

**Date:** [Add actual date]

**Completed Work:**
- [Add completed features]

**Demonstration:**
- [Describe what was demonstrated]

**Incomplete Work:**
- [Add unfinished tasks]

**Feedback:**
- [Add feedback actually received]

**Action Items:**
- [Add agreed actions]

**Note:** Complete this section using actual sprint review information. Do not report planned work as completed work.

---

## 8. Retrospectives

Retrospectives help the team reflect on its development process and identify improvements for future work.

The team can review:

- What went well.
- What did not go well.
- What could be improved.
- Actions to apply in the next sprint.

### 8.1 Retrospective Records

| Sprint | Retrospective Status | Documentation |
|---|---|---|
| Sprint 1 | Pending documentation | Add actual retrospective |
| Sprint 2 | Pending documentation | Add actual retrospective |
| Sprint 3 | Pending documentation | Add actual retrospective |

### 8.2 Retrospective Template

#### Sprint [Number] Retrospective

**Date:** [Add actual date]

**What Went Well?**
- [Add actual positive points]

**What Did Not Go Well?**
- [Add actual challenges]

**What Can Be Improved?**
- [Add improvement opportunities]

**Action Items:**
- [Add specific actions for the next sprint]

**Note:** Retrospective records should reflect the team's real discussion and agreed improvements.

---

## 9. Source Repository

The project source code is maintained using Git and GitHub.

### 9.1 Repository

[AstroThread GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)

### 9.2 Branching Strategy

The team used separate branches to organize development work.

The intended workflow is:

1. Create a feature branch.
2. Implement the assigned feature.
3. Push the branch to GitHub.
4. Open a Pull Request.
5. Review the changes.
6. Merge tested work into the integration branch.
7. Merge the verified final version into the submission branch.

### 9.3 Final Submission Version

The final application version was developed in the `AstroThread-new` branch and folder.

Reported final version information:

| Field | Details |
|---|---|
| Final development branch | `AstroThread-new` |
| Latest reported commit | `0d46689` |
| Commit date | November 21, 2026 |
| Integration branch | `Developer` |
| Submission branch | Confirm the final branch before submission |

### 9.4 Repository Submission Checklist

- [ ] Confirm the final version is available in the submission branch.
- [ ] Confirm the README matches the submitted version.
- [ ] Confirm required project documentation is included.
- [ ] Confirm obsolete project folders are removed only after team verification.
- [ ] Confirm the repository can be cloned successfully.
- [ ] Confirm the final application can be built and run.

**Important:** Update the branch information after the final version is merged. Do not describe `AstroThread-new` as the submitted `main` version until the merge has actually been completed.

---

## 10. Bug Tracking

GitHub Issues were used to report and track development tasks and problems.

### 10.1 Bug Tracking Process

The bug tracking process follows these steps:

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

Each bug report should include:

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

### 10.3 Bug Tracking Resources

- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)
- [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)

**Note:** Only confirmed bugs should be reported as bugs. A failed test must be investigated before being classified as a confirmed application defect.

---

## 11. Testing Evidence and Results

Testing is used to verify that the application behaves as expected.

The project includes backend unit tests and a manual frontend test plan.

### 11.1 Testing Types

| Testing Type | Purpose |
|---|---|
| Unit Testing | Tests individual functions and components |
| Integration Testing | Tests communication between application components |
| Manual Testing | Checks application behavior through the user interface |
| API Testing | Checks backend endpoints and responses |
| End-to-End Testing | Tests complete user journeys |

### 11.2 Backend Unit Tests

The backend contains automated test files covering different application areas.

Reported project test structure:

- 9 backend test files.
- 114 test methods.

The latest reported test run had one failing test:

`test_lookup.FindPaperTests.test_commas_and_colons_are_removed_from_the_filter`

The reported test environment used Python 3.13 with a minimal stand-in for `psycopg` because the real dependency was unavailable.

Therefore, the result must be verified again using the actual project dependencies before reporting the final test status.

### 11.3 Frontend Testing

The frontend manual test plan contains 72 test cases:

| Test Category | Number of Cases |
|---|---:|
| Sample Data / Frontend | 52 |
| API | 20 |
| **Total** | **72** |

The latest reported status was that the test cases had not yet been executed.

### 11.4 Test Results

| Test Area | Reported Status |
|---|---|
| Backend unit tests | Requires verification with real dependencies |
| Frontend manual tests | Not Run |
| API tests | Not Run |
| E2E tests | Not Run |
| Frontend build | Result not recorded |
| Frontend lint | Result not recorded |

### 11.5 Testing Evidence

Actual testing evidence should be stored in the repository.

Suggested structure:

    AstroThread-new/
    └── testing-evidence/
        ├── manual-testing/
        ├── api-testing/
        └── e2e/

Evidence may include:

- Screenshots of actual test execution.
- Test result tables.
- API responses.
- Error messages.
- Bug reports.
- Retest results.

Do not add screenshots or test results that were not actually produced.

---

## 12. End-to-End Testing

End-to-End (E2E) testing verifies that complete user journeys work across the application.

It checks the interaction between the frontend, backend, database, and external services involved in a user action.

### 12.1 Planned E2E Scenarios

| Test ID | Scenario | Expected Result |
|---|---|---|
| E2E-01 | Open the application | Homepage loads successfully |
| E2E-02 | Search for a scientific topic | Relevant search results appear |
| E2E-03 | Open a research paper | Paper details are displayed |
| E2E-04 | Sign in using email OTP | User can access the account |
| E2E-05 | Save a topic | Topic appears in My Thread |
| E2E-06 | Open the user profile | Profile information is displayed |
| E2E-07 | Admin suspends an account | Account status is updated |
| E2E-08 | Admin reactivates an account | Account becomes active again |

### 12.2 E2E Test Results

| Test ID | Actual Result | Status |
|---|---|---|
| E2E-01 | Not Run | Not Run |
| E2E-02 | Not Run | Not Run |
| E2E-03 | Not Run | Not Run |
| E2E-04 | Not Run | Not Run |
| E2E-05 | Not Run | Not Run |
| E2E-06 | Not Run | Not Run |
| E2E-07 | Not Run | Not Run |
| E2E-08 | Not Run | Not Run |

### 12.3 E2E Testing Evidence

After executing each scenario, record:

- Test ID.
- Test steps.
- Expected result.
- Actual result.
- Pass or Fail status.
- Screenshot or other evidence.

E2E testing may be performed manually or using an automation tool such as Playwright, depending on the team's testing approach and project requirements.

**Note:** The scenarios above are planned test cases, not completed test results.

---

## 13. Production Environment

The production environment makes the application accessible through public URLs.

### 13.1 Deployment Links

| Service | URL |
|---|---|
| Frontend | https://astrothread-six.vercel.app/ |
| Backend Health Check | https://astrothread-api.vercel.app/api/health |

### 13.2 Deployment Status

The latest reported deployment information indicated:

- The frontend URL was serving an older version of the application.
- The final `AstroThread-new` frontend had not yet been deployed.
- The backend health endpoint was responding.
- The final frontend and backend integration still required verification.

### 13.3 Production Verification Checklist

- [ ] Deploy the final frontend version.
- [ ] Verify the frontend URL displays the final application.
- [ ] Verify the backend health endpoint.
- [ ] Verify frontend-to-backend communication.
- [ ] Verify database connectivity.
- [ ] Verify authentication and email OTP.
- [ ] Verify external API integrations.
- [ ] Execute production smoke tests.
- [ ] Record the final deployment URLs.

**Important:** A public URL alone does not confirm that the final version is deployed. Verify the deployed application before marking production deployment as complete.

---

## 14. Database

AstroThread uses PostgreSQL as its relational database.

### 14.1 Database Responsibilities

The database stores and manages application information, including:

- User accounts.
- Research topics.
- Research papers.
- Saved topics.
- OTP verification codes.
- User journey steps.

### 14.2 Database Tables

The reported database migration structure creates the following seven tables:

| Table | Purpose |
|---|---|
| `users` | Stores user account information |
| `research_threads` | Stores scientific research topics |
| `research_papers` | Stores research paper information |
| `thread_papers` | Connects research topics with papers |
| `otp_codes` | Stores email verification code records |
| `saved_topics` | Stores topics saved by users |
| `journey_steps` | Stores user journey information |

### 14.3 Database Migrations

The project uses SQL migration files to create and update database structures.

Migrations should be executed in the correct order.

### 14.4 Database Security

- Database credentials must be stored in environment variables.
- Sensitive information must not be committed to GitHub.
- Production database access should be restricted.
- User-related data should be handled securely.

---

## 15. API Documentation

The backend exposes API endpoints used by the frontend.

The API handles authentication, search, research data, user information, and administrative functionality.

### 15.1 Main API Areas

| API Area | Responsibility |
|---|---|
| Health | Checks backend availability |
| Topics | Retrieves topic information |
| Search | Processes scientific searches |
| Papers | Retrieves research paper information |
| Authentication | Handles user sign-in and OTP |
| Profile | Provides user profile information |
| Saved Topics | Manages saved research topics |
| Admin | Handles administrative account operations |

### 15.2 Health Endpoint

    GET /api/health

Checks whether the backend service is responding.

### 15.3 Main Endpoint Groups

The following endpoint groups were identified in the project:

- `/api/health`
- `/api/topics/popular`
- `/api/search`
- `/api/images`
- `/api/papers`
- `/api/papers/lookup`
- `/api/topics/<slug>/overview`

The availability and implementation status of individual endpoints should be verified against the final backend version.

### 15.4 API Verification

API testing should verify:

- Correct HTTP status codes.
- Valid response formats.
- Correct handling of invalid input.
- Authentication and authorization.
- Database operations.
- External API responses.
- Error handling.

---

## 16. Team Contributions

AstroThread was developed collaboratively by the project team.

Team members contributed to planning, implementation, testing, integration, and documentation.

### 16.1 Team Roles

| Role | Responsibility |
|---|---|
| Alaa | Source Control Manager |
| Bothaina | Project Manager |
| QA | Shared team responsibility |

### 16.2 Contributions

Team contributions include:

- Frontend development.
- Backend development.
- Database implementation.
- API integration.
- UI/UX design.
- Testing and bug fixing.
- Documentation.
- GitHub project management.

### 16.3 Contribution Verification

Individual contributions should be verified using:

- Git commit history.
- Pull Requests.
- GitHub Issues.
- Assigned tasks.
- Project documentation.

GitHub contribution counts alone do not represent the full amount of work completed by each member.

---

## 17. Known Limitations and Future Improvements

The project was developed as a Minimum Viable Product (MVP).

Some features and improvements may require additional development beyond the current implementation.

### 17.1 Known Limitations

Reported areas requiring further work or verification include:

- Final frontend deployment.
- Full frontend and backend integration testing.
- Complete execution of the manual test plan.
- End-to-end testing.
- Verification of backend tests using real dependencies.
- Verification of production email delivery.
- Completion and verification of some API functionality.

### 17.2 Future Improvements

Potential future improvements include:

- Expanding scientific topic coverage.
- Improving AI-generated topic explanations.
- Adding more research discovery features.
- Improving search relevance.
- Expanding learning paths.
- Improving administrative tools.
- Adding more automated tests.
- Establishing a continuous integration pipeline.
- Improving API rate limiting and error handling.

---

## 18. UI/UX Design and Prototype

Figma was used to design and prototype the AstroThread user interface.

The design focuses on providing a clear and accessible scientific research discovery experience.

### 18.1 Design Goals

- Simple and clear navigation.
- Professional scientific appearance.
- Consistent page layouts.
- Readable research information.
- Easy access to search functionality.
- Clear presentation of research results.

### 18.2 Figma Prototype

[Open AstroThread Figma Prototype](https://www.figma.com/proto/5NnyTCEOvJdC5YbM9ZnxM6/AstroThread-Research-Explorer-%E2%80%94-Prototype?node-id=2-3&t=fdl21QCf0NDZQCO2-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A3)

### 18.3 Main UI Areas

The application design includes:

- Homepage and scientific search.
- Search results.
- Research paper details.
- Research Assistant.
- My Thread.
- User authentication.
- User profile.
- Administrative pages.

---

## 19. Stage 4 Deliverables Checklist

The following checklist summarizes the Stage 4 submission requirements.

| Deliverable | Description | Status |
|---|---|---|
| Sprint Reviews | Records of sprint demonstrations and feedback | Pending documentation |
| Retrospectives | Records of team reflections and improvements | Pending documentation |
| Sprint Planning | Sprint plans and task organization | Partially documented |
| Source Repository | GitHub source code | Available |
| Bug Tracking | Bug reports and issue tracking | Requires verification |
| Testing Evidence and Results | Test execution records and evidence | Not completed in reported status |
| Production Environment | Publicly deployed final application | Final frontend deployment pending |

### Final Submission Verification

Before submitting the project, the team should verify:

- [ ] The final source code is available in the correct submission branch.
- [ ] The README matches the final application.
- [ ] Sprint planning documentation is available.
- [ ] Sprint reviews are documented.
- [ ] Retrospectives are documented.
- [ ] GitHub Issues are used to track confirmed bugs.
- [ ] Manual test cases have actual execution results.
- [ ] Backend tests have been rerun with real dependencies.
- [ ] E2E scenarios have been executed and documented.
- [ ] Screenshots and testing evidence are included.
- [ ] The final frontend is deployed.
- [ ] The backend and database are accessible.
- [ ] Production URLs have been verified.

---

**AstroThread – Research Explorer**

*Follow the thread of a scientific idea — from discovery to research and beyond.*
