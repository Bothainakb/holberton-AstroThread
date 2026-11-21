import { useEffect, useState } from "react"; // أدوات React لإدارة الحالة والتأثيرات
import { SiteHeader } from "../../components/SiteHeader/SiteHeader"; // الشريط العلوي للموقع
import { SiteFooter } from "../../components/SiteFooter/SiteFooter"; // تذييل الموقع
import { SearchBox } from "../../components/SearchBox/SearchBox"; // مربع البحث
import { EmptyState } from "../../components/EmptyState/EmptyState"; // رسالة الصفحة الفارغة
import { Button } from "../../components/Button/Button"; // مكون الزر
import { FormAlert } from "../../components/FormAlert/FormAlert"; // رسائل التنبيه (مثل الأخطاء)
import { getCurrentSession } from "../../data/demoAuth"; // المستخدم المسجل دخوله
import {
  deletePaper, // حذف ورقة (تجريبي)
  getPaperStatus, // حالة الورقة: ظاهرة أو مخفية
  getSearchActivity, // إحصائيات البحث (تجريبي)
  isPaperDeleted, // هل الورقة محذوفة؟
  resetAdminDemo, // إعادة ضبط البيانات التجريبية
  setPaperStatus, // إخفاء الورقة أو إظهارها
} from "../../data/demoAdmin";
import type { PaperStatus } from "../../data/demoAdmin"; // نوع حالة الورقة
import {
  ACCOUNTS_ARE_LIVE, // هل الحسابات قادمة من الخادم الحقيقي؟
  changeAccountStatus, // إيقاف الحساب أو إعادة تفعيله
  loadAccounts, // تحميل قائمة الحسابات
} from "../../services/admin/adminService";
import type { AdminAccount } from "../../services/admin/adminService"; // نوع بيانات الحساب في لوحة المدير
import { navigate, paperPath, routes } from "../../lib/router"; // التنقل بين الصفحات
import type { PaperSummary } from "../../types/research"; // نوع بيانات الورقة البحثية
import "./AdminPage.css"; // تنسيقات الصفحة

type AdminView = "overview" | "papers" | "accounts"; // أقسام لوحة المدير
type StatusFilter = "all" | PaperStatus; // فلتر حالة الأوراق

// أزرار التبديل بين الأقسام
const VIEWS: { id: AdminView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "papers", label: "Papers" },
  { id: "accounts", label: "Accounts" },
];

