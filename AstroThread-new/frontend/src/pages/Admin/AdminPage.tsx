import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { getAccounts, getCurrentSession } from "../../data/demoAuth";
import {
  deletePaper,
  getPaperStatus,
  getSearchActivity,
  isAccountSuspended,
  isPaperDeleted,
  resetAdminDemo,
  setAccountStatus,
  setPaperStatus,
} from "../../data/demoAdmin";
import type { PaperStatus } from "../../data/demoAdmin";
import { navigate, paperPath, routes } from "../../lib/router";
import type { PaperSummary } from "../../types/research";
import "./AdminPage.css";

type AdminView = "overview" | "papers" | "accounts";
type StatusFilter = "all" | PaperStatus;

const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "papers", label: "Papers" },
  { id: "accounts", label: "Accounts" },
];

const timeFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function matches(text: string, filter: string) {
  return text.toLowerCase().includes(filter.trim().toLowerCase());
}

function Overview({ papers }: { papers: readonly PaperSummary[] }) {
  const accounts = getAccounts();
  const suspended = accounts.filter((account) => isAccountSuspended(account.email)).length;
  const hidden = papers.filter((paper) => getPaperStatus(paper.id) === "hidden").length;
  const activity = getSearchActivity();
  const maxCount = Math.max(1, ...activity.top.map((item) => item.count));

  const stats = [
    { label: "Accounts", value: accounts.length, detail: `${suspended} suspended` },
    { label: "Papers", value: papers.length, detail: `${hidden} hidden` },
    { label: "Searches", value: activity.total, detail: "by signed-in users" },
  ];

  return (
    <>
      <dl className="admin-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stats__item">
            <dt className="admin-stats__label">{stat.label}</dt>
            <dd className="admin-stats__value">{stat.value}</dd>
            <dd className="admin-stats__detail">{stat.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="admin-columns">
        <section className="admin-panel" aria-labelledby="admin-top-title">
          <h2 id="admin-top-title" className="admin-panel__title">
            Most searched
          </h2>
          {activity.top.length === 0 ? (
            <p className="admin-panel__empty">No searches yet.</p>
          ) : (
            <ol className="admin-top">
              {activity.top.map((item) => (
                <li key={item.query} className="admin-top__item">
                  <a className="admin-link" href={searchHref(item.query)}>
                    {item.query}
                  </a>
                  <span className="admin-top__bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                  </span>
                  <span className="admin-top__count">{item.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="admin-recent-title">
          <h2 id="admin-recent-title" className="admin-panel__title">
            Recent searches
          </h2>
          {activity.recent.length === 0 ? (
            <p className="admin-panel__empty">No searches yet.</p>
          ) : (
            <ul className="admin-recent">
              {activity.recent.map((item, index) => (
                <li key={`${item.at}-${index}`} className="admin-recent__item">
                  <a className="admin-link" href={searchHref(item.query)}>
                    {item.query}
                  </a>
                  <span className="admin-recent__time">{timeFormat.format(new Date(item.at))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function PapersView({ papers, onChange }: { papers: readonly PaperSummary[]; onChange: () => void }) {
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const rows = papers.filter((paper) => {
    const paperStatus = getPaperStatus(paper.id);
    return (
      (status === "all" || paperStatus === status) &&
      (matches(paper.title, filter) || matches(paper.topic, filter))
    );
  });

  return (
    <section aria-labelledby="admin-papers-title">
      <h2 id="admin-papers-title" className="visually-hidden">
        Papers
      </h2>
      <p className="admin-note">
        Papers only enter AstroThread through a user’s search. You can hide a paper or delete it, but
        not add one.
      </p>

      <div className="admin-controls">
        <label className="admin-field">
          <span className="visually-hidden">Filter papers</span>
          <input
            className="admin-input"
            type="search"
            placeholder="Filter by title or topic"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span className="visually-hidden">Status</span>
          <select
            className="admin-input admin-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="admin-panel__empty">No papers match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Paper</th>
                <th scope="col">Year</th>
                <th scope="col">Topic</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((paper) => {
                const paperStatus = getPaperStatus(paper.id);
                const isConfirming = confirmingId === paper.id;

                return (
                  <tr key={paper.id}>
                    <td className="admin-table__title">
                      {paperStatus === "visible" ? (
                        <a className="admin-link" href={paperPath(paper.id)}>
                          {paper.title}
                        </a>
                      ) : (
                        paper.title
                      )}
                    </td>
                    <td>{paper.year > 0 ? paper.year : "—"}</td>
                    <td>{paper.topic}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${paperStatus}`}>
                        {paperStatus === "visible" ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {isConfirming ? (
                          <>
                            <Button
                              className="admin-button admin-button--danger"
                              onClick={() => {
                                deletePaper(paper.id);
                                setConfirmingId(null);
                                onChange();
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="secondary"
                              className="admin-button"
                              onClick={() => setConfirmingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              className="admin-button"
                              aria-label={`${paperStatus === "visible" ? "Hide" : "Show"} ${paper.title}`}
                              onClick={() => {
                                setPaperStatus(paper.id, paperStatus === "visible" ? "hidden" : "visible");
                                onChange();
                              }}
                            >
                              {paperStatus === "visible" ? "Hide" : "Show"}
                            </Button>
                            <Button
                              variant="secondary"
                              className="admin-button admin-button--danger-outline"
                              aria-label={`Delete ${paper.title}`}
                              onClick={() => setConfirmingId(paper.id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AccountsView({ onChange }: { onChange: () => void }) {
  const [filter, setFilter] = useState("");
  const rows = getAccounts().filter(
    (account) => matches(account.fullName, filter) || matches(account.email, filter),
  );

  return (
    <section aria-labelledby="admin-accounts-title">
      <h2 id="admin-accounts-title" className="visually-hidden">
        Accounts
      </h2>
      <p className="admin-note">
        A suspended account can’t log in until you reactivate it. Admin accounts can’t be suspended.
      </p>

      <div className="admin-controls">
        <label className="admin-field">
          <span className="visually-hidden">Filter accounts</span>
          <input
            className="admin-input"
            type="search"
            placeholder="Filter by name or email"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="admin-panel__empty">No accounts match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => {
                const suspended = isAccountSuspended(account.email);
                const isAdmin = account.accountType === "admin";

                return (
                  <tr key={account.email}>
                    <td className="admin-table__title">{account.fullName}</td>
                    <td className="admin-table__email">{account.email}</td>
                    <td>{isAdmin ? "Admin" : "User"}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${suspended ? "suspended" : "active"}`}>
                        {suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {isAdmin ? (
                          <span className="admin-muted">—</span>
                        ) : (
                          <Button
                            variant="secondary"
                            className={suspended ? "admin-button" : "admin-button admin-button--danger-outline"}
                            aria-label={`${suspended ? "Reactivate" : "Suspend"} ${account.fullName}`}
                            onClick={() => {
                              setAccountStatus(account.email, suspended ? "active" : "suspended");
                              onChange();
                            }}
                          >
                            {suspended ? "Reactivate" : "Suspend"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* Page */

export function AdminPage() {
  const [session] = useState(getCurrentSession);
  const [view, setView] = useState<AdminView>("overview");
  const [query, setQuery] = useState("");
  const [allPapers, setAllPapers] = useState<PaperSummary[] | null>(null);
  const [, setVersion] = useState(0);
  const isAdmin = session?.accountType === "admin";

  useEffect(() => {
    document.title = "Admin dashboard | AstroThread";
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;

    import("../../services/search/sampleSearchData").then(({ samplePapers }) => {
      if (active) {
        setAllPapers([...samplePapers]);
      }
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed) {
      navigate(searchHref(trimmed));
    }
  }

  const refresh = () => setVersion((value) => value + 1);
  const papers = (allPapers ?? []).filter((paper) => !isPaperDeleted(paper.id));

  let content;

  if (!isAdmin) {
    content = (
      <EmptyState
        headingLevel="h1"
        title="You don’t have access to this page"
        description="The admin dashboard is only for AstroThread admins."
        actions={
          <a className="button button--secondary" href={routes.home}>
            Go to home
          </a>
        }
      />
    );
  } else {
    content = (
      <div className="admin">
        <h1 className="admin__title">Admin dashboard</h1>
        <p className="admin__lead">Watch what people search for and manage papers and accounts.</p>

        <div className="admin__bar">
          <p className="admin__sample">Sample data. The admin endpoints aren’t connected yet.</p>
          <div className="admin-switch" role="group" aria-label="View">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="admin-switch__button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {allPapers === null ? (
          <p className="admin-panel__empty" role="status">
            Loading…
          </p>
        ) : (
          <>
            {view === "overview" && <Overview papers={papers} />}
            {view === "papers" && <PapersView papers={papers} onChange={refresh} />}
            {view === "accounts" && <AccountsView onChange={refresh} />}
          </>
        )}

        <div className="admin__foot">
          <span>Demo changes are saved in this browser only.</span>
          <button
            type="button"
            className="admin__reset"
            onClick={() => {
              resetAdminDemo();
              refresh();
            }}
          >
            Reset hidden, deleted and suspended
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
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

      <main className="admin-page__main">{content}</main>

      <SiteFooter />
    </div>
  );
}