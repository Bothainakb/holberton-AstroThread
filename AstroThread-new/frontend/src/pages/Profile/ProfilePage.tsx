import { useEffect, useId, useState } from "react"; // أدوات React لإدارة الحالة والمعرفات
import type { FormEvent } from "react"; // نوع حدث إرسال النموذج
import { SiteHeader } from "../../components/SiteHeader/SiteHeader"; // الشريط العلوي للموقع
import { SiteFooter } from "../../components/SiteFooter/SiteFooter"; // تذييل الموقع
import { SearchBox } from "../../components/SearchBox/SearchBox"; // مربع البحث
import { Button } from "../../components/Button/Button"; // مكون الزر
import { FormAlert } from "../../components/FormAlert/FormAlert"; // رسائل التنبيه (نجاح أو خطأ)
import {
  DEMO_ADMIN_EMAIL, // بريد حساب المدير التجريبي
  deleteAccount, // حذف الحساب
  getCurrentSession, // جلب المستخدم المسجل دخوله
  signOut, // تسجيل الخروج
  updateFullName, // تعديل الاسم
} from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth"; // نوع بيانات المستخدم
import { getMyThread, getReadPaperIds } from "../../data/myThread"; // بيانات My Thread للإحصائيات
import { navigate, routes } from "../../lib/router"; // التنقل بين الصفحات
import { clearRecentSearches, getRecentSearches } from "../../lib/recentSearches"; // عمليات البحث الأخيرة
import "./ProfilePage.css"; // تنسيقات الصفحة

const NAME_MIN_LENGTH = 2; // أقل عدد أحرف للاسم
const NAME_MAX_LENGTH = 60; // أقصى عدد أحرف للاسم في الواجهة

function searchHref(query: string) {
  // إنشاء رابط صفحة البحث مع كلمة البحث
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function getInitials(fullName: string) {
  // استخراج أول حرفين من الاسم لعرضهما في الصورة الرمزية
  return fullName
    .trim() // حذف المسافات الزائدة
    .split(/\s+/) // تقسيم الاسم إلى كلمات
    .slice(0, 2) // أخذ أول كلمتين فقط
    .map((part) => part[0]?.toUpperCase() ?? "") // أول حرف من كل كلمة بحرف كبير
    .join(""); // دمج الحرفين
}

function validateName(value: string): string {
  const trimmed = value.trim(); // حذف المسافات من البداية والنهاية

  // التحقق من الحد الأدنى لطول الاسم
  if (trimmed.length < NAME_MIN_LENGTH) {
    return `Enter at least ${NAME_MIN_LENGTH} characters.`;
  }

  // التحقق من الحد الأقصى لطول الاسم
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Use ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  return ""; // الاسم صحيح
}

// الخصائص التي يستقبلها قسم بيانات الحساب
interface AccountDetailsProps {
  session: DemoSession; // المستخدم الحالي
  onSaved: (session: DemoSession) => void; // تُستدعى بعد حفظ الاسم بنجاح
}

function AccountDetails({ session, onSaved }: AccountDetailsProps) {
  const nameId = useId(); // معرف فريد لحقل الاسم
  const errorId = useId(); // معرف فريد لرسالة الخطأ
  const [name, setName] = useState(session.fullName); // الاسم المكتوب في الحقل
  const [error, setError] = useState(""); // رسالة الخطأ
  const [isSaving, setIsSaving] = useState(false); // هل الحفظ جارٍ الآن؟
  const [saved, setSaved] = useState(false); // هل تم الحفظ بنجاح؟

  const isUnchanged = name.trim() === session.fullName; // الاسم لم يتغير

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // منع إعادة تحميل الصفحة

    const message = validateName(name); // التحقق من الاسم
    setError(message); // عرض الخطأ إن وجد
    setSaved(false); // إخفاء رسالة النجاح السابقة

    if (message || isUnchanged) {
      return; // لا نرسل شيئاً إذا كان هناك خطأ أو لم يتغير الاسم
    }

    setIsSaving(true); // إظهار حالة "جارٍ الحفظ"

    try {
      const nextSession = await updateFullName(session.email, name); // حفظ الاسم الجديد
      setName(nextSession.fullName); // عرض الاسم كما حُفظ
      setSaved(true); // إظهار رسالة النجاح
      onSaved(nextSession); // تحديث بيانات المستخدم في الصفحة
    } catch (saveError) {
      // عرض رسالة الخطأ القادمة من الخادم تحت حقل الاسم
      setError(saveError instanceof Error ? saveError.message : "We couldn’t save your name.");
    } finally {
      setIsSaving(false); // إيقاف حالة الحفظ في جميع الحالات
    }
  }

  return (
    <section className="profile__section" aria-labelledby="profile-account-title">
      <h2 id="profile-account-title" className="profile__section-title">
        Account
      </h2>

      {/* الصورة الرمزية واسم المستخدم ونوع الحساب */}
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

      {/* رسالة النجاح بعد حفظ الاسم */}
      {saved && (
        <FormAlert tone="success" title="Profile updated">
          Your name was saved.
        </FormAlert>
      )}

      {/* نموذج تعديل الاسم */}
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
              setName(event.target.value); // تحديث الاسم أثناء الكتابة
              setSaved(false); // إخفاء رسالة النجاح عند التعديل
              if (error) {
                setError(validateName(event.target.value)); // إعادة التحقق إذا كان هناك خطأ ظاهر
              }
            }}
          />
          {/* رسالة الخطأ تحت حقل الاسم */}
          {error && (
            <p id={errorId} className="profile__error">
              {error}
            </p>
          )}
        </div>

        {/* البريد الإلكتروني (للعرض فقط) */}
        <div className="profile__field">
          <span className="profile__label">Email</span>
          <p className="profile__value">{session.email}</p>
          <p className="profile__hint">
            You sign in with a code sent to this email. Changing it will be available later.
          </p>
        </div>

        {/* زر الحفظ: معطل أثناء الحفظ أو إذا لم يتغير الاسم */}
        <div className="profile__actions">
          <Button type="submit" disabled={isSaving || isUnchanged}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

