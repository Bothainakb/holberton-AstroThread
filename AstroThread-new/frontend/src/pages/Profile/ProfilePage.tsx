import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { Button } from "../../components/Button/Button";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import {
  DEMO_ADMIN_EMAIL,
  deleteAccount,
  getCurrentSession,
  signOut,
  updateFullName,
} from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth";
import { getMyThread, getReadPaperIds } from "../../data/myThread";
import { navigate, routes } from "../../lib/router";
import { clearRecentSearches, getRecentSearches } from "../../lib/recentSearches";
import "./ProfilePage.css";

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function validateName(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    return `Enter at least ${NAME_MIN_LENGTH} characters.`;
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Use ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  return "";
}

interface AccountDetailsProps {
  session: DemoSession;
  onSaved: (session: DemoSession) => void;
}

function AccountDetails({ session, onSaved }: AccountDetailsProps) {
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState(session.fullName);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isUnchanged = name.trim() === session.fullName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = validateName(name);
    setError(message);
    setSaved(false);

    if (message || isUnchanged) {
      return;
    }

    setIsSaving(true);
    const nextSession = await updateFullName(session.email, name);
    setIsSaving(false);

    setName(nextSession.fullName);
    setSaved(true);
    onSaved(nextSession);
  }

  return (
    <section className="profile__section" aria-labelledby="profile-account-title">
      <h2 id="profile-account-title" className="profile__section-title">
        Account
      </h2>

      <div className="profile__identity">
        <span className="profile__avatar" aria-hidden="true">
          {getInitials(session.fullName)}
        </span>
        <div>
          <p className="profile__identity-name">{session.fullName}</p>
          <p className="profile__identity-type">
            {session.accountType === "admin" ? "Admin account" : "Standard account"}
          </p>
        </div>
      </div>

      {saved && (
        <FormAlert tone="success" title="Profile updated">
          Your name was saved.
        </FormAlert>
      )}

      <form className="profile__form" onSubmit={handleSubmit} noValidate>
        <div className="profile__field">
          <label className="profile__label" htmlFor={nameId}>
            Full name
          </label>
          <input
            id={nameId}
            className="profile__input"
            type="text"
            autoComplete="name"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
              if (error) {
                setError(validateName(event.target.value));
              }
            }}
          />
          {error && (
            <p id={errorId} className="profile__error">
              {error}
            </p>
          )}
        </div>

        <div className="profile__field">
          <span className="profile__label">Email</span>
          <p className="profile__value">{session.email}</p>
          <p className="profile__hint">
            You sign in with a code sent to this email. Changing it will be available later.
          </p>
        </div>

        <div className="profile__actions">
          <Button type="submit" disabled={isSaving || isUnchanged}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

interface ActivitySummaryProps {
  email: string;
}

function ActivitySummary({ email }: ActivitySummaryProps) {
  const thread = getMyThread(email);
  const stats = [
    { label: "Saved topics", value: thread.topics.length },
    { label: "Papers read", value: getReadPaperIds(thread).size },
    { label: "Searches", value: thread.journey.filter((step) => step.type === "search").length },
  ];

  return (
    <section className="profile__section" aria-labelledby="profile-activity-title">
      <h2 id="profile-activity-title" className="profile__section-title">
        Activity
      </h2>

      <dl className="profile__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="profile__stat">
            <dt className="profile__stat-label">{stat.label}</dt>
            <dd className="profile__stat-value">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <a className="profile__link" href={routes.myThread}>
        Open My Thread
      </a>
    </section>
  );
}

function PrivacySettings() {
  const [count, setCount] = useState(() => getRecentSearches().length);
  const [cleared, setCleared] = useState(false);

  function handleClear() {
    clearRecentSearches();
    setCount(0);
    setCleared(true);
  }

  return (
    <section className="profile__section" aria-labelledby="profile-privacy-title">
      <h2 id="profile-privacy-title" className="profile__section-title">
        Privacy
      </h2>

      <div className="profile__row">
        <div>
          <p className="profile__row-title">Recent searches</p>
          <p className="profile__hint">
            {count > 0
              ? `${count} recent ${count === 1 ? "search is" : "searches are"} saved on this device.`
              : "No recent searches are saved on this device."}
          </p>
        </div>
        <Button variant="secondary" onClick={handleClear} disabled={count === 0}>
          Clear search history
        </Button>
      </div>

      <p className="profile__status" role="status">
        {cleared ? "Search history cleared." : ""}
      </p>
    </section>
  );
}

interface AccountActionsProps {
  session: DemoSession;
}

function AccountActions({ session }: AccountActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDemoAdmin = session.email === DEMO_ADMIN_EMAIL;

  function handleSignOut() {
    signOut();
    navigate(routes.home);
  }

  async function handleDelete() {
    setIsDeleting(true);
    await deleteAccount(session.email);
    navigate(routes.home);
  }

  return (
    <section className="profile__section" aria-labelledby="profile-actions-title">
      <h2 id="profile-actions-title" className="profile__section-title">
        Account actions
      </h2>

      <div className="profile__row">
        <div>
          <p className="profile__row-title">Log out</p>
          <p className="profile__hint">Sign out of AstroThread on this device.</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>
          Log out
        </Button>
      </div>

      <div className="profile__row profile__row--danger">
        <div>
          <p className="profile__row-title">Delete account</p>
          <p className="profile__hint">
            {isDemoAdmin
              ? "The demo admin account can’t be deleted."
              : "Permanently delete your account, saved topics and research journey."}
          </p>
        </div>
        {!isConfirming && (
          <Button
            variant="secondary"
            className="profile__danger-button"
            onClick={() => setIsConfirming(true)}
            disabled={isDemoAdmin}
          >
            Delete account
          </Button>
        )}
      </div>

      {isConfirming && (
        <div className="profile__confirm" role="alert">
          <p className="profile__confirm-title">Delete your account?</p>
          <p className="profile__hint">
            This removes {session.email} and all of its My Thread data. You can’t undo this.
          </p>
          <div className="profile__confirm-actions">
            <Button
              className="profile__danger-button profile__danger-button--solid"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Yes, delete my account"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ProfilePage() {
  const [session, setSession] = useState<DemoSession | null>(getCurrentSession);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Profile | AstroThread";
  }, []);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed) {
      navigate(searchHref(trimmed));
    }
  }

  return (
    <div className="profile-page">
      <SiteHeader
        key={session?.fullName ?? "signed-out"}
        search={
          <SearchBox
            size="compact"
            value={query}
            onValueChange={setQuery}
            onSearch={runSearch}
          />
        }
      />

      <main className="profile-page__main">
        <div className="profile">
          {!session ? (
            <div className="profile__signed-out">
              <h1 className="profile__title">Profile</h1>
              <p className="profile__lead">Log in to see your account details and activity.</p>
              <a className="profile__link" href={routes.signIn}>
                Log in
              </a>
            </div>
          ) : (
            <>
              <h1 className="profile__title">Profile</h1>
              <p className="profile__lead">Your account details and research activity.</p>

              <AccountDetails session={session} onSaved={setSession} />
              <ActivitySummary email={session.email} />
              <PrivacySettings />
              <AccountActions session={session} />
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}