# AstroThread: Stage 3 Technical Documentation

## 1. User Stories

AstroThread is a website for exploring astronomy and physics research through connected research threads. The stories below are ranked using MoSCoW prioritization. Must and Should stories form the MVP.

| Priority | User Type  | Story                                                                                                                         |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Must     | Visitor    | I want to register and log in, so that my bookmarks and profile are saved.                                                    |
| Must     | Student    | I want to browse and search research threads, so that I can explore scientific topics in an organized way.                    |
| Must     | Student    | I want to open a thread and see its overview and related papers, so that I can follow a topic from its origin to recent work. |
| Must     | Student    | I want to view a timeline of discoveries, so that I can understand how a scientific idea developed over time.                 |
| Must     | Student    | I want to see astronomy images and data from NASA linked to a topic, so that the content feels concrete.                      |
| Must     | Researcher | I want to explore scientific data through interactive charts, so that I can understand it visually.                           |
| Must     | Researcher | I want to ask an AI assistant about a research paper, so that I can understand complex scientific information more easily.    |
| Should   | Student    | I want to filter threads by category, for example black holes or exoplanets, so that I can find topics that interest me.      |
| Should   | Researcher | I want to see related papers and their authors, so that a thread connects to real scientific sources.                         |
| Should   | Student    | I want to bookmark threads and see them on my profile, so that I can return to them quickly.                                  |
| Could    | Student    | I want to try an interactive simulation of an astronomy or physics concept, so that I can learn by experimenting.             |
| Could    | Student    | I want a daily learning streak, so that I stay motivated to come back.                                                        |
| Won't    | All users  | Users cannot edit or modify research data; all research content is read-only.                                                 |

---

## 2. Mockups

AstroThread contains eight main web pages. The Research Timeline and NASA Media are panels inside the Thread Details page rather than separate pages. Every page shares the same navigation and visual system.

| Page or Panel         | Type  | Contents                                                                                          |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| Home                  | Page  | Navbar, search bar, featured research thread cards.                                               |
| Research Threads      | Page  | Search, category filters, and a grid of research thread cards with bookmark icons.                |
| Thread Details        | Page  | Overview, Timeline and Related Papers tabs, plus the NASA media panel.                            |
| Research Timeline     | Panel | Vertical timeline showing year, event, and description.                                           |
| NASA Media Panel      | Panel | Astronomy images and scientific data related to the thread.                                       |
| Data Visualization    | Page  | Interactive charts with basic controls such as dropdowns and sliders.                             |
| AI Research Assistant | Page  | Chat interface for asking questions about a research paper.                                       |
| Login / Sign Up       | Page  | Centered authentication form with email and password and a switch between login and registration. |
| Profile               | Page  | User details and bookmarked research threads.                                                     |

Pages that depend on NASA, OpenAlex, or the AI provider include loading, error, and empty states because external services may be unavailable or slow.

---

# 3. System Architecture

AstroThread uses four main layers:

1. React frontend
2. Flask REST API
3. PostgreSQL database
4. External APIs

The browser communicates with the React frontend. The frontend communicates with the Flask REST API. Only the backend communicates directly with PostgreSQL and external APIs.

```text
User
  |
  v
React Frontend
  |
  | HTTPS / JSON
  v
Flask REST API
  |
  +--------------------+
  |                    |
  v                    v
PostgreSQL          External APIs
                    /     |      \
                 NASA  OpenAlex  AI Provider
```

---

## 3.1 Frontend — React Website

| Part              | Contents                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Web pages         | Home, Research Threads, Thread Details, Data Visualization, AI Assistant, Login, and Profile.                                              |
| UI components     | Navbar, search bar, category chips, thread cards, tabs, timeline items, chart cards, NASA media cards, bookmark buttons, and chat bubbles. |
| State and routing | React Router for navigation and authentication state for the logged-in user and JWT.                                                       |
| API client        | Sends requests to the Flask backend as JSON and attaches the JWT to protected requests.                                                    |

---

## 3.2 Backend — Python / Flask REST API

Every request passes through middleware and then reaches the appropriate feature module. Feature modules use the data access layer to communicate with PostgreSQL or external services.

