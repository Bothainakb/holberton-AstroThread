# AstroThread — Technical Documentation

## 1. Define User Stories and Mockups

### 1.1 User Stories

* Visitor/User registration and login.
* User browsing and searching research threads.
* User viewing research details, timelines, charts, and NASA media.
* User using the AI Research Assistant.
* User bookmarking research threads.
* User managing profile information and changing password.
* User viewing and upgrading a subscription plan.
* Owner managing research threads and related content.

### 1.2 Mockups

* Home Page.
* Research Threads Page.
* Research Thread Details Page.
* Data Visualization and Timeline sections.
* AI Research Assistant.
* Login and Registration Pages.
* User Profile and Subscription Plans.
* Owner Dashboard.

## 2. Design System Architecture

### 2.1 Architecture Overview

AstroThread uses a client-server architecture:

* **Frontend:** React.
* **Backend:** Python and Flask REST API.
* **Database:** PostgreSQL.
* **External Services:** NASA data/media API, research metadata API, and an AI service.

### 2.2 Main Components

* React User Interface.
* Flask REST API.
* Authentication and Authorization.
* Research Thread Management.
* Subscription Management.
* AI Research Assistant.
* PostgreSQL Database.
* External API Integration.

### 2.3 Authentication and Authorization

Users authenticate through the login page. The backend validates credentials and issues an authentication token.

The system has two roles:

* **User:** Accesses research features, bookmarks, profile, and subscription information.
* **Owner:** Manages research threads and their related content.

Owner permissions are enforced by the backend. A Premium subscription does not grant Owner privileges.

## 3. Define Components, Classes, and Database Design

### 3.1 Main Classes and Components

* User
* ResearchThread
* ResearchPaper
* TimelineEvent
* ChartData
* Bookmark
* Subscription
* AIResearchAssistant

### 3.2 Database Tables

**users**

* id
* name
* email
* password_hash
* role
* created_at
* updated_at

**research_threads**

* id
* title
* category
* summary
* is_featured
* created_at

**research_papers**

* id
* openalex_id
* title
* authors
* publication_year
* abstract
* url

**thread_papers**

* thread_id
* paper_id

**timeline_events**

* id
* thread_id
* year
* title
* description

**chart_data**

* id
* thread_id
* title
* chart_type
* dataset

**bookmarks**

* id
* user_id
* thread_id
* created_at

**subscriptions**

* id
* user_id
* plan
* status
* start_date
* end_date
* created_at
* updated_at

### 3.3 Relationships

* A User can have multiple Bookmarks.
* A ResearchThread can have multiple Bookmarks.
* A ResearchThread can have multiple TimelineEvents.
* A ResearchThread can have multiple ChartData records.
* ResearchThreads and ResearchPapers have a many-to-many relationship through thread_papers.
* A User can have subscription records over time, while the system must enforce the intended active-subscription rule.

### 3.4 Roles and Subscription Plans

The `role` field identifies whether an account is a User or Owner.

The subscription `plan` identifies whether the user has Free or Premium access. Roles and subscription plans are separate.

For the MVP:

* **Free:** Access to core research features and basic AI usage.
* **Premium:** Core features plus increased AI usage limits.
* Subscription activation will be a demo flow without real payment processing.

## 4. Create High-Level Sequence Diagrams

### 4.1 User Login

1. The user submits email and password.
2. React sends the credentials to Flask.
3. Flask validates the credentials against the database.
4. Flask returns an authentication token and the user's role.
5. React opens the appropriate interface.

### 4.2 Research Thread Browsing

1. The user opens the Research Threads page.
2. React requests research threads from Flask.
3. Flask retrieves the records from PostgreSQL.
4. Flask returns the results.
5. React displays the research threads.

### 4.3 AI Research Assistant

1. The user submits a question or requests an explanation.
2. React sends the request to Flask with the authentication token.
3. Flask checks authorization and applicable usage limits.
4. Flask calls the AI service.
5. Flask returns the response to React.

### 4.4 Premium Demo Activation

