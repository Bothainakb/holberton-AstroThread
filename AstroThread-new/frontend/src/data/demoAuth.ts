import { isAccountSuspended } from "./demoAdmin"; // التحقق من إيقاف الحساب (في وضع العرض التجريبي)
import { apiBaseUrl, searchSource } from "../services/search/searchService"; // عنوان الخادم ومصدر البيانات
import { forgetMyThread, syncMyThread } from "./myThread"; // مزامنة ومسح بيانات My Thread

export type AccountType = "user" | "admin"; // أنواع الحسابات: مستخدم أو مدير

// بيانات المستخدم المسجل دخوله
export interface DemoSession {
  fullName: string; // الاسم الكامل
  email: string; // البريد الإلكتروني
  accountType: AccountType; // نوع الحساب
}

// نتيجة طلب إرسال رمز التحقق
export type CodeRequestResult =
  | { ok: true } // تم إرسال الرمز بنجاح
  | { ok: false; reason: "no-account" | "exists" | "suspended" } // لا يوجد حساب / الحساب موجود / الحساب موقوف
  | { ok: false; reason: "error"; message: string }; // خطأ آخر مع رسالة توضيحية

// نتيجة التحقق من الرمز
export type VerifyResult =
  | { ok: true; session: DemoSession } // الرمز صحيح مع بيانات المستخدم
  | { ok: false; message: string }; // الرمز خاطئ مع رسالة الخطأ

export const DEMO_ADMIN_EMAIL = "admin@astrothread.demo"; // بريد حساب المدير التجريبي
export const LOGIN_CODE_LENGTH = 6; // عدد أرقام رمز التحقق

const USES_BACKEND = searchSource === "api"; // هل نستخدم الخادم الحقيقي بدلاً من الوضع التجريبي؟

export const IS_DEMO_AUTH = !USES_BACKEND; // الوضع التجريبي يعمل فقط عند عدم استخدام الخادم

const ACCOUNTS_STORAGE_KEY = "astrothread-demo-accounts"; // مفتاح حفظ الحسابات التجريبية في المتصفح
const SESSION_STORAGE_KEY = "astrothread-demo-session"; // مفتاح حفظ بيانات الجلسة في المتصفح
const MY_THREAD_STORAGE_PREFIX = "astrothread-my-thread:"; // بداية مفتاح حفظ بيانات My Thread لكل مستخدم
const DEMO_DELAY_MS = 700; // تأخير وهمي لمحاكاة الاتصال بالخادم
const DEMO_SAVE_DELAY_MS = 400; // تأخير وهمي عند الحفظ
const SESSION_CHECK_TIMEOUT_MS = 3000; // أقصى مدة انتظار عند التحقق من الجلسة

// رسائل الأخطاء التي تظهر للمستخدم
const WRONG_CODE_MESSAGE = "This code is incorrect or has expired. Check it, or send a new code.";
const SERVER_DOWN_MESSAGE = "We couldn’t reach AstroThread. Check your connection and try again.";
const SAVE_NAME_FAILED_MESSAGE = "We couldn’t save your name. Please try again."; // فشل حفظ الاسم
const DELETE_FAILED_MESSAGE = "We couldn’t delete your account. Please try again."; // فشل حذف الحساب

// حسابات موجودة دائماً في الوضع التجريبي
const builtInAccounts: DemoSession[] = [
  {
    fullName: "AstroThread Admin",
    email: DEMO_ADMIN_EMAIL,
    accountType: "admin",
  },
];

function wait(milliseconds: number) {
  // الانتظار لمدة محددة (لمحاكاة سرعة الخادم)
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase(); // حذف المسافات وتحويل البريد إلى أحرف صغيرة
}

function readSavedAccounts(): DemoSession[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY); // قراءة الحسابات المحفوظة
    const parsed: unknown = raw ? JSON.parse(raw) : []; // تحويل النص إلى بيانات
    return Array.isArray(parsed) ? (parsed as DemoSession[]) : []; // التأكد من أنها قائمة
  } catch {
    return []; // إرجاع قائمة فارغة عند حدوث خطأ
  }
}

function writeSavedAccounts(accounts: DemoSession[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts)); // حفظ الحسابات في المتصفح
  } catch {
    // تجاهل الخطأ إذا كان التخزين غير متاح
  }
}

function saveAccount(account: DemoSession) {
  // حذف النسخة القديمة من الحساب ثم إضافة النسخة الجديدة
  const accounts = readSavedAccounts().filter((item) => item.email !== account.email);
  writeSavedAccounts([...accounts, account]);
}