| Part           | Item                 | Responsibility                                                               |
| -------------- | -------------------- | ---------------------------------------------------------------------------- |
| Middleware     | Authentication       | Verifies JWT tokens on protected routes.                                     |
| Middleware     | Request validation   | Rejects missing or malformed input.                                          |
| Middleware     | Error handling       | Returns errors using appropriate HTTP status codes and JSON responses.       |
| Feature module | Auth                 | Registration, login, password hashing, and JWT creation.                     |
| Feature module | Users                | User profile information.                                                    |
| Feature module | Threads              | Listing, searching, filtering, and retrieving research threads.              |
| Feature module | Papers               | Retrieving and managing papers related to threads.                           |
| Feature module | Timeline             | Retrieving timeline events for research threads.                             |
| Feature module | Visualization        | Retrieving datasets used by charts.                                          |
| Feature module | AI Assistant         | Retrieving papers and requesting AI explanations.                            |
| Feature module | Bookmarks            | Creating, retrieving, and removing saved threads.                            |
| Data access    | Database queries     | Reads and writes PostgreSQL data.                                            |
| Data access    | External API clients | Communicates with NASA, OpenAlex, and the AI provider.                       |
| Data access    | Caching              | Caches external API responses where appropriate to reduce repeated requests. |

---

## 3.3 External APIs

| API             | Supplies                                | Used By                                |
| --------------- | --------------------------------------- | -------------------------------------- |
| NASA APIs       | Astronomy images and scientific data.   | Thread Details and Data Visualization. |
| OpenAlex API    | Research papers, authors, and metadata. | Related Papers and AI Assistant.       |
| AI Provider API | Paper explanations and summaries.       | AI Assistant.                          |

---

# 4. Components and Classes

## 4.1 Main Components

The main system components are:

```text
React Frontend
    |
    v
Flask REST API
    |
    +-- Auth Module
    +-- User Module
    +-- Research Thread Module
    +-- Paper Module
    +-- Timeline Module
    +-- Visualization Module
    +-- AI Assistant Module
    +-- Bookmark Module
    |
    v
Data Access Layer
    |
    +-- PostgreSQL
    +-- NASA API
    +-- OpenAlex API
    +-- AI Provider API
```

---

## 4.2 Domain Classes

The main domain classes represent the core entities of AstroThread.

### User

**Attributes:**

* id
* name
* email
* password_hash
* created_at

**Responsibilities:**

* Store account information.
* Authenticate through the Auth module.
* Own bookmarks.

### ResearchThread

**Attributes:**

* id
* title
* category
* summary
* is_featured
* created_at

**Responsibilities:**

* Represent a connected astronomy or physics research topic.
* Connect to timeline events, papers, and chart datasets.

### ResearchPaper

**Attributes:**

* id
* openalex_id
* title
* authors
* publication_year
* abstract
* url

**Responsibilities:**

* Store research paper metadata retrieved from OpenAlex.
* Connect papers to research threads.
* Provide content for the AI Assistant.

### TimelineEvent

**Attributes:**

* id
* thread_id
* year
* title
* description

**Responsibilities:**

* Represent a scientific discovery or development within a research thread.

### ChartData

**Attributes:**

* id
* thread_id
* title
* chart_type
* dataset

**Responsibilities:**

* Store datasets used for interactive scientific visualizations.

### Bookmark

**Attributes:**

* id
* user_id
* thread_id
* created_at

**Responsibilities:**

* Represent a user's saved research thread.

### ThreadPaper

**Attributes:**

* thread_id
* paper_id

**Responsibilities:**

* Connect research threads and papers in a many-to-many relationship.

---

## 4.3 Class Relationships

```text
User
 |
 | 1
 |------< Bookmark >------1
                            |
                            |
                     ResearchThread
                       |    |     |
                       |    |     |
                       |    |     +------< TimelineEvent
                       |    |
                       |    +------------< ChartData
                       |
                       +------< ThreadPaper >------ResearchPaper
```

Relationship summary:

