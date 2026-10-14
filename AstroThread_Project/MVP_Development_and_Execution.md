# AstroThread – Sprint Plan

## 1. Sprint Goal

The goal is to organize AstroThread MVP development into manageable sprints, prioritize features, assign responsibilities, and define dependencies to ensure the core features are implemented and tested.

## 2. Sprint Duration

- Sprint 1: 5 days
- Sprint 2: 5 days

The schedule can be adjusted according to team progress and the project deadline.

## 3. Sprint 1 – Core Features

**Goal:** Set up the project and implement the basic research browsing functionality.

| Task | Priority | Responsibility | Dependency |
|---|---|---|---|
| Set up frontend, backend, and database | Must Have | Development Team | None |
| Implement user registration and login | Must Have | Backend Developer | Database setup |
| Display and search research threads | Must Have | Frontend and Backend Developers | Project setup |
| Display thread details and related research papers | Must Have | Frontend and Backend Developers | Research threads |
| Implement initial database models and API endpoints | Must Have | Backend Developer | Database setup |
| Review code and test completed features | Must Have | QA / Development Team | Implemented features |

## 4. Sprint 2 – Research Features and Integration

**Goal:** Complete the main research experience, connect components, and test the MVP.

| Task | Priority | Responsibility | Dependency |
|---|---|---|---|
| Display discovery timelines | Must Have | Frontend and Backend Developers | Thread details |
| Integrate NASA images and data | Must Have | Backend Developer | Research thread structure |
| Implement interactive data visualizations | Must Have | Frontend and Backend Developers | Chart data and APIs |
| Integrate the AI research assistant | Must Have | Backend Developer | AI API configuration |
| Implement bookmarks, profile, and password changes | Should Have | Frontend and Backend Developers | Authentication |
| Implement Owner Dashboard for managing research threads | Should Have | Frontend and Backend Developers | Authentication and authorization |
| Add Premium subscription demo functionality | Could Have | Development Team | Core application features |
| Perform integration testing and fix bugs | Must Have | QA / Development Team | Implemented features |
| Review and merge code changes | Must Have | SCM / Development Team | Code changes |

## 5. MoSCoW Prioritization

- **Must Have:** User registration and login, browsing and searching research threads, thread details, related papers, discovery timelines, NASA media, data visualizations, and the AI assistant.
- **Should Have:** Bookmarks, profile management, password changes, and Owner Dashboard.
- **Could Have:** Premium subscription plans and demo activation.
- **Won't Have in This MVP:** Real payment processing, advanced physics simulations, and other post-MVP enhancements.

## 6. Definition of Done

A task is considered complete when:

- The feature works according to its requirements.
- The code is reviewed and follows project standards.
- Relevant tests are performed and passed.
- Identified bugs are fixed or documented.
- Changes are committed to the GitHub repository.

## 7. Team Responsibilities

- **Project Manager:** Organizes sprint planning, tracks progress, and coordinates the team.
- **SCM:** Manages branches, commits, pull requests, and code integration.
- **QA:** Tests features, documents bugs, and verifies fixes.
- **Development Team:** Implements frontend, backend, database, and API features.

Team members will be assigned specific tasks according to their roles and availability.

## 8. Sprint Tracking

The team will review task progress regularly, discuss blockers, and update the sprint plan when necessary. At the end of each sprint, the team will review completed work and identify improvements for the next sprint.
