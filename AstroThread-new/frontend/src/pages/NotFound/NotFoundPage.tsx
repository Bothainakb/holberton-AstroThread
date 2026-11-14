import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { navigate, routes } from "../../lib/router";
import "./NotFoundPage.css";

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

export function NotFoundPage() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Page not found | AstroThread";
  }, []);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed) {
      navigate(searchHref(trimmed));
    }
  }

  return (
    <div className="not-found-page">
      <SiteHeader
        search={
          <SearchBox
            size="compact"
            value={query}
            onValueChange={setQuery}
            onSearch={runSearch}
          />
        }
      />

      <main className="not-found-page__main">
        <div className="not-found">
          <p className="not-found__code">404</p>
          <h1 className="not-found__title">Page not found</h1>
          <p className="not-found__lead">
            The page you’re looking for doesn’t exist or may have moved. Check the address, or
            search for a topic instead.
          </p>

          <div className="not-found__actions">
            <a className="not-found__link not-found__link--primary" href={routes.home}>
              Go to home
            </a>
            <a className="not-found__link" href={routes.search}>
              Start a search
            </a>
          </div>

          <div className="not-found__topics">
            <PopularTopics title="Try" onTopicSelect={(topic) => runSearch(topic.query)} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}