| Relationship                   | Type         | Meaning                                                                      |
| ------------------------------ | ------------ | ---------------------------------------------------------------------------- |
| User → Bookmark                | One-to-many  | A user can save many threads.                                                |
| ResearchThread → Bookmark      | One-to-many  | A thread can be bookmarked by many users.                                    |
| ResearchThread → TimelineEvent | One-to-many  | A thread can contain many timeline events.                                   |
| ResearchThread → ChartData     | One-to-many  | A thread can contain many chart datasets.                                    |
| ResearchThread → ResearchPaper | Many-to-many | A thread can contain many papers and a paper can appear in multiple threads. |
| ResearchThread → ThreadPaper   | One-to-many  | ThreadPaper acts as the linking entity.                                      |
| ResearchPaper → ThreadPaper    | One-to-many  | A paper can be connected to multiple threads.                                |

---

# 5. Database Design — PostgreSQL

The PostgreSQL database contains seven tables, with research threads at the centre of the data model.

PK = Primary Key
FK = Foreign Key
UK = Unique Key

| Table            | Columns                                                                    | Purpose                                       |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| users            | id (PK), name, email (UK), password_hash, created_at                       | Stores registered accounts.                   |
| research_threads | id (PK), title, category, summary, is_featured, created_at                 | Stores research threads.                      |
| research_papers  | id (PK), openalex_id (UK), title, authors, publication_year, abstract, url | Stores research paper metadata from OpenAlex. |
| thread_papers    | thread_id (PK, FK), paper_id (PK, FK)                                      | Links research threads and papers.            |
| timeline_events  | id (PK), thread_id (FK), year, title, description                          | Stores timeline events.                       |
| chart_data       | id (PK), thread_id (FK), title, chart_type, dataset (JSONB)                | Stores datasets used for charts.              |
| bookmarks        | id (PK), user_id (FK), thread_id (FK), created_at                          | Stores user bookmarks.                        |

### Database Relationships

| From             | To              | Type                               | Meaning                                                                      |
| ---------------- | --------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| users            | bookmarks       | One-to-many                        | A user can save many research threads.                                       |
| research_threads | bookmarks       | One-to-many                        | A research thread can be saved by many users.                                |
| research_threads | timeline_events | One-to-many                        | A thread contains many timeline events.                                      |
| research_threads | chart_data      | One-to-many                        | A thread contains many chart datasets.                                       |
| research_threads | research_papers | Many-to-many through thread_papers | A thread can include many papers, and a paper can appear in several threads. |

---

# 6. System Flows

Every request follows the general path:

```text
User
 ↓
React Frontend
 ↓ HTTPS / JSON
Flask REST API
 ↓
Feature Module
 ↓
PostgreSQL / External API
 ↓
Flask REST API
 ↓
React Frontend
 ↓
User
```

---

## 6.1 Standard Request

Used for threads, timeline, charts, and bookmarks.

1. The user opens a page or performs an action in the React frontend.
2. The API client sends the request to the Flask REST API.
3. The JWT is attached when the route is protected.
4. Middleware checks authentication and validates the request.
5. The appropriate feature module processes the request.
6. The data access layer queries PostgreSQL.
7. The backend returns a JSON response.
8. React renders the result.

---

## 6.2 Authentication

1. The user submits the login or registration form.
2. React sends the email and password to the Flask REST API.
3. The Auth module validates the credentials.
4. For registration, the password is securely hashed before being stored.
5. For login, the stored password hash is checked.
6. The backend issues a JWT after successful authentication.
7. React stores the authentication state and attaches the JWT to protected requests.

---

## 6.3 NASA Data Request

1. The user opens a thread or visualization that requires NASA content.
2. React sends a request to the Flask REST API.
3. The NASA API client checks whether a cached response exists.
4. If cached data exists, it is reused.
5. Otherwise, the backend requests the data from NASA.
6. The backend returns the NASA images or scientific data to React.
7. React displays the content.

If NASA fails or times out, the backend returns an error response and React displays the appropriate error state.

---

## 6.4 OpenAlex Research Request

1. The user opens the Related Papers section or searches for papers.
2. React sends a request to the Flask REST API.
3. The OpenAlex API client retrieves papers and metadata.
4. The backend stores relevant paper metadata in `research_papers`.
5. The backend creates the relationship in `thread_papers`.
6. The API returns the papers to React.
7. React displays the papers and authors.

---

## 6.5 AI Explanation Request

