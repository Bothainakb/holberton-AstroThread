import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { signOut } from '../../auth/auth'
import Tag from '../../components/Tag/Tag'
import Link from '../../router/Link'
import {
  navigate,
  replacePath,
  replaceSearchParam,
  routes,
  threadDetailsPath,
  useSearchParam,
  withReturnPath,
} from '../../router/router'
import {
  ApiError,
  fetchPaperBookmarks,
  removePaperBookmark,
  type Profile,
  type ProfileChanges,
  type SavedPaper,
  type SavedThread,
} from '../../services/api'
import { isHttpsUrl } from '../../services/chartData'
import {
  describeActivity,
  formatWhen,
  initialsFor,
  lastViewedLabel,
  nameFromEmail,
  progressSummary,
  roleBadge,
  roleLabel,
  type ActivityKind,
} from '../../services/profileFormat'
import ProfileIcon, { type ProfileIconName } from './ProfileIcons'
import { useProfile } from './useProfile'
import './ProfilePage.css'

const MAX_NAME = 100
const MAX_BIO = 300

/** Figma "08-Profile". All data comes from GET /api/profile. */
function ProfilePage() {
  const { state, reload, saveChanges, removeSaved, loadAllSaved } = useProfile()

  // Visitors are sent to Login and come back here afterwards.
  useEffect(() => {
    if (state.status === 'signed-out') replacePath(withReturnPath(routes.login, routes.profile))
  }, [state.status])

  if (state.status === 'loading' || state.status === 'signed-out') {
    return (
      <main className="profile-page" aria-busy="true">
        <p className="profile-status container" role="status">
          Loading your profile…
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="profile-page">
        <div className="profile-status profile-status--error container" role="alert">
          <p>Your profile could not be loaded: {state.message}</p>
          <button type="button" className="profile-button" onClick={reload}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <ProfileContent
      profile={state.profile}
      saveChanges={saveChanges}
      removeSaved={removeSaved}
      loadAllSaved={loadAllSaved}
    />
  )
}

interface ProfileContentProps {
  profile: Profile
  saveChanges: (changes: ProfileChanges) => Promise<string | null>
  removeSaved: (threadId: number) => Promise<string | null>
  loadAllSaved: () => Promise<SavedThread[] | string>
}

function ProfileContent({ profile, saveChanges, removeSaved, loadAllSaved }: ProfileContentProps) {
  const [editing, setEditing] = useState(false)
  // In the URL ("/profile?tab=bookmarks") so a reload or shared link keeps the tab.
  const tab: ProfileTab = useSearchParam(TAB_PARAM) === 'bookmarks' ? 'bookmarks' : 'overview'

  function selectTab(next: ProfileTab) {
    replaceSearchParam(TAB_PARAM, next === 'overview' ? '' : next)
  }

  function openEditor() {
    selectTab('overview')
    setEditing(true)
    requestAnimationFrame(() => document.getElementById('edit-profile')?.scrollIntoView({ block: 'center' }))
  }

  return (
    <main className="profile-page">
      <ProfileHeader profile={profile} onEdit={openEditor} />
      {editing && (
        <EditProfileForm profile={profile} onSave={saveChanges} onClose={() => setEditing(false)} />
      )}
      <PlanBar profile={profile} />
      <ProfileTabs active={tab} bookmarkCount={profile.saved_threads.count} onSelect={selectTab} />

      {tab === 'bookmarks' ? (
        <div role="tabpanel" id="profile-panel-bookmarks" aria-labelledby="profile-tab-bookmarks">
          <BookmarksPanel profile={profile} removeSaved={removeSaved} loadAllSaved={loadAllSaved} />
          <SavedPapers />
        </div>
      ) : (
        <div role="tabpanel" id="profile-panel-overview" aria-labelledby="profile-tab-overview">
          <JourneyStats profile={profile} />
          <SavedThreads
            profile={profile}
            removeSaved={removeSaved}
            onViewAll={() => selectTab('bookmarks')}
          />

          <div className="profile-band">
            <div className="profile-band__inner container">
              <RecentlyExplored profile={profile} />
              <ResearchActivity profile={profile} />
            </div>
          </div>

          <AccountSettings profile={profile} onEdit={openEditor} saveChanges={saveChanges} />
        </div>
      )}
    </main>
  )
}

// ----- Tabs -----

const TAB_PARAM = 'tab'
const PROFILE_TABS = ['overview', 'bookmarks'] as const
type ProfileTab = (typeof PROFILE_TABS)[number]

/** Same tab style as the Tablist in Figma "11-Owner-Dashboard". */
function ProfileTabs({
  active,
  bookmarkCount,
  onSelect,
}: {
  active: ProfileTab
  bookmarkCount: number
  onSelect: (tab: ProfileTab) => void
}) {
  const buttons = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({})

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = PROFILE_TABS[active === 'overview' ? 1 : 0]
    onSelect(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className="profile-tabs container" role="tablist" aria-label="Profile sections" onKeyDown={handleKeyDown}>
      {PROFILE_TABS.map((tab) => (
        <button
          key={tab}
          ref={(element) => {
            buttons.current[tab] = element
          }}
          type="button"
          role="tab"
          id={`profile-tab-${tab}`}
          className="profile-tabs__tab"
          aria-selected={active === tab}
          aria-controls={`profile-panel-${tab}`}
          tabIndex={active === tab ? 0 : -1}
          onClick={() => onSelect(tab)}
        >
          {tab === 'overview' ? 'Overview' : 'Bookmarks'}
          {tab === 'bookmarks' && bookmarkCount > 0 && (
            <span className="profile-tabs__count"> ({bookmarkCount})</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ----- Header -----

function Avatar({ profile }: { profile: Profile }) {
  const { user } = profile
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = user.avatar_url && failed !== user.avatar_url

  return (
    <span className="profile-avatar" aria-hidden="true">
      {showImage ? (
        <img src={user.avatar_url!} alt="" onError={() => setFailed(user.avatar_url)} />
      ) : (
        user.initials || initialsFor(user.name, user.email)
      )}
    </span>
  )
}

function ProfileHeader({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const { user } = profile
  return (
    <section className="profile-header container" aria-labelledby="profile-name">
      <Avatar profile={profile} />
      <div className="profile-header__text">
        <div className="profile-header__title-row">
          <h1 className="profile-header__name" id="profile-name">
            {user.name || nameFromEmail(user.email)}
          </h1>
          <Tag>{roleBadge(user.role)}</Tag>
        </div>
        <p className="profile-header__email">{user.email}</p>
        {user.bio ? (
          <p className="profile-header__bio">{user.bio}</p>
        ) : (
          <p className="profile-header__bio profile-header__bio--empty">
            Add a short description of the research you are exploring.
          </p>
        )}
      </div>
      <button type="button" className="profile-button profile-header__edit" onClick={onEdit}>
        <ProfileIcon name="edit" size={18} />
        Edit Profile
      </button>
    </section>
  )
}

function EditProfileForm({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile
  onSave: (changes: ProfileChanges) => Promise<string | null>
  onClose: () => void
}) {
  const id = useId()
  const [name, setName] = useState(profile.user.name ?? '')
  const [bio, setBio] = useState(profile.user.bio ?? '')
  const [avatar, setAvatar] = useState(profile.user.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setMessage('Name cannot be empty.')
      return
    }
    if (avatar.trim() && !/^https?:\/\/\S+$/.test(avatar.trim())) {
      setMessage('The avatar must be an http(s) link to an image.')
      return
    }
    setSaving(true)
    setMessage(null)
    const error = await onSave({ name: name.trim(), bio: bio.trim() || null, avatar_url: avatar.trim() || null })
    setSaving(false)
    if (error) setMessage(error)
    else onClose()
  }

  return (
    <section className="profile-edit container" id="edit-profile" aria-labelledby={`${id}-title`}>
      <form className="profile-card profile-edit__form" onSubmit={handleSubmit} noValidate>
        <h2 className="profile-edit__title" id={`${id}-title`}>
          Edit Profile
        </h2>
        <label className="profile-field">
          <span className="profile-field__label">Name</span>
          <input
            className="profile-field__input"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="name"
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="profile-field">
          <span className="profile-field__label">Description</span>
          <textarea
            className="profile-field__input profile-field__input--area"
            value={bio}
            maxLength={MAX_BIO}
            rows={3}
            onChange={(event) => setBio(event.target.value)}
          />
          <span className="profile-field__hint">
            {bio.length}/{MAX_BIO}
          </span>
        </label>
        <label className="profile-field">
          <span className="profile-field__label">Avatar link (optional)</span>
          <input
            className="profile-field__input"
            type="url"
            value={avatar}
            placeholder="https://…"
            onChange={(event) => setAvatar(event.target.value)}
          />
        </label>
        {message && (
          <p className="profile-form-error" role="alert">
            {message}
          </p>
        )}
        <div className="profile-edit__actions">
          <button type="submit" className="profile-button profile-button--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="profile-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

// ----- Plan -----

function PlanBar({ profile }: { profile: Profile }) {
  const { plan, user } = profile
  const active = plan.status.toLowerCase() === 'active'
  return (
    <section className="profile-plan container" aria-label="Current plan">
      <dl className="profile-plan__items">
        <div>
          <dt>Current plan</dt>
          <dd>{plan.name}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={active ? 'profile-plan__active' : undefined}>
            {active && <span className="profile-plan__dot" aria-hidden="true" />}
            {plan.status}
          </dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{roleLabel(user.role)}</dd>
        </div>
        <div>
          <dt>AI assistance</dt>
          <dd>{plan.ai_assistance}</dd>
        </div>
      </dl>
      {/* Subscriptions are a "Could" story: the Plans page and Premium demo are not built yet. */}
      <div className="profile-plan__actions">
        <button type="button" className="profile-text-link" disabled title="The Plans page is coming soon">
          View plans
        </button>
        <button
          type="button"
          className="profile-button profile-button--primary"
          disabled
          title="Premium is coming soon"
        >
          Upgrade to Premium
        </button>
      </div>
    </section>
  )
}

// ----- My Research Journey -----

function JourneyStats({ profile }: { profile: Profile }) {
  const { stats } = profile
  const items = [
    {
      label: 'Threads Explored',
      value: stats.threads_explored,
      note: `of ${stats.threads_available} available`,
    },
    { label: 'Papers Read', value: stats.papers_read, note: `${stats.papers_read_this_week} this week` },
    {
      label: 'Discoveries Viewed',
      value: stats.discoveries_viewed,
      note: `${stats.discoveries_viewed_this_week} this week`,
    },
    {
      label: 'Research Stages Completed',
      value: stats.stages_completed,
      note: `of ${stats.stages_total} in your threads`,
    },
  ]

  return (
    <section className="profile-section container" aria-labelledby="journey-title">
      <h2 className="profile-section__title" id="journey-title">
        My Research Journey
      </h2>
      <ul className="profile-stats">
        {items.map((item) => (
          <li key={item.label} className="profile-card profile-stat">
            <span className="profile-stat__label">{item.label}</span>
            <strong className="profile-stat__value">{item.value}</strong>
            <span className="profile-stat__note">{item.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ----- Saved Research Threads -----

/** Runs the removal for one card and reports the outcome in the section's live region. */
function useRemoveSaved(removeSaved: (threadId: number) => Promise<string | null>) {
  const [removing, setRemoving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRemove(thread: SavedThread) {
    setRemoving(thread.id)
    setMessage(null)
    const error = await removeSaved(thread.id)
    setRemoving(null)
    setMessage(error ?? `Removed "${thread.title}" from your saved threads.`)
  }

  return { removing, message, handleRemove }
}

function SavedThreads({
  profile,
  removeSaved,
  onViewAll,
}: {
  profile: Profile
  removeSaved: (threadId: number) => Promise<string | null>
  onViewAll: () => void
}) {
  const { count, items } = profile.saved_threads
  const { removing, message, handleRemove } = useRemoveSaved(removeSaved)

  return (
    <section className="profile-section container" aria-labelledby="saved-title">
      <div className="profile-section__header">
        <h2 className="profile-section__title" id="saved-title">
          Saved Threads
          {count > 0 && <span className="profile-section__count"> ({count})</span>}
        </h2>
        {count > 0 && (
          <button type="button" className="profile-text-link" onClick={onViewAll}>
            View all saved
            <ProfileIcon name="arrow-right" size={18} />
          </button>
        )}
      </div>

      <p className="profile-live" role="status">
        {message}
      </p>

      {items.length === 0 ? (
        <NoBookmarks />
      ) : (
        <SavedThreadList threads={items} removing={removing} onRemove={handleRemove} />
      )}
    </section>
  )
}

/** The Bookmarks tab: every saved thread, from GET /api/bookmarks. */
function BookmarksPanel({
  profile,
  removeSaved,
  loadAllSaved,
}: {
  profile: Profile
  removeSaved: (threadId: number) => Promise<string | null>
  loadAllSaved: () => Promise<SavedThread[] | string>
}) {
  // Null until the first load finishes. The list stays on screen during later
  // reloads (the profile reloads after every removal), so it does not flicker.
  const [threads, setThreads] = useState<SavedThread[] | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { removing, message, handleRemove } = useRemoveSaved(removeSaved)

  useEffect(() => {
    let current = true
    loadAllSaved().then((result) => {
      if (!current) return
      setFailed(typeof result === 'string' ? result : null)
      if (typeof result !== 'string') setThreads(result)
    })
    return () => {
      current = false
    }
    // loadAllSaved is recreated on every render; `profile` marks real changes.
  }, [profile, attempt])

  return (
    <section className="profile-section container" aria-labelledby="bookmarks-title">
      <div className="profile-section__header">
        <h2 className="profile-section__title" id="bookmarks-title">
          Bookmarks
        </h2>
      </div>

      <p className="profile-live" role="status">
        {message}
      </p>

      {failed ? (
        <div className="profile-status--error profile-bookmarks__state" role="alert">
          <p>{failed}</p>
          <button type="button" className="profile-button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : threads === null ? (
        <p className="profile-bookmarks__state" role="status">
          Loading your bookmarks…
        </p>
      ) : threads.length === 0 ? (
        <NoBookmarks />
      ) : (
        <SavedThreadList threads={threads} removing={removing} onRemove={handleRemove} />
      )}
    </section>
  )
}

// ----- Saved Research Papers -----

type SavedPapersState =
  | { status: 'loading' }
  | { status: 'ready'; papers: SavedPaper[] }
  | { status: 'error'; message: string }

/** Papers saved with the bookmark icon on Thread Details (GET /api/bookmarks/papers). */
function SavedPapers() {
  const [state, setState] = useState<SavedPapersState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [removing, setRemoving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchPaperBookmarks(controller.signal)
      .then((papers) => setState({ status: 'ready', papers }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof ApiError ? error.message : 'Something went wrong.',
        })
      })
    return () => controller.abort()
  }, [attempt])

  function retry() {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  async function handleRemove(paper: SavedPaper) {
    setRemoving(paper.paper_id)
    setMessage(null)
    try {
      await removePaperBookmark(paper.paper_id)
      setState((current) =>
        current.status === 'ready'
          ? { status: 'ready', papers: current.papers.filter((item) => item.paper_id !== paper.paper_id) }
          : current,
      )
      setMessage(`Removed "${paper.title}" from your saved papers.`)
    } catch (error) {
      setMessage(
        `"${paper.title}" could not be removed: ${error instanceof ApiError ? error.message : 'Something went wrong.'}`,
      )
    } finally {
      setRemoving(null)
    }
  }

  const count = state.status === 'ready' ? state.papers.length : 0

  return (
    <section className="profile-section container" aria-labelledby="saved-papers-title">
      <div className="profile-section__header">
        <h2 className="profile-section__title" id="saved-papers-title">
          Saved Papers
          {count > 0 && <span className="profile-section__count"> ({count})</span>}
        </h2>
      </div>

      <p className="profile-live" role="status">
        {message}
      </p>

      {state.status === 'loading' ? (
        <div className="profile-card profile-empty">
          <p>Loading your saved papers…</p>
        </div>
      ) : state.status === 'error' ? (
        <div className="profile-card profile-empty" role="alert">
          <p>Your saved papers could not be loaded: {state.message}</p>
          <button type="button" className="profile-text-link" onClick={retry}>
            Try again
          </button>
        </div>
      ) : state.papers.length === 0 ? (
        <div className="profile-card profile-empty">
          <p>You have not saved any papers yet. Use the bookmark icon on a paper in any thread.</p>
        </div>
      ) : (
        <ul className="profile-saved">
          {state.papers.map((paper) => (
            <li key={paper.paper_id} className="profile-card profile-saved__card">
              <div className="profile-saved__top">
                {paper.year !== null ? <Tag>{paper.year}</Tag> : <span />}
                <button
                  type="button"
                  className="profile-saved__remove"
                  aria-label={`Remove "${paper.title}" from saved papers`}
                  title="Remove from saved"
                  disabled={removing === paper.paper_id}
                  onClick={() => void handleRemove(paper)}
                >
                  <ProfileIcon name="bookmark" size={20} />
                </button>
              </div>
              <h3 className="profile-saved__title">
                {isHttpsUrl(paper.url) ? <a href={paper.url} rel="noreferrer">{paper.title}</a> : paper.title}
              </h3>
              {paper.authors && <p className="profile-saved__description">{paper.authors}</p>}
              {paper.thread && (
                <div className="profile-saved__footer">
                  <Link
                    className="profile-text-link"
                    href={threadDetailsPath(paper.thread.slug || String(paper.thread.id))}
                  >
                    From {paper.thread.title}
                    <ProfileIcon name="arrow-right" size={18} />
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NoBookmarks() {
  return (
    <div className="profile-card profile-empty">
      <p>You have not saved any research threads yet.</p>
      <Link className="profile-text-link" href={routes.researchThreads}>
        Browse Threads
        <ProfileIcon name="arrow-right" size={18} />
      </Link>
    </div>
  )
}

function SavedThreadList({
  threads,
  removing,
  onRemove,
}: {
  threads: SavedThread[]
  removing: number | null
  onRemove: (thread: SavedThread) => void
}) {
  return (
    <ul className="profile-saved">
      {threads.map((thread) => {
        const progress = progressSummary(thread.progress)
        const href = threadDetailsPath(String(thread.id))
        return (
          <li key={thread.id} className="profile-card profile-saved__card">
            <div className="profile-saved__top">
              <Tag>{thread.category}</Tag>
              <button
                type="button"
                className="profile-saved__remove"
                aria-label={`Remove "${thread.title}" from saved threads`}
                title="Remove from saved"
                disabled={removing === thread.id}
                onClick={() => onRemove(thread)}
              >
                <ProfileIcon name="bookmark" size={20} />
              </button>
            </div>
            <h3 className="profile-saved__title">
              <Link href={href}>{thread.title}</Link>
            </h3>
            <p className="profile-saved__description">{thread.description}</p>
            <div className="profile-progress">
              <div className="profile-progress__labels">
                <span>Your progress</span>
                <span className="profile-progress__stage">{progress.label}</span>
              </div>
              <div
                className="profile-progress__track"
                role="progressbar"
                aria-label={`${thread.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                aria-valuetext={progress.label}
              >
                <span className="profile-progress__bar" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
            <div className="profile-saved__footer">
              <Link className="profile-text-link" href={href}>
                {progress.started ? 'Continue Research' : 'Start Research'}
                <ProfileIcon name="arrow-right" size={18} />
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ----- Recently Explored and Research Activity -----

function RecentlyExplored({ profile }: { profile: Profile }) {
  const threads = profile.recently_explored
  return (
    <section className="profile-band__column" aria-labelledby="recent-title">
      <h2 className="profile-section__title" id="recent-title">
        Recently Explored
      </h2>
      {threads.length === 0 ? (
        <div className="profile-card profile-empty">
          <p>Threads you open will appear here.</p>
        </div>
      ) : (
        <ul className="profile-card profile-recent">
          {threads.map((thread) => (
            <li key={thread.id} className="profile-recent__item">
              <span className="profile-icon-box">
                <ProfileIcon name="file" size={20} />
              </span>
              <div className="profile-recent__text">
                <Link className="profile-recent__link" href={threadDetailsPath(String(thread.id))}>
                  {thread.title}
                </Link>
                <span className="profile-recent__meta">
                  {[thread.category, lastViewedLabel(thread.last_viewed_at)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <ProfileIcon name="chevron-right" size={20} className="profile-recent__chevron" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const activityIcons: Record<ActivityKind, ProfileIconName> = {
  started: 'sparkle',
  stage: 'check',
  paper: 'file',
  discovery: 'search',
  other: 'sparkle',
}

function ResearchActivity({ profile }: { profile: Profile }) {
  const activity = profile.activity
  return (
    <section className="profile-band__column" aria-labelledby="activity-title">
      <h2 className="profile-section__title" id="activity-title">
        Research Activity
      </h2>
      {activity.length === 0 ? (
        <div className="profile-card profile-empty">
          <p>Start a research thread to see your activity here.</p>
        </div>
      ) : (
        <ol className="profile-card profile-activity">
          {activity.map((item) => {
            const { kind, title, detail } = describeActivity(item)
            return (
              <li key={item.id} className="profile-activity__item">
                <span className="profile-activity__icon">
                  <ProfileIcon name={activityIcons[kind]} size={18} />
                </span>
                <div className="profile-activity__text">
                  <span className="profile-activity__title">{title}</span>
                  {detail && <span className="profile-activity__detail">{detail}</span>}
                  <time className="profile-activity__time" dateTime={item.created_at ?? undefined}>
                    {formatWhen(item.created_at)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

// ----- Account Settings -----

function AccountSettings({
  profile,
  onEdit,
  saveChanges,
}: {
  profile: Profile
  onEdit: () => void
  saveChanges: (changes: ProfileChanges) => Promise<string | null>
}) {
  const [notifications, setNotifications] = useState(profile.settings.email_notifications)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => setNotifications(profile.settings.email_notifications), [profile.settings.email_notifications])

  async function toggleNotifications() {
    const next = !notifications
    setNotifications(next)
    setSavingNotifications(true)
    setMessage(null)
    const error = await saveChanges({ email_notifications: next })
    setSavingNotifications(false)
    if (error) {
      setNotifications(!next)
      setMessage(`Notification preference not saved: ${error}`)
    } else {
      setMessage(next ? 'Email notifications turned on.' : 'Email notifications turned off.')
    }
  }

  async function handleLogOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      // The UI is signed out either way; the old cookie expires on its own.
    }
    navigate(routes.home)
  }

  return (
    <section className="profile-section profile-settings container" aria-labelledby="settings-title">
      <h2 className="profile-section__title" id="settings-title">
        Account Settings
      </h2>
      <ul className="profile-card profile-settings__list">
        <SettingRow icon="edit" title="Edit Profile" description="Name, description and avatar">
          <button type="button" className="profile-button profile-button--small" onClick={onEdit}>
            Edit
          </button>
        </SettingRow>
        <SettingRow
          icon="lock"
          title="Change Password"
          description="Update the password you sign in with (coming soon)"
        >
          {/* No change-password endpoint exists yet (see app/api/v1/profile.py). */}
          <button
            type="button"
            className="profile-button profile-button--small"
            disabled
            title="Changing your password is not available yet"
          >
            Change
          </button>
        </SettingRow>
        <SettingRow
          icon="bell"
          title="Notification Preferences"
          description="Email me about new stages in saved threads"
        >
          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            aria-label="Email notifications"
            className="profile-switch"
            disabled={savingNotifications}
            onClick={toggleNotifications}
          >
            <span className="profile-switch__thumb" />
          </button>
        </SettingRow>
        <SettingRow icon="globe" title="Language" description="Language used across AstroThread">
          <select
            className="profile-select"
            aria-label="Language"
            value={profile.settings.language}
            onChange={() => {}}
          >
            <option value="en">English</option>
          </select>
        </SettingRow>
        <SettingRow icon="log-out" title="Log Out" description="Sign out of this device" danger>
          <button
            type="button"
            className="profile-button profile-button--small profile-button--danger"
            onClick={handleLogOut}
            disabled={signingOut}
          >
            Log Out
          </button>
        </SettingRow>
      </ul>
      <p className="profile-live" role="status">
        {message}
      </p>
    </section>
  )
}

function SettingRow({
  icon,
  title,
  description,
  danger = false,
  children,
}: {
  icon: ProfileIconName
  title: string
  description: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <li className="profile-setting">
      <span className="profile-icon-box">
        <ProfileIcon name={icon} size={20} />
      </span>
      <div className="profile-setting__text">
        <span className={danger ? 'profile-setting__title profile-setting__title--danger' : 'profile-setting__title'}>
          {title}
        </span>
        <span className="profile-setting__description">{description}</span>
      </div>
      <div className="profile-setting__control">{children}</div>
    </li>
  )
}

export default ProfilePage