function findAccount(email: string): DemoSession | undefined {
  const normalizedEmail = normalizeEmail(email); // توحيد شكل البريد قبل البحث
  // البحث في الحسابات المحفوظة والحسابات الثابتة
  return [...readSavedAccounts(), ...builtInAccounts].find(
    (account) => account.email === normalizedEmail,
  );
}

export function getAccounts(): DemoSession[] {
  const accounts: DemoSession[] = []; // قائمة الحسابات بدون تكرار

  [...readSavedAccounts(), ...builtInAccounts].forEach((account) => {
    // إضافة الحساب فقط إذا لم يكن موجوداً مسبقاً
    if (!accounts.some((item) => item.email === account.email)) {
      accounts.push(account);
    }
  });

  return accounts; // إرجاع جميع الحسابات
}

function saveSession(session: DemoSession) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); // حفظ بيانات المستخدم المسجل دخوله
  } catch {
    // تجاهل الخطأ إذا كان التخزين غير متاح
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY); // حذف بيانات الجلسة من المتصفح
  } catch {
    // تجاهل الخطأ إذا كان التخزين غير متاح
  }
}

export function getCurrentSession(): DemoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY); // قراءة بيانات الجلسة
    const parsed: unknown = raw ? JSON.parse(raw) : null; // تحويل النص إلى بيانات

    // التأكد من أن البيانات تحتوي على البريد والاسم
    if (
      parsed &&
      typeof parsed === "object" &&
      "email" in parsed &&
      "fullName" in parsed
    ) {
      const session = parsed as DemoSession;
      // الحساب الموقوف يتم تسجيل خروجه تلقائياً
      return isAccountSuspended(session.email) ? null : session;
    }

    return null; // لا يوجد مستخدم مسجل دخوله
  } catch {
    return null; // بيانات غير صالحة
  }
}

export function signOut() {
  const session = getCurrentSession(); // جلب المستخدم الحالي قبل الحذف
  clearSession(); // حذف الجلسة من المتصفح

  if (session) {
    forgetMyThread(session.email); // حذف بيانات My Thread المحفوظة في المتصفح
  }

  if (USES_BACKEND) {
    // إبلاغ الخادم بتسجيل الخروج (keepalive يكمل الطلب حتى لو انتقلت الصفحة)
    fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", keepalive: true }).catch(() => {
    });
  }
}

function isValidDemoCode(code: string) {
  // في الوضع التجريبي يُقبل أي رمز مكون من 6 أرقام
  return new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(code.trim());
}

// رسالة تظهر عند محاولة دخول حساب موقوف
export const SUSPENDED_MESSAGE =
  "This account is suspended. Contact the AstroThread team for help.";

// شكل الرد القادم من الخادم
interface ApiAnswer {
  status: number; // كود الحالة (مثل 200 أو 404)
  data: Record<string, unknown>; // البيانات بصيغة JSON
}

async function sendJson(method: string, path: string, body?: unknown): Promise<ApiAnswer> {
  // إرسال طلب إلى الخادم بأي نوع (POST أو PATCH أو DELETE)
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method, // نوع الطلب
    headers: { Accept: "application/json", "Content-Type": "application/json" }, // نرسل ونستقبل JSON
    body: body === undefined ? undefined : JSON.stringify(body), // إرسال البيانات فقط إذا وُجدت
  });
  const data: unknown = await response.json().catch(() => null); // قراءة الرد (أو null إذا كان فارغاً)

  return {
    status: response.status, // كود الحالة
    data: data && typeof data === "object" ? (data as Record<string, unknown>) : {}, // البيانات أو كائن فارغ
  };
}

function postJson(path: string, body: unknown): Promise<ApiAnswer> {
  return sendJson("POST", path, body); // اختصار لإرسال طلب POST
}