1. The user selects a research paper and asks a question.
2. React sends the paper ID and question to the Flask REST API.
3. The AI Assistant module retrieves the paper from `research_papers`.
4. If required, the backend retrieves missing paper information from OpenAlex.
5. The backend sends the paper content and user question to the AI provider.
6. The AI provider returns an explanation.
7. The backend returns the explanation to React.
8. React displays the explanation in the AI Assistant.

The AI Assistant is restricted to astronomy, astrophysics, space science, and the research content supported by AstroThread.

---

# 7. Sequence Diagrams — Key Interactions

The following sequence diagrams represent the main MVP interactions.

## 7.1 Student Browses and Searches Research Threads

**Participants:**
Student → Frontend → Backend/API → Database

Main flow:

1. Student opens Research Threads.
2. Frontend sends `GET /research-threads`.
3. Backend retrieves threads from PostgreSQL.
4. Database returns the threads.
5. Backend returns `200 OK`.
6. Frontend displays the thread cards.
7. Student enters a search query.
8. Frontend sends `GET /research-threads?query={topic}`.
9. Backend searches the available threads.
10. Database returns matching threads and related papers.
11. If results exist, the frontend displays them.
12. If no results exist, the frontend displays the No Results state.

---

## 7.2 Researcher Uses the AI Assistant

**Participants:**
Researcher → Frontend → Backend/API → Database → AI Provider

Main flow:

1. Researcher selects a research paper.
2. Researcher asks the AI Assistant a question.
3. Frontend sends `POST /ai/explain`.
4. Backend retrieves the paper.
5. Database returns the paper information.
6. Backend sends the paper content and question to the AI provider.
7. AI provider returns the explanation.
8. Backend returns `200 OK`.
9. Frontend displays the explanation.

If the AI provider is unavailable, the backend returns an appropriate error and the frontend displays the error state.

---

## 7.3 User Opens a Research Thread and Explores Its Content

**Participants:**
User → Frontend → Backend/API → PostgreSQL → NASA API

Main flow:

1. User selects a research thread.
2. Frontend sends `GET /research-threads/{id}`.
3. Backend retrieves the thread information.
4. Backend retrieves the timeline events.
5. Backend retrieves related papers.
6. Backend retrieves chart datasets.
7. Backend requests relevant NASA content when required.
8. Backend returns the combined thread information.
9. Frontend displays the overview, timeline, papers, charts, and NASA media.

---

## 7.4 User Login

**Participants:**
User → Frontend → Backend/API → PostgreSQL

Main flow:

1. User enters email and password.
2. Frontend sends `POST /auth/login`.
3. Backend validates the request.
4. Backend retrieves the user from PostgreSQL.
5. Backend verifies the password.
6. Backend creates a JWT.
7. Backend returns `200 OK` with authentication data.
8. Frontend updates the authentication state and redirects the user to the Profile page.

If the credentials are invalid, the backend returns an authentication error and the frontend displays an error message.

---

# 8. API Specifications

AstroThread uses internal REST API endpoints for communication between React and Flask. External APIs are accessed only by the backend.

## 8.1 Internal API Endpoints

| Method | Endpoint                          | Purpose                                    | Authentication |
| ------ | --------------------------------- | ------------------------------------------ | -------------- |
| POST   | `/auth/register`                  | Create a new account.                      | Public         |
| POST   | `/auth/login`                     | Authenticate a user and issue a JWT.       | Public         |
| GET    | `/research-threads`               | List, search, and filter research threads. | Public         |
| GET    | `/research-threads/{id}`          | Retrieve a specific research thread.       | Public         |
| GET    | `/research-threads/{id}/papers`   | Retrieve papers related to a thread.       | Public         |
| GET    | `/research-threads/{id}/timeline` | Retrieve timeline events.                  | Public         |
| GET    | `/research-threads/{id}/charts`   | Retrieve chart datasets.                   | Public         |
| GET    | `/profile`                        | Retrieve the logged-in user's profile.     | JWT            |
| GET    | `/bookmarks`                      | Retrieve the user's saved threads.         | JWT            |
| POST   | `/bookmarks`                      | Save a research thread.                    | JWT            |
| DELETE | `/bookmarks/{thread_id}`          | Remove a saved thread.                     | JWT            |
| POST   | `/ai/explain`                     | Request an AI explanation for a paper.     | JWT            |

