import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { signOut } from '../../auth/auth'
import Tag from '../../components/Tag/Tag'
import Link from '../../router/Link'
import { navigate, replacePath, routes, threadDetailsPath, withReturnPath } from '../../router/router'
import type { Profile, ProfileChanges, SavedThread } from '../../services/api'
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

  function openEditor() {
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
      <JourneyStats profile={profile} />
      <SavedThreads profile={profile} removeSaved={removeSaved} loadAllSaved={loadAllSaved} />

      <div className="profile-band">
        <div className="profile-band__inner container">
          <RecentlyExplored profile={profile} />
          <ResearchActivity profile={profile} />
        </div>
      </div>

      <AccountSettings profile={profile} onEdit={openEditor} saveChanges={saveChanges} />
    </main>
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
      label: 'Research Threads Explored',
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

function SavedThreads({
  profile,
  removeSaved,
  loadAllSaved,
}: {
  profile: Profile
  removeSaved: (threadId: number) => Promise<string | null>
  loadAllSaved: () => Promise<SavedThread[] | string>
}) {
  const { count, items } = profile.saved_threads
  const [all, setAll] = useState<SavedThread[] | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // The full list is dropped whenever the profile reloads (e.g. after a removal).
  useEffect(() => setAll(null), [profile])

  const threads = all ?? items

  async function showAll() {
    setLoadingAll(true)
    setMessage(null)
    const result = await loadAllSaved()
    setLoadingAll(false)
    if (typeof result === 'string') setMessage(result)
    else setAll(result)
  }

  async function handleRemove(thread: SavedThread) {
    setRemoving(thread.id)
    setMessage(null)
    const error = await removeSaved(thread.id)
    setRemoving(null)
    setMessage(error ?? `Removed "${thread.title}" from your saved threads.`)
  }

  return (
    <section className="profile-section container" aria-labelledby="saved-title">
      <div className="profile-section__header">
        <h2 className="profile-section__title" id="saved-title">
          Saved Research Threads
          {count > 0 && <span className="profile-section__count"> ({count})</span>}
        </h2>
        {count > items.length && !all && (
          <button type="button" className="profile-text-link" onClick={showAll} disabled={loadingAll}>
            {loadingAll ? 'Loading…' : 'View all saved'}
            <ProfileIcon name="arrow-right" size={18} />
          </button>
        )}
        {all && count > items.length && (
          <button type="button" className="profile-text-link" onClick={() => setAll(null)}>
            Show fewer
          </button>
        )}
      </div>

      <p className="profile-live" role="status">
        {message}
      </p>

      {threads.length === 0 ? (
        <div className="profile-card profile-empty">
          <p>You have not saved any research threads yet.</p>
          <Link className="profile-text-link" href={routes.researchThreads}>
            Browse Research Threads
            <ProfileIcon name="arrow-right" size={18} />
          </Link>
        </div>
      ) : (
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
                    onClick={() => handleRemove(thread)}
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
      )}
    </section>
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
