### User Stories and Mockups

### User Stories:
| Priority | user | story |
| --- | --- | --- |
| Must | As a student | I want to browse and search research threads, so that I can explore scientific topics in an organized way. |
| Must | As a user |  I want to open a thread and see its overview and related papers, so that I can follow a topic from its origin to recent work. |
| Must | As a user | I want to view a timeline of discoveries, so that I can understand how a scientific idea developed over time. |
| Must | As a user |  I want to explore scientific data through interactive charts, so that I can understand it visually. |
| Must | As a user | I want to see astronomy images and data from NASA linked to a topic, so that the content feels concrete. |
| Must | As a visitor | I want to register and log in -> so that my activity and progress are saved. |
| Should | As a user | I want to search for related research and authors , so that a thread connects to real scientific sources. |
| Should | As a user | I want to filter threads by category (e.g. black holes, exoplanets), so that I can find topics that interest me. |
| Should | As a user | I want to try an interactive simulation of an astronomy or physics concept, so that I can learn by experimenting. |
| Could | As a learner | I want a daily learning streak, so that I stay motivated to come back. |
| Could | As a user | I want to bookmark threads, so that I can return to them quickly. |
| Won't | AI Research Copilot, AI-generated summaries, arXiv integration, p444ersonal research collections, educational games (future enhancements — depend on the AI API and features not in this MVP). |

## Mockups : 

Home — navbar, search bar, featured thread cards.

 Research Threads — search + category filter, grid of thread cards.

 Thread Details — tabs: Overview / Timeline / Related Papers.
  
  Research Timeline — vertical timeline, year + event + description
  
 Data Visualization — chart with basic controls (dropdown/slider)

 NASA Media Panel — image/data card tied to a thread's topic (replaces the old "Copilot panel" idea)

Login / Sign Up — simple centered form
One-line summary for your doc: User → React frontend → Flask REST API → PostgreSQL (via SQLAlchemy) and, for external data, → NASA / OpenAlex APIs, with responses flowing back the same path.
