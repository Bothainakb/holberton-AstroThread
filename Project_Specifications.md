### Project Objectives
 Purpose:
AstroThread exists to make astronomy and physics research approachable and engaging, thus turning scientific papers into interactive Research Threads, complete with timelines, data visualizations, and AI-assisted explanations, that any curious user can explore.

 SMART Objectives:
1. Build and launch the MVP
Develop and launch an MVP of AstroThread within 3 months, allowing users to explore 5 topics in astronomy and physics through Research Threads.
Measured by: Is the MVP built? Can a user actually use it? Does it cover 5 topics?

2. Make the content interactive
Add a Research Timeline and Data Visualization to those same 5 topics before the project ends, so the content is interactive rather than purely written research.
 Timeline: how the idea or discovery developed over time
 Data Visualization: the data presented visually (charts, graphs)
 If time allows: a small simulation or interactive challenge

3. Use AI as a research aid
Integrate one focused AI feature by summarizing and explaining scientific papers so users can understand the research, ready before the final presentation.
  User selects a paper
  Gets a simplified summary
  Can ask about a specific part of the paper
  Gets plain-language explanations of difficult terms

### Stakeholders and Team Roles
Stakeholders:
 Internal    Team members (PM, Team Lead, Frontend, Backend, AI, UI/UX): Design, build, and manage the AstroThread MVP
 
 Internal    Course Supervisor / Tutor: Reviews progress and gives technical and scope guidance
 
 External    End Users (Students & Researchers): Use AstroThread to explore and understand astronomy/physics research

Team Roles:
  Project Manage:  Oversees planning and tracks progress against the 3-month timeline
  
  Team Lea: Facilitates technical decisions (API contracts, Git workflow, DB schem
  
  Frontend Develope:  Builds the React UI: Research Thread pages, Timeline, Visualizations, navition
  
  Backend Develope: Builds the API: Users/Auth, Research Topics, Threads, Papers, AI requests
  
  AI Develope:  Integrates the AI assistant: paper summarization, term explanation, Q&
  
  UI/UX Designe: Designs the interface and user flow: Home- Topic- Thread- Timeline- Visualization- Paper- AI

# 2. Define Scope

## In-Scope

* **Research Threads:** Users can explore 5 selected astronomy and physics topics through connected Research Threads, showing the development of each scientific idea from its origin to current research.

* **Research Timeline:** Each of the 5 topics will include a timeline showing important discoveries and developments over time.

* **Data Visualization:** Scientific data related to the selected topics will be presented using charts, graphs, or other visual formats.

* **Scientific Papers:** Users can access information about relevant scientific papers and their original sources.

* **AI Research Assistant:** A focused AI feature will help users understand scientific papers by providing simplified summaries, explaining difficult terms, and answering questions about specific parts of a paper.

* **Interactive Element:** If time allows, the MVP may include a small simulation or interactive challenge related to a scientific topic.

* **React User Interface:** The frontend will provide the main navigation flow from Home → Topic → Research Thread → Timeline → Visualization → Paper → AI.

* **Backend and API:** The backend will support research topics, threads, papers, users/authentication where required, and AI requests.

## Out-of-Scope

* A separate mobile application.
* A full subscription and payment system.
* A social networking system for users.
* Covering a large number of scientific topics beyond the initial 5.
* Building a custom AI model from scratch.
* Advanced processing of papers uploaded directly by users.
* A complete simulation engine.
* Advanced gamification systems such as leaderboards, badges, and complex levels.
* Complex web scraping from many scientific sources.
* Full bilingual Arabic/English support if it affects the 3-month development timeline.

The team will focus on the features required for the MVP and postpone additional features that could increase the project scope or affect completion within the three-month timeline.

# 3. Identify Risks

| **Risk**                                                                                                                                       | **Mitigation**                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time Constraints** — The team may not complete all planned features within the 3-month timeline.                                             | Prioritize the MVP features and divide the work according to the existing team roles. Postpone non-essential features if necessary.          |
| **Scope Creep** — New features or ideas may continuously be added during development.                                                          | Keep the In-Scope and Out-of-Scope lists clear and require the team to agree before adding new features.                                     |
| **Scientific API/Data Availability** — Required scientific APIs or datasets may be difficult to access, limited, or change during development. | Test APIs early, use reliable sources, and prepare alternative datasets when possible.                                                       |
| **AI Integration Complexity** — The AI assistant may take longer to integrate than expected.                                                   | Start with one focused AI function, such as paper summarization or explaining scientific terms, instead of building a complex AI system.     |
| **Scientific Data Quality** — Data may be incomplete, inconsistent, or difficult to verify.                                                    | Use reliable scientific sources and verify datasets before adding them to the platform.                                                      |
| **Frontend/Backend Integration** — Individual features may work separately but encounter problems when connected.                              | Define API contracts early and integrate the frontend and backend continuously throughout development.                                       |
| **Team Coordination** — Delays or difficulties in one role may affect other team members.                                                      | Clearly divide responsibilities between the Project Manager, Team Lead, Frontend, Backend, AI, and UI/UX roles and regularly track progress. |
| **Git/Merge Conflicts** — Multiple team members working on the codebase may create conflicts.                                                  | Use branches, Pull Requests, and a clear Git workflow.                                                                                       |
| **Interactive Feature Complexity** — A simulation or interactive challenge may require more development time than expected.                    | Keep it optional and use a simple interactive element if enough time remains after the core MVP is completed.                                |
| **Deployment Problems** — The application may work locally but have issues after deployment.                                                   | Test deployment before the final stage and make sure the Frontend, Backend, Database, APIs, and environment variables work together.         |