// الخصائص التي يستقبلها قسم النشاط
interface ActivitySummaryProps {
  email: string; // بريد المستخدم لجلب بياناته
}

function ActivitySummary({ email }: ActivitySummaryProps) {
  const thread = getMyThread(email); // بيانات My Thread الخاصة بالمستخدم
  // الإحصائيات المعروضة في الصفحة
  const stats = [
    { label: "Saved topics", value: thread.topics.length }, // عدد المواضيع المحفوظة
    { label: "Papers read", value: getReadPaperIds(thread).size }, // عدد الأوراق المقروءة
    { label: "Searches", value: thread.journey.filter((step) => step.type === "search").length }, // عدد عمليات البحث
  ];

  return (
    <section className="profile__section" aria-labelledby="profile-activity-title">
      <h2 id="profile-activity-title" className="profile__section-title">
        Activity
      </h2>

      {/* عرض كل إحصائية مع عنوانها */}
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
  const [count, setCount] = useState(() => getRecentSearches().length); // عدد عمليات البحث المحفوظة
  const [cleared, setCleared] = useState(false); // هل تم مسح السجل؟

  function handleClear() {
    clearRecentSearches(); // مسح سجل البحث من المتصفح
    setCount(0); // تصفير العدد
    setCleared(true); // إظهار رسالة المسح
  }

  return (
    <section className="profile__section" aria-labelledby="profile-privacy-title">
      <h2 id="profile-privacy-title" className="profile__section-title">
        Privacy
      </h2>

      <div className="profile__row">
        <div>
          <p className="profile__row-title">Recent searches</p>
          {/* نص يوضح عدد عمليات البحث المحفوظة على هذا الجهاز */}
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

      {/* رسالة يقرأها قارئ الشاشة بعد المسح */}
      <p className="profile__status" role="status">
        {cleared ? "Search history cleared." : ""}
      </p>
    </section>
  );
}

// الخصائص التي يستقبلها قسم إجراءات الحساب
interface AccountActionsProps {
  session: DemoSession; // المستخدم الحالي
}

function AccountActions({ session }: AccountActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false); // هل تظهر رسالة تأكيد الحذف؟
  const [isDeleting, setIsDeleting] = useState(false); // هل الحذف جارٍ الآن؟
  const [deleteError, setDeleteError] = useState(""); // رسالة خطأ الحذف
  const isDemoAdmin = session.email === DEMO_ADMIN_EMAIL; // حساب المدير التجريبي لا يمكن حذفه

  function handleSignOut() {
    signOut(); // تسجيل الخروج
    navigate(routes.home); // الانتقال إلى الصفحة الرئيسية
  }

  async function handleDelete() {
    setIsDeleting(true); // إظهار حالة "جارٍ الحذف"
    setDeleteError(""); // إخفاء أي خطأ سابق

    try {
      await deleteAccount(session.email); // حذف الحساب
      navigate(routes.home); // الانتقال إلى الصفحة الرئيسية بعد الحذف
    } catch (deleteProblem) {
      setIsDeleting(false); // إعادة تفعيل الأزرار
      // عرض رسالة الخطأ القادمة من الخادم
      setDeleteError(
        deleteProblem instanceof Error ? deleteProblem.message : "We couldn’t delete your account.",
      );
    }
  }

  return (
    <section className="profile__section" aria-labelledby="profile-actions-title">
      <h2 id="profile-actions-title" className="profile__section-title">
        Account actions
      </h2>

      {/* تسجيل الخروج */}
      <div className="profile__row">
        <div>
          <p className="profile__row-title">Log out</p>
          <p className="profile__hint">Sign out of AstroThread on this device.</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>
          Log out
        </Button>
      </div>

      {/* حذف الحساب */}
      <div className="profile__row profile__row--danger">
        <div>
          <p className="profile__row-title">Delete account</p>
          <p className="profile__hint">
            {isDemoAdmin
              ? "The demo admin account can’t be deleted."
              : "Permanently delete your account, saved topics and research journey."}
          </p>
        </div>
        {/* زر الحذف يختفي عند ظهور رسالة التأكيد */}
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

      {/* رسالة تأكيد الحذف */}
      {isConfirming && (
        <div className="profile__confirm" role="alert">
          <p className="profile__confirm-title">Delete your account?</p>
          <p className="profile__hint">
            This removes {session.email} and all of its My Thread data. You can’t undo this.
          </p>
          {/* رسالة الخطأ إذا فشل الحذف */}
          {deleteError && <FormAlert tone="error">{deleteError}</FormAlert>}
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
  const [session, setSession] = useState<DemoSession | null>(getCurrentSession); // المستخدم الحالي
  const [query, setQuery] = useState(""); // نص البحث في الشريط العلوي

  useEffect(() => {
    document.title = "Profile | AstroThread"; // عنوان تبويب المتصفح
  }, []);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim(); // حذف المسافات

    if (trimmed) {
      navigate(searchHref(trimmed)); // الانتقال إلى صفحة نتائج البحث
    }
  }

  return (
    <div className="profile-page">
      {/* key يعيد رسم الشريط العلوي عند تغير الاسم ليظهر الاسم الجديد */}
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
          {/* إذا لم يكن المستخدم مسجل دخوله نطلب منه تسجيل الدخول */}
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

              {/* أقسام صفحة الملف الشخصي */}
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