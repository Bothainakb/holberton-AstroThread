import { getAccounts } from "../../data/demoAuth"; // الحسابات التجريبية (عند عدم استخدام الخادم)
import { isAccountSuspended, setAccountStatus } from "../../data/demoAdmin"; // حالة الحسابات التجريبية
import type { AccountStatus } from "../../data/demoAdmin"; // نوع حالة الحساب: active أو suspended
import type { AccountType } from "../../data/demoAuth"; // نوع الحساب: user أو admin
import { apiBaseUrl, searchSource } from "../search/searchService"; // عنوان الخادم ومصدر البيانات

const USES_BACKEND = searchSource === "api"; // هل نستخدم الخادم الحقيقي؟

export const ACCOUNTS_ARE_LIVE = USES_BACKEND; // لعرض ملاحظة في الصفحة بأن الحسابات حقيقية

// بيانات الحساب كما تظهر في لوحة المدير
export interface AdminAccount {
  id: string; // رقم الحساب (نستخدم البريد كرقم في الوضع التجريبي)
  fullName: string; // الاسم الكامل
  email: string; // البريد الإلكتروني
  accountType: AccountType; // مستخدم أو مدير
  status: AccountStatus; // نشط أو موقوف
}

const SERVER_DOWN_MESSAGE = "We couldn’t reach AstroThread. Check your connection and try again.";
const LOAD_FAILED_MESSAGE = "We couldn’t load the accounts. Please try again.";
const CHANGE_FAILED_MESSAGE = "We couldn’t change this account. Please try again.";

function toAdminAccount(data: unknown): AdminAccount | null {
  // التأكد من أن الرد يحتوي على بيانات حساب صحيحة
  if (!data || typeof data !== "object") {
    return null;
  }

  const { id, fullName, email, accountType, status } = data as Record<string, unknown>;

  if (typeof id !== "number" || typeof fullName !== "string" || typeof email !== "string") {
    return null;
  }

  return {
    id: String(id), // تحويل الرقم إلى نص ليكون مثل الوضع التجريبي
    fullName,
    email,
    accountType: accountType === "admin" ? "admin" : "user",
    status: status === "suspended" ? "suspended" : "active",
  };
}

async function readError(response: Response, fallback: string): Promise<string> {
  // قراءة رسالة الخطأ من الخادم، أو استخدام الرسالة الاحتياطية
  const data: unknown = await response.json().catch(() => null);

  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }

  return fallback;
}

export async function loadAccounts(): Promise<AdminAccount[]> {
  if (!USES_BACKEND) {
    // الوضع التجريبي: الحسابات المحفوظة في المتصفح
    return getAccounts().map((account) => ({
      id: account.email,
      fullName: account.fullName,
      email: account.email,
      accountType: account.accountType,
      status: isAccountSuspended(account.email) ? "suspended" : "active",
    }));
  }

  let response: Response; // رد الخادم

  try {
    response = await fetch(`${apiBaseUrl}/admin/users`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(SERVER_DOWN_MESSAGE); // تعذر الوصول إلى الخادم
  }

  if (!response.ok) {
    throw new Error(await readError(response, LOAD_FAILED_MESSAGE)); // مثل 403 لغير المدير
  }

  const data: unknown = await response.json().catch(() => null); // قراءة قائمة الحسابات

  if (!Array.isArray(data)) {
    throw new Error(LOAD_FAILED_MESSAGE); // رد غير متوقع
  }

  // تحويل كل عنصر وتجاهل العناصر غير الصالحة
  return data.flatMap((item) => {
    const account = toAdminAccount(item);
    return account ? [account] : [];
  });
}

export async function changeAccountStatus(
  account: AdminAccount,
  status: AccountStatus,
): Promise<AdminAccount> {
  if (!USES_BACKEND) {
    setAccountStatus(account.email, status); // الوضع التجريبي: الحفظ في المتصفح
    return { ...account, status };
  }

  let response: Response; // رد الخادم

  try {
    // إرسال الحالة الجديدة إلى الخادم
    response = await fetch(`${apiBaseUrl}/admin/users/${encodeURIComponent(account.id)}/status`, {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch {
    throw new Error(SERVER_DOWN_MESSAGE); // تعذر الوصول إلى الخادم
  }

  if (!response.ok) {
    throw new Error(await readError(response, CHANGE_FAILED_MESSAGE)); // مثل 403 لحسابات المدراء
  }

  const updated = toAdminAccount(await response.json().catch(() => null)); // الحساب بعد التعديل

  if (!updated) {
    throw new Error(CHANGE_FAILED_MESSAGE); // رد غير متوقع
  }

  return updated;
}