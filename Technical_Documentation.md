### User Stories and Mockups
1 Must As a student : I want to browse and search research threads, so that I can explore scientific topics in an organized way.

2 Must As a user : I want to open a thread and see its overview and related papers, so that I can follow a topic from its origin to recent work.

3 Must As a user : I want to view a timeline of discoveries, so that I can understand how a scientific idea developed over time.

4 Must As a user : I want to explore scientific data through interactive charts, so that I can understand it visually.

5 Must As a user : I want to see astronomy images and data from NASA linked to a topic, so that the content feels concrete.

6 Must As a visitor : I want to register and log in -> so that my activity and progress are saved.

7 Should As a user : I want to search for related research and authors , so that a thread connects to real scientific sources.

8 Should As a user : I want to filter threads by category (e.g. black holes, exoplanets), so that I can find topics that interest me.

9 Should As a user : I want to try an interactive simulation of an astronomy or physics concept, so that I can learn by experimenting.

10 Could As a learner : I want a daily learning streak, so that I stay motivated to come back.

11 Could As a user : I want to bookmark threads, so that I can return to them quickly.

12 Won't : AI Research Copilot, AI-generated summaries, arXiv integration, p444ersonal research collections, educational games (future enhancements — depend on the AI API and features not in this MVP).

1. Home — navbar, search bar, featured thread cards
2. Research Threads — search + category filter, grid of thread cards
3. Thread Details — tabs: Overview / Timeline / Related Papers
4. Research Timeline — vertical timeline, year + event + description
5. Data Visualization — chart with basic controls (dropdown/slider)
6. NASA Media Panel — image/data card tied to a thread's topic (replaces the old "Copilot panel" idea)
7. Login / Sign Up — simple centered form
One-line summary for your doc: User → React frontend → Flask REST API → PostgreSQL (via SQLAlchemy) and, for external data, → NASA / OpenAlex APIs, with responses flowing back the same path.
