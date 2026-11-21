# AstroThread · Research Explorer

**A scientific research discovery platform for astronomy and physics. Holberton School, Stage 4 (MVP Development).**

| Field | Details |
|---|---|
| Project | AstroThread – Research Explorer |
| Repository | [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread) |
| Final application folder | `AstroThread-new` |
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

- Provides admin account functionality.
- Allows admins to manage user accounts.
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
| Groq API | AI-assisted research functionality |
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
- Gmail verification records.
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


## 5. Sprint Planning

The team used GitHub Projects and GitHub Issues to organize development work and track progress.

### 5.1 Planning Approach

Sprint planning was used to:

- Identify the features required for the MVP.
- Break large features into smaller tasks.
- Assign tasks to team members.
- Prioritize development work.
- Track task progress.
- Review incomplete tasks.

### 5.2 Task Management

GitHub Issues were used to document development tasks and issues.

GitHub Projects was used to organize tasks and monitor progress.

| Tool | Purpose |
|---|---|
| GitHub Projects | Sprint planning and task organization |
| GitHub Issues | Task descriptions and tracking |
| Pull Requests | Code review and integration |
| Git branches | Separate development work |

### 5.3 Sprint Schedule

The project planning documentation refers to the following three-sprint schedule:

| Sprint | Planned Dates | Main Focus |
|---|---|---|
| Sprint 1 | October 15–28, 2026 | Initial project setup and core development |
| Sprint 2 | October 29–November 11, 2026 | Main feature development and integration |
| Sprint 3 | November 12–25, 2026 | Testing, bug fixing, and final preparation |


### 5.4 Planning Resources

- [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)
- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)

---



---

## 6. Retrospectives

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



## 7. Source Repository

The project source code is maintained using Git and GitHub.

### 7.1 Repository

[AstroThread GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)

### 7.2 Branching Strategy

The team used separate branches to organize development work.

The intended workflow is:

1. Create a feature branch.
2. Implement the assigned feature.
3. Push the branch to GitHub.
4. Open a Pull Request.
5. Review the changes.
6. Merge tested work into the integration branch.
7. Merge the verified final version into the submission branch.

---

## 8. Bug Tracking

GitHub Issues were used to report and track development tasks and problems.

### 8.1 Bug Tracking Process

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

### 8.2 Bug Report Information

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

### 8.3 Bug Tracking Resources

- [GitHub Issues](https://github.com/Bothainakb/holberton-AstroThread/issues)
- [GitHub Repository](https://github.com/Bothainakb/holberton-AstroThread)

**Note:** Only confirmed bugs should be reported as bugs. A failed test must be investigated before being classified as a confirmed application defect.

---

## 9. Testing Evidence and Results

Testing is used to verify that the application behaves as expected.

The project includes backend unit tests and a manual frontend test plan.

### 9.1 Testing Types

| Testing Type | Purpose |
|---|---|
| Unit Testing | Tests individual functions and components |
| Integration Testing | Tests communication between application components |
| Manual Testing | Checks application behavior through the user interface |
| API Testing | Checks backend endpoints and responses |
| End-to-End Testing | Tests complete user journeys |

### 9.2 Backend Unit Tests

The backend contains automated test files covering different application areas.

Reported project test structure:

- 9 backend test files.
- 114 test methods.

The latest reported test run had one failing test:

`test_lookup.FindPaperTests.test_commas_and_colons_are_removed_from_the_filter`

The reported test environment used Python 3.13 with a minimal stand-in for `psycopg` because the real dependency was unavailable.

Therefore, the result must be verified again using the actual project dependencies before reporting the final test status.

### 9.3 Frontend Testing

The frontend manual test plan contains 72 test cases:

| Test Category | Number of Cases |
|---|---:|
| Sample Data / Frontend | 52 |
| API | 20 |
| **Total** | **72** |

The latest reported status was that the test cases had not yet been executed.

### 9.4 Test Results

| Test Area | Reported Status |
|---|---|
| Backend unit tests | Requires verification with real dependencies |
| Frontend manual tests | Not Run |
| API tests | Not Run |
| E2E tests | Not Run |
| Frontend build | Result not recorded |
| Frontend lint | Result not recorded |

### 9.5 Testing Evidence

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


---

## 10. End-to-End Testing



### 10.1 Planned E2E Scenarios

| Test ID | Scenario | Expected Result |
|---|---|---|
| E2E-01 | Open the application | Homepage loads successfully |
| E2E-02 | Search for a scientific topic | Relevant search results appear |
| E2E-03 | Open a research paper | Paper details are displayed |
| E2E-04 | Sign in using email OTP | User can access the account |
| E2E-05 | Save a topic | Topic appears in My Thread |
| E2E-06 | Open the user profile | Profile information is displayed |
| E2E-07 | Admin suspends a user account | Account status is updated |
| E2E-08 | Admin reactivates a user account | Account becomes active again |

### 10.2 E2E Test Results

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

---

## 11. Production Environment

The production environment makes the application accessible through public URLs.

### 11.1 Deployment Links

| Service | URL |
|---|---|
| Frontend | https://astrothread-app.vercel.app |
| Backend Health Check | https://astrothread-api.vercel.app/api/health |


---

## 12. Known Limitations and Future Improvements

The project was developed as a Minimum Viable Product (MVP).

Some features and improvements may require additional development beyond the current implementation.

### 12.1 Known Limitations

Reported areas requiring further work or verification include:

- Final frontend deployment.
- Full frontend and backend integration testing.
- Complete execution of the manual test plan.
- End-to-end testing.
- Verification of backend tests using real dependencies.
- Verification of production email delivery.
- Completion and verification of some API functionality.

### 12.2 Future Improvements

Potential future improvements include:

- Expanding scientific topic coverage.
- Improving AI-generated topic explanations.
- Adding more research discovery features.
- Improving search relevance.
- Expanding learning paths.
- Improving admin tools.
- Adding more automated tests.
- Establishing a continuous integration pipeline.
- Improving API rate limiting and error handling.

---


### 13 Figma Prototype

[Open AstroThread Figma Prototype](https://www.figma.com/proto/5NnyTCEOvJdC5YbM9ZnxM6/AstroThread-Research-Explorer-%E2%80%94-Prototype?node-id=2-3&t=fdl21QCf0NDZQCO2-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A3)



---

**AstroThread – Research Explorer**

*Follow the thread of a scientific idea — from discovery to research and beyond.*