1. The user selects Upgrade to Premium.
2. React sends the request to Flask.
3. Flask verifies the authenticated user.
4. Flask updates the subscription record using the demo activation flow.
5. React displays the updated subscription status.

### 4.5 Owner Content Management

1. The Owner submits a create, edit, or delete request.
2. React sends the request to Flask with the authentication token.
3. Flask verifies the token and Owner role.
4. Flask validates the request and updates PostgreSQL.
5. Flask returns the result to React.

## 5. Document External and Internal APIs

### 5.1 Internal APIs

| Method | Endpoint                          | Purpose                              |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/auth/register`                  | Register a User account              |
| POST   | `/auth/login`                     | Authenticate a user                  |
| PATCH  | `/auth/password`                  | Change the current user's password   |
| GET    | `/research-threads`               | List research threads                |
| GET    | `/research-threads/{id}`          | Retrieve thread details              |
| GET    | `/research-threads/{id}/papers`   | Retrieve related papers              |
| GET    | `/research-threads/{id}/timeline` | Retrieve timeline events             |
| GET    | `/research-threads/{id}/charts`   | Retrieve chart data                  |
| GET    | `/profile`                        | Retrieve the current user's profile  |
| PATCH  | `/profile`                        | Update the current user's profile    |
| GET    | `/bookmarks`                      | List the current user's bookmarks    |
| POST   | `/bookmarks`                      | Add a bookmark                       |
| DELETE | `/bookmarks/{thread_id}`          | Remove a bookmark                    |
| GET    | `/subscription/plans`             | List available plans                 |
| GET    | `/subscription/me`                | Retrieve the current subscription    |
| POST   | `/subscription/activate-demo`     | Activate a demo Premium subscription |
| POST   | `/ai/explain`                     | Request an AI explanation            |
| POST   | `/owner/research-threads`         | Create a research thread             |
| PATCH  | `/owner/research-threads/{id}`    | Update a research thread             |
| DELETE | `/owner/research-threads/{id}`    | Delete a research thread             |

Owner endpoints require Owner authorization. User-specific endpoints must enforce ownership and authentication as appropriate.

These endpoints are proposed specifications and must be aligned with the actual Flask routes before being marked as implemented.

### 5.2 External APIs

* **NASA API:** Provides relevant astronomy images and data.
* **Research Metadata API:** Provides research paper metadata, such as titles, authors, abstracts, and publication information.
* **AI Service API:** Generates explanations and summaries based on supported research content.

The selected providers, required credentials, request formats, and error handling will be documented during implementation.

## 6. Plan SCM and QA Strategies

### 6.1 Software Configuration Management (SCM)

* Use Git and GitHub for version control.
* Keep the `main` branch stable.
* Develop features in separate branches.
* Use descriptive commit messages.
* Test changes before merging into `main`.
* Keep secrets and API keys out of the repository.
* Document setup instructions and environment variables in README.md.

### 6.2 Quality Assurance (QA)

Testing will cover:

* Registration and login.
* Invalid credentials and password changes.
* User and Owner authorization.
* Research thread retrieval and content management.
* Bookmark creation and removal.
* Subscription activation and status.
* Free and Premium AI usage restrictions.
* External API failures and invalid responses.
* Input validation and error handling.

### 6.3 Security

* Store passwords as secure hashes.
* Validate authentication tokens.
* Enforce Owner permissions on the backend.
* Prevent users from modifying other users' data.
* Validate subscription status and Premium limits on the backend.
* Protect API credentials and sensitive configuration.
* Return appropriate HTTP status codes and error messages.

### 6.4 Implementation and Testing Principle

This document defines the intended technical design. Features that are not implemented must remain identified as planned rather than completed. All endpoint names, database fields, and flows must be updated to match the final implementation.

## 7. Post-MVP Improvements

* Real payment processing.
* Interactive physics simulations.
* Additional research integrations.
* Advanced subscription management.
* Streaks and achievements.
* Additional languages and accessibility improvements.
