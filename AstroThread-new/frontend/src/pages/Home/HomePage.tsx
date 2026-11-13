import { useState } from "react";
import logoIcon from "../../assets/brand/astrothread-icon.svg";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { RecentSearches } from "../../components/RecentSearches/RecentSearches";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import type { PopularTopic } from "../../data/popularTopics";
import { navigate, routes } from "../../lib/router";
import { useRecentSearches } from "../../lib/recentSearches";
import "./HomePage.css";

function buildSearchHref(query: string): string {
  if (!query) {
    return routes.search;
  }

  const params = new URLSearchParams({ q: query });
  return `${routes.search}?${params.toString()}`;
}

export function HomePage() {
  const [query, setQuery] = useState("");
  const recentSearches = useRecentSearches();

  function runSearch(searchQuery: string) {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery) {
      recentSearches.add(trimmedQuery);
    }

    navigate(buildSearchHref(trimmedQuery));
  }

  function handleTopicSelect(topic: PopularTopic) {
    setQuery(topic.query);
    runSearch(topic.query);
  }

  function handleRecentSelect(recentQuery: string) {
    setQuery(recentQuery);
    runSearch(recentQuery);
  }

  return (
    <div className="home-page">
      <SiteHeader />

      <main className="home-page__main">
        <section className="home-page__hero" aria-labelledby="home-page-title">
          <div className="home-page__content">
            <div className="home-page__brand">
              <img
                className="home-page__logo"
                src={logoIcon}
                alt=""
                width={72}
                height={72}
              />
              <h1 id="home-page-title" className="home-page__title">
                AstroThread
              </h1>
              <p className="home-page__product">Research Explorer</p>
            </div>

            <p className="home-page__tagline">Explore Beyond Knowledge</p>

            <div className="home-page__search">
              <SearchBox
                size="large"
                value={query}
                onValueChange={setQuery}
                onSearch={runSearch}
                placeholder="Search papers and topics"
              />
            </div>

            <div className="home-page__topics">
              <PopularTopics onTopicSelect={handleTopicSelect} />
            </div>

            <div className="home-page__recent">
              <RecentSearches
                searches={recentSearches.searches}
                onSelect={handleRecentSelect}
                onRemove={recentSearches.remove}
                onClear={recentSearches.clear}
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}