function errorText(data: Record<string, unknown>, fallback: string): string {
  // استخدام رسالة الخطأ من الخادم، أو الرسالة الاحتياطية إذا لم توجد
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

function toSession(data: Record<string, unknown>): DemoSession | null {
  const { fullName, email, accountType } = data; // استخراج بيانات المستخدم من الرد

  // التأكد من وجود الاسم والبريد
  if (typeof fullName !== "string" || typeof email !== "string") {
    return null;
  }

  // إرجاع بيانات الجلسة (أي نوع غير admin يعتبر user)
  return { fullName, email, accountType: accountType === "admin" ? "admin" : "user" };
}

async function verifyWithBackend(email: string, code: string): Promise<VerifyResult> {
  try {
    // إرسال البريد والرمز إلى الخادم للتحقق
    const { status, data } = await postJson("/auth/verify", {
      email: normalizeEmail(email),
      code: code.trim(),
    });
    const session = status === 200 ? toSession(data) : null; // بيانات المستخدم عند النجاح

    if (!session) {
      return { ok: false, message: errorText(data, WRONG_CODE_MESSAGE) }; // الرمز غير صحيح
    }

    saveSession(session); // حفظ الجلسة في المتصفح
    await syncMyThread(session.email); // مزامنة بيانات My Thread مع الخادم
    return { ok: true, session }; // تم تسجيل الدخول
  } catch {
    return { ok: false, message: SERVER_DOWN_MESSAGE }; // تعذر الوصول إلى الخادم
  }
}

export async function syncSession(): Promise<void> {
  if (!USES_BACKEND) {
    return; // لا حاجة للمزامنة في الوضع التجريبي
  }

  const controller = new AbortController(); // لإلغاء الطلب إذا تأخر
  const timer = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS); // إلغاء بعد 3 ثوانٍ

  try {
    // سؤال الخادم: من هو المستخدم المسجل دخوله؟
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (response.status === 401) {
      clearSession(); // الجلسة انتهت في الخادم، نحذفها من المتصفح
      return;
    }

    if (response.ok) {
      const data: unknown = await response.json(); // قراءة بيانات المستخدم
      const session =
        data && typeof data === "object" ? toSession(data as Record<string, unknown>) : null;

      if (session) {
        saveSession(session); // تحديث الجلسة بأحدث البيانات من الخادم
      }
    }
  } catch {
    // تجاهل الخطأ والإبقاء على الجلسة الحالية
  } finally {
    window.clearTimeout(timer); // إيقاف مؤقت الإلغاء
  }
}

