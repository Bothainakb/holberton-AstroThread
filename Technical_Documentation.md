### User Stories and Mockups

### User Stories:
| Priority | User Type | Story |
| --- | --- | --- |
| Must | Student | I want to browse and search research threads, so that I can explore scientific topics in an organized way. |
| Must | Researcher | I want to ask an AI assistant about a research topic or paper, so that i can understand complex scientific information more easily. |
| Must | User |  I want to open a thread and see its overview and related papers, so that I can follow a topic from its origin to recent work. |
| Must | User | I want to view a timeline of discoveries, so that I can understand how a scientific idea developed over time. |
| Must | Researcher |  I want to explore scientific data through interactive charts, so that I can understand it visually. |
| Must | User | I want to see astronomy images and data from NASA linked to a topic, so that the content feels concrete. |
| Must | Visitor | I want to register and log in so that my activity and progress are saved. |
| Should | Researcher | I want to search for related research and authors, so that a thread connects to real scientific sources. |
| Should | User | I want to filter threads by category (e.g. black holes, exoplanets), so that I can find topics that interest me. |
| Should | Learner | I want to try an interactive simulation of an astronomy or physics concept, so that I can learn by experimenting. |
| Could | Learner | I want a daily learning streak, so that I stay motivated to come back. |
| Could | User | I want to bookmark threads, so that I can return to them quickly. |
| Won't | User | I won't edit or modify research data. |

## Mockups : 

Home: navbar, search bar, featured thread cards.

Research Threads: search with category filters, grid of thread cards, interactive elements.

Thread Details: Overview / Timeline / Related Papers tabs.

Research Timeline: vertical timeline ( year + event + description).

Data Visualization: chart with basic controls (dropdown/slider).

NASA Media Panel: image/data card tied to a thread's topic.

AI Research Assistant: AI interface for asking questions and receiving explanations about research papers retrieved from OpenAlex.

Login / Sign Up: simple centered form with email and password.
 

## System Flow: 

Standard request: User ↔ React Frontend ↔ Flask REST API ↔ PostgreSQL.

Authentication: User → React Frontend → Flask REST API (verifies credentials + issues JWT) → React Frontend (stores token, sends it with future requests).

NASA data request: User → React Frontend → Flask REST API → NASA API → Flask REST API → React Frontend.

OpenAlex research request: User → React Frontend → Flask REST API → OpenAlex API → Flask REST API → React Frontend.

AI explanation requests : User → React Frontend → Flask REST API → OpenAlex API (retrieves the paper) → Flask REST API → AI API (summarizes/explains it) → Flask REST API → React Frontend.

