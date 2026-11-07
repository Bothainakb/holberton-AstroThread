
import { useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import {
  popularTopics,
  type PopularTopic,
} from "../../data/popularTopics";
import "./HomePage.css";

interface HomePageProps {
  onSearch?: (query: string) => void;
  searchPath?: string;
}

function buildSearchHref(searchPath: string, query: string): string {
  if (!query) {
    return searchPath;
  }

  const params = new URLSearchParams({ q: query });
  return `${searchPath}?${params.toString()}`;
}

export function HomePage({ onSearch, searchPath = "/search" }: HomePageProps) {
  const [query, setQuery] = useState("");

  function runSearch(searchQuery: string) {
    const trimmedQuery = searchQuery.trim();

    if (onSearch) {
      onSearch(trimmedQuery);
      return;
    }

    window.location.assign(buildSearchHref(searchPath, trimmedQuery));
  }

  function handleTopicSelect(topic: PopularTopic) {
    setQuery(topic.query);
    runSearch(topic.query);
  }

  return (
    <div className="home-page">
      <SiteHeader />

      <main className="home-page__main">
        <section className="home-page__hero" aria-labelledby="home-page-title">
          <div className="home-page__content">
            <h1 id="home-page-title" className="home-page__title">
              Explore the universe, one thread at a time
            </h1>

            <p className="home-page__description">
              Search astronomy and physics topics and research papers.
            </p>

            <div className="home-page__search">
              <SearchBox
                value={query}
                onValueChange={setQuery}
                onSearch={runSearch}
              />
            </div>

            <div className="home-page__topics">
              <PopularTopics
                topics={popularTopics}
                onTopicSelect={handleTopicSelect}
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