export async function requestLoginCode(email: string): Promise<CodeRequestResult> {
  if (USES_BACKEND) {
    try {
      // طلب إرسال رمز تسجيل الدخول إلى البريد
      const { status, data } = await postJson("/auth/login", { email: normalizeEmail(email) });

      if (status === 200) {
        return { ok: true }; // تم إرسال الرمز
      }

      if (status === 404) {
        return { ok: false, reason: "no-account" }; // لا يوجد حساب بهذا البريد
      }

      if (status === 403) {
        return { ok: false, reason: "suspended" }; // الحساب موقوف من قبل المدير
      }

      return { ok: false, reason: "error", message: errorText(data, SERVER_DOWN_MESSAGE) }; // خطأ آخر
    } catch {
      return { ok: false, reason: "error", message: SERVER_DOWN_MESSAGE }; // تعذر الوصول إلى الخادم
    }
  }

  await wait(DEMO_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار
  
  if (!findAccount(email)) {
    return { ok: false, reason: "no-account" }; // الحساب غير موجود
  }

  if (isAccountSuspended(email)) {
    return { ok: false, reason: "suspended" }; // الحساب موقوف
  }

  return { ok: true }; // "تم إرسال" الرمز (لا يُرسل بريد فعلي في الوضع التجريبي)
}

export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  if (USES_BACKEND) {
    return verifyWithBackend(email, code); // التحقق من الرمز عبر الخادم
  }

  await wait(DEMO_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار

  const account = findAccount(email); // البحث عن الحساب

  if (account && isAccountSuspended(account.email)) {
    return { ok: false, message: SUSPENDED_MESSAGE }; // الحساب موقوف
  }

  if (!account || !isValidDemoCode(code)) {
    return { ok: false, message: WRONG_CODE_MESSAGE }; // الحساب غير موجود أو الرمز غير صالح
  }

  saveSession(account); // حفظ الجلسة
  return { ok: true, session: account }; // تم تسجيل الدخول
}

export async function requestSignUpCode(
  email: string,
  fullName = "",
): Promise<CodeRequestResult> {
  if (USES_BACKEND) {
    try {
      // إنشاء الحساب وطلب إرسال رمز التحقق
      const { status, data } = await postJson("/auth/signup", {
        fullName: fullName.trim(),
        email: normalizeEmail(email),
        accountType: "user", // التسجيل العام ينشئ حساب مستخدم عادي فقط
      });

      if (status === 201) {
        return { ok: true }; // تم إنشاء الحساب وإرسال الرمز
      }

      if (status === 409) {
        return { ok: false, reason: "exists" }; // البريد مسجل مسبقاً
      }

      return { ok: false, reason: "error", message: errorText(data, SERVER_DOWN_MESSAGE) }; // خطأ آخر
    } catch {
      return { ok: false, reason: "error", message: SERVER_DOWN_MESSAGE }; // تعذر الوصول إلى الخادم
    }
  }

  await wait(DEMO_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار
  return findAccount(email) ? { ok: false, reason: "exists" } : { ok: true }; // رفض البريد المكرر
}

export async function verifySignUpCode(
  fullName: string,
  email: string,
  code: string,
): Promise<VerifyResult> {
  if (USES_BACKEND) {
    return verifyWithBackend(email, code); // نفس مسار التحقق المستخدم في تسجيل الدخول
  }

  await wait(DEMO_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار

  if (!isValidDemoCode(code)) {
    return { ok: false, message: WRONG_CODE_MESSAGE }; // الرمز غير صالح
  }

  // إنشاء الحساب التجريبي الجديد
  const account: DemoSession = {
    fullName: fullName.trim(),
    email: normalizeEmail(email),
    accountType: "user",
  };

  saveAccount(account); // حفظ الحساب
  saveSession(account); // تسجيل دخول المستخدم مباشرة

  return { ok: true, session: account };
}

export async function updateFullName(email: string, fullName: string): Promise<DemoSession> {
  if (USES_BACKEND) {
    let answer: ApiAnswer; // رد الخادم

    try {
      // إرسال الاسم الجديد إلى الخادم
      answer = await sendJson("PATCH", "/auth/me", { fullName: fullName.trim() });
    } catch {
      throw new Error(SERVER_DOWN_MESSAGE); // تعذر الوصول إلى الخادم
    }

    const session = answer.status === 200 ? toSession(answer.data) : null; // بيانات المستخدم بعد التعديل

    if (!session) {
      throw new Error(errorText(answer.data, SAVE_NAME_FAILED_MESSAGE)); // فشل الحفظ مع رسالة الخادم
    }

    saveSession(session); // تحديث الجلسة ليظهر الاسم الجديد مباشرة
    return session;
  }

  await wait(DEMO_SAVE_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار

  const current = findAccount(email); // الحساب الحالي
  const account: DemoSession = {
    fullName: fullName.trim(), // الاسم الجديد
    email: normalizeEmail(email),
    accountType: current?.accountType ?? "user", // الإبقاء على نوع الحساب
  };

  saveAccount(account); // حفظ الحساب بعد التعديل
  saveSession(account); // تحديث الجلسة

  return account;
}

export async function deleteAccount(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email); // توحيد شكل البريد

  if (USES_BACKEND) {
    let answer: ApiAnswer; // رد الخادم

    try {
      answer = await sendJson("DELETE", "/auth/me"); // طلب حذف الحساب من الخادم
    } catch {
      throw new Error(SERVER_DOWN_MESSAGE); // تعذر الوصول إلى الخادم
    }

    if (answer.status !== 204) {
      throw new Error(errorText(answer.data, DELETE_FAILED_MESSAGE)); // فشل الحذف
    }

    try {
      // حذف بيانات My Thread الخاصة بالمستخدم من المتصفح
      window.localStorage.removeItem(`${MY_THREAD_STORAGE_PREFIX}${normalizedEmail}`);
    } catch {
      // تجاهل الخطأ إذا كان التخزين غير متاح
    }

    signOut(); // تسجيل الخروج بعد الحذف
    return;
  }

  await wait(DEMO_DELAY_MS); // الوضع التجريبي: محاكاة الانتظار

  if (normalizedEmail === DEMO_ADMIN_EMAIL) {
    return; // لا يمكن حذف حساب المدير التجريبي
  }

  // حذف الحساب من قائمة الحسابات المحفوظة
  writeSavedAccounts(
    readSavedAccounts().filter((account) => account.email !== normalizedEmail),
  );

  try {
    // حذف بيانات My Thread الخاصة بالمستخدم من المتصفح
    window.localStorage.removeItem(`${MY_THREAD_STORAGE_PREFIX}${normalizedEmail}`);
  } catch {
    // تجاهل الخطأ إذا كان التخزين غير متاح
  }

  signOut(); // تسجيل الخروج بعد الحذف
}