// تنسيق الوقت المعروض (مثل: Nov 16, 3:45 PM)
const timeFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function searchHref(query: string) {
  // إنشاء رابط صفحة البحث مع كلمة البحث
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function matches(text: string, filter: string) {
  // هل يحتوي النص على كلمة الفلتر؟ (بدون اعتبار لحالة الأحرف)
  return text.toLowerCase().includes(filter.trim().toLowerCase());
}

function errorMessage(problem: unknown, fallback: string) {
  // استخراج رسالة الخطأ أو استخدام الرسالة الاحتياطية
  return problem instanceof Error ? problem.message : fallback;
}

// الخصائص التي يستقبلها قسم النظرة العامة
interface OverviewProps {
  papers: readonly PaperSummary[]; // الأوراق البحثية
  accounts: readonly AdminAccount[] | null; // الحسابات (null أثناء التحميل)
}

function Overview({ papers, accounts }: OverviewProps) {
  // عدد الحسابات الموقوفة (صفر أثناء التحميل)
  const suspended = (accounts ?? []).filter((account) => account.status === "suspended").length;
  const hidden = papers.filter((paper) => getPaperStatus(paper.id) === "hidden").length; // عدد الأوراق المخفية
  const activity = getSearchActivity(); // إحصائيات البحث
  const maxCount = Math.max(1, ...activity.top.map((item) => item.count)); // أعلى عدد لرسم الأشرطة

  // البطاقات الثلاث في أعلى الصفحة
  const stats = [
    {
      label: "Accounts",
      value: accounts === null ? "…" : accounts.length, // "…" أثناء التحميل
      detail: `${suspended} suspended`,
    },
    { label: "Papers", value: papers.length, detail: `${hidden} hidden` },
    { label: "Searches", value: activity.total, detail: "by signed-in users" },
  ];

  return (
    <>
      {/* بطاقات الإحصائيات */}
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
        {/* أكثر عمليات البحث تكراراً */}
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
                  {/* شريط طوله يتناسب مع عدد مرات البحث */}
                  <span className="admin-top__bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                  </span>
                  <span className="admin-top__count">{item.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* آخر عمليات البحث */}
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
  const [filter, setFilter] = useState(""); // نص الفلتر
  const [status, setStatus] = useState<StatusFilter>("all"); // فلتر الحالة
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // الورقة التي ننتظر تأكيد حذفها

  // الأوراق التي تطابق الفلتر والحالة المختارة
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

      {/* أدوات الفلترة */}
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
                const paperStatus = getPaperStatus(paper.id); // حالة هذه الورقة
                const isConfirming = confirmingId === paper.id; // هل ننتظر تأكيد حذفها؟

                return (
                  <tr key={paper.id}>
                    {/* عنوان الورقة: رابط فقط إذا كانت ظاهرة */}
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
                            {/* تأكيد الحذف أو الإلغاء */}
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
                            {/* إخفاء الورقة أو إظهارها */}
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
                            {/* زر الحذف يطلب التأكيد أولاً */}
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

// الخصائص التي يستقبلها قسم الحسابات
interface AccountsViewProps {
  accounts: readonly AdminAccount[] | null; // الحسابات (null أثناء التحميل)
  loadError: string; // رسالة خطأ التحميل إن وجدت
  onAccountChange: (account: AdminAccount) => void; // تُستدعى بعد تغيير حالة حساب
}

function AccountsView({ accounts, loadError, onAccountChange }: AccountsViewProps) {
  const [filter, setFilter] = useState(""); // نص الفلتر
  const [busyId, setBusyId] = useState<string | null>(null); // الحساب الذي يتم تغييره الآن
  const [actionError, setActionError] = useState(""); // رسالة خطأ الإيقاف أو التفعيل

  async function toggleStatus(account: AdminAccount) {
    setBusyId(account.id); // تعطيل زر هذا الحساب أثناء الطلب
    setActionError(""); // إخفاء أي خطأ سابق

    try {
      // إيقاف الحساب النشط، أو إعادة تفعيل الحساب الموقوف
      const updated = await changeAccountStatus(
        account,
        account.status === "suspended" ? "active" : "suspended",
      );
      onAccountChange(updated); // تحديث الحساب في القائمة
    } catch (problem) {
      setActionError(errorMessage(problem, "We couldn’t change this account.")); // عرض سبب الفشل
    } finally {
      setBusyId(null); // إعادة تفعيل الزر
    }
  }

  // الحسابات التي تطابق الفلتر (بالاسم أو البريد)
  const rows = (accounts ?? []).filter(
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

      {/* رسالة الخطأ عند فشل الإيقاف أو التفعيل */}
      {actionError && <FormAlert tone="error">{actionError}</FormAlert>}

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

      {/* حالات العرض: خطأ في التحميل، جارٍ التحميل، لا نتائج، أو جدول الحسابات */}
      {loadError ? (
        <FormAlert tone="error">{loadError}</FormAlert>
      ) : accounts === null ? (
        <p className="admin-panel__empty" role="status">
          Loading accounts…
        </p>
      ) : rows.length === 0 ? (
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
                const suspended = account.status === "suspended"; // هل الحساب موقوف؟
                const isAdmin = account.accountType === "admin"; // حسابات المدراء لا تُوقف

                return (
                  <tr key={account.id}>
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
                            disabled={busyId === account.id}
                            onClick={() => void toggleStatus(account)}
                          >
                            {busyId === account.id ? "Saving…" : suspended ? "Reactivate" : "Suspend"}
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
  const [session] = useState(getCurrentSession); // المستخدم المسجل دخوله
  const [view, setView] = useState<AdminView>("overview"); // القسم المعروض حالياً
  const [query, setQuery] = useState(""); // نص البحث في الشريط العلوي
  const [allPapers, setAllPapers] = useState<PaperSummary[] | null>(null); // الأوراق (null أثناء التحميل)
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null); // الحسابات (null أثناء التحميل)
  const [accountsError, setAccountsError] = useState(""); // خطأ تحميل الحسابات
  const [accountsVersion, setAccountsVersion] = useState(0); // زيادته تعيد تحميل الحسابات
  const [, setVersion] = useState(0); // زيادته تعيد رسم الصفحة بعد التغييرات التجريبية
  const isAdmin = session?.accountType === "admin"; // هل المستخدم مدير؟

  useEffect(() => {
    document.title = "Admin dashboard | AstroThread"; // عنوان تبويب المتصفح
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return; // لا نحمل البيانات لغير المدير
    }

    let active = true; // لتجاهل النتيجة إذا غادر المستخدم الصفحة

    // تحميل الأوراق التجريبية
    import("../../services/search/sampleSearchData").then(({ samplePapers }) => {
      if (active) {
        setAllPapers([...samplePapers]);
      }
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return; // لا نحمل الحسابات لغير المدير
    }

    let active = true; // لتجاهل النتيجة إذا غادر المستخدم الصفحة
    setAccounts(null); // إظهار حالة التحميل
    setAccountsError(""); // إخفاء أي خطأ سابق

    // تحميل الحسابات من الخادم (أو من المتصفح في الوضع التجريبي)
    loadAccounts()
      .then((list) => {
        if (active) {
          setAccounts(list);
        }
      })
      .catch((problem: unknown) => {
        if (active) {
          setAccountsError(errorMessage(problem, "We couldn’t load the accounts."));
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, accountsVersion]);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim(); // حذف المسافات

    if (trimmed) {
      navigate(searchHref(trimmed)); // الانتقال إلى صفحة نتائج البحث
    }
  }

  function replaceAccount(updated: AdminAccount) {
    // استبدال الحساب القديم بالحساب بعد التعديل
    setAccounts((current) =>
      current ? current.map((account) => (account.id === updated.id ? updated : account)) : current,
    );
  }

  const refresh = () => setVersion((value) => value + 1); // إعادة رسم الصفحة
  const papers = (allPapers ?? []).filter((paper) => !isPaperDeleted(paper.id)); // الأوراق غير المحذوفة

  let content; // محتوى الصفحة حسب صلاحية المستخدم

  if (!isAdmin) {
    // المستخدم ليس مديراً
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
          {/* ملاحظة توضح أي البيانات حقيقية وأيها تجريبية */}
          <p className="admin__sample">
            {ACCOUNTS_ARE_LIVE
              ? "Accounts are live. Papers and search activity are still sample data."
              : "Sample data. The admin endpoints aren’t connected yet."}
          </p>
          {/* أزرار التبديل بين الأقسام */}
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
            {/* القسم المختار */}
            {view === "overview" && <Overview papers={papers} accounts={accounts} />}
            {view === "papers" && <PapersView papers={papers} onChange={refresh} />}
            {view === "accounts" && (
              <AccountsView
                accounts={accounts}
                loadError={accountsError}
                onAccountChange={replaceAccount}
              />
            )}
          </>
        )}

        {/* إعادة ضبط البيانات التجريبية المحفوظة في المتصفح */}
        <div className="admin__foot">
          <span>
            {ACCOUNTS_ARE_LIVE
              ? "Paper changes are saved in this browser only."
              : "Demo changes are saved in this browser only."}
          </span>
          <button
            type="button"
            className="admin__reset"
            onClick={() => {
              resetAdminDemo(); // حذف التغييرات التجريبية
              setAccountsVersion((value) => value + 1); // إعادة تحميل الحسابات
              refresh(); // إعادة رسم الصفحة
            }}
          >
            {ACCOUNTS_ARE_LIVE ? "Reset hidden and deleted papers" : "Reset hidden, deleted and suspended"}
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