## 8.2 External APIs

| External API    | Purpose                                                 |
| --------------- | ------------------------------------------------------- |
| NASA API        | Provides astronomy images and scientific data.          |
| OpenAlex API    | Provides research papers, authors, and metadata.        |
| AI Provider API | Provides explanations and summaries of research papers. |

The backend acts as the intermediary between the frontend and external APIs so that API keys, validation, filtering, caching, and business logic remain on the server.

---

# 9. SCM and QA Plan

## 9.1 Source Control Management

The team uses Git and GitHub for source control.

* Each team member works on a separate feature branch.
* Changes are committed with clear commit messages.
* Pull Requests are used before merging changes into the main branch.
* Team members review changes before merging.
* The main branch should contain stable code.
* The team regularly pulls the latest changes to reduce merge conflicts.

## 9.2 Quality Assurance

Testing will be performed at different levels:

### Backend/API Testing

* Test successful API requests.
* Test invalid input.
* Test authentication and authorization.
* Test missing resources.
* Test external API failures.
* Verify correct HTTP status codes.

### Database Testing

* Verify primary and foreign key relationships.
* Verify unique email and OpenAlex IDs.
* Verify bookmark relationships.
* Verify that invalid relationships cannot be created.

### Frontend Testing

* Test navigation between pages.
* Test search and filtering.
* Test login and registration.
* Test bookmarks.
* Test loading, error, and empty states.
* Test API error handling.

### Integration Testing

Verify that React, Flask, PostgreSQL, and external APIs communicate correctly together.

---

# 10. Technical Justifications

## React

React was selected because AstroThread requires a highly interactive interface with reusable components such as research cards, timelines, charts, tabs, search controls, and chat messages. React also supports component-based development and client-side routing.

## Flask

Flask was selected because it provides a lightweight and flexible way to build the REST API. It works well with Python and provides a clear separation between frontend, business logic, database access, and external API integrations.

## PostgreSQL

PostgreSQL was selected because AstroThread contains structured and related data such as users, research threads, papers, timeline events, charts, and bookmarks. PostgreSQL provides strong relational features, constraints, and support for structured and semi-structured data such as JSONB.

## REST API

A REST API separates the frontend from backend logic. This allows the React frontend and Flask backend to be developed independently while providing a clear way to exchange JSON data.

## NASA API

NASA APIs provide real astronomy images and scientific data that directly support AstroThread's goal of making research topics more concrete and interactive.

## OpenAlex API

OpenAlex provides research papers, authors, and metadata, allowing AstroThread to connect research threads with real scientific sources.

## AI Provider

The AI provider is used to explain complex research papers in simpler language. The backend controls the AI requests and limits the assistant to AstroThread's astronomy and space-related content.

## PostgreSQL Relationships

The relational database design was chosen because several entities have clear relationships. For example, research threads have many timeline events and papers can belong to multiple threads. A linking table such as `thread_papers` handles the many-to-many relationship cleanly.

---

# 11. Team Learning Progress

During Stage 3, the team developed their understanding of:

* Translating user stories into technical system requirements.
* Designing system architecture and identifying component responsibilities.
* Understanding how React communicates with Flask through REST APIs.
* Designing relational database tables and relationships in PostgreSQL.
* Designing UML sequence diagrams to represent system interactions.
* Working with external APIs such as NASA and OpenAlex.
* Understanding authentication and JWT-based protected routes.
* Using Git and GitHub for collaborative development.
* Planning testing and quality assurance.
* Justifying technical choices based on project requirements and constraints.

Each team member is also expected to explain the parts they worked on and describe what they learned during the project.

---

# 12. After the MVP

The following features are deferred to keep the MVP achievable within the three-month schedule:

| Feature                | Reason for Deferral                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Interactive simulation | It is the most complex feature to build and is not required for the core research-thread experience. |
| arXiv papers           | OpenAlex already provides sufficient paper and metadata coverage for the MVP.                        |
| Learning streak        | It requires additional activity tracking and is not required by the core MVP functionality.          |
