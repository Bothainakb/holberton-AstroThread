import Button from '../../components/Button/Button'
import DataChart from '../../components/DataChart/DataChart'
import ResearchThreadCard from '../../components/ResearchThreadCard/ResearchThreadCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import SectionHeader from '../../components/SectionHeader/SectionHeader'
import Tag from '../../components/Tag/Tag'
import Timeline from '../../components/Timeline/Timeline'
import {
  blackHoleMassData,
  blackHoleTimeline,
  popularTopics,
  researchThreads,
} from '../../data/home'
import { routes } from '../../router/router'
import './HomePage.css'

function HomePage() {
  return (
    <main className="home">
      <section className="home-hero container" aria-labelledby="home-hero-title">
        <Tag className="home-hero__label">Astronomy &amp; Physics Research</Tag>
        <h1 className="home-hero__title" id="home-hero-title">
          Explore the Universe
        </h1>
        <p className="home-hero__description">
          Explore the evolution of scientific discoveries. Follow research threads that connect
          ideas, observations and discoveries over time.
        </p>

        <div className="home-hero__search" id="search">
          <SearchBar />
        </div>

        <div className="home-hero__actions">
          <Button href={routes.researchThreads}>Explore Research</Button>
          <Button variant="secondary" href="#latest-discoveries">
            View Timeline
          </Button>
        </div>

        <div className="home-hero__popular">
          <span className="home-hero__popular-label">Popular:</span>
          {popularTopics.map((topic) => (
            <Tag key={topic} href="#">
              {topic}
            </Tag>
          ))}
        </div>
      </section>

      <section className="home-threads container" aria-labelledby="research-threads">
        <SectionHeader
          id="research-threads"
          title="Research Threads"
          subtitle="Research connects ideas, observations, and discoveries."
          action={
            <Button variant="secondary" href={routes.researchThreads}>
              View all threads
            </Button>
          }
        />
        <div className="home-threads__grid">
          {researchThreads.map((thread) => (
            <ResearchThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      </section>

      <section className="home-latest container" aria-labelledby="latest-discoveries">
        <SectionHeader
          id="latest-discoveries"
          title="Latest Discoveries"
          subtitle="Black Holes thread: from the first observation to the latest research."
        />
        <div className="home-latest__timeline">
          <Timeline events={blackHoleTimeline} />
        </div>
      </section>

      <section className="home-data container" aria-labelledby="home-data-title">
        <div className="home-data__content">
          <Tag>Data</Tag>
          <h2 className="home-data__title" id="home-data-title">
            See the data behind every discovery
          </h2>
          <p className="home-data__description">
            Each research thread includes the measurements and trends that shaped it, shown in
            clear charts.
          </p>
          <Button className="home-data__button" href={routes.researchThreads}>
            Explore Research
          </Button>
        </div>

        <DataChart title="Black Hole Mass" note="Illustrative data" data={blackHoleMassData} />
      </section>
    </main>
  )
}

export default HomePage
