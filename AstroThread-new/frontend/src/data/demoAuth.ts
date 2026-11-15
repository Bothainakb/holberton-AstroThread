import { isAccountSuspended } from "./demoAdmin";
import { apiBaseUrl, searchSource } from "../services/search/searchService";
import { forgetMyThread, syncMyThread } from "./myThread";

export type AccountType = "user" | "admin";

export interface DemoSession {
  fullName: string;
  email: string;
  accountType: AccountType;
}

export type CodeRequestResult =
  | { ok: true }
  | { ok: false; reason: "no-account" | "exists" | "suspended" }
  | { ok: false; reason: "error"; message: string };

export type VerifyResult =
  | { ok: true; session: DemoSession }
  | { ok: false; message: string };

export const DEMO_ADMIN_EMAIL = "admin@astrothread.demo";
export const LOGIN_CODE_LENGTH = 6;

const USES_BACKEND = searchSource === "api";

export const IS_DEMO_AUTH = !USES_BACKEND;

const ACCOUNTS_STORAGE_KEY = "astrothread-demo-accounts";
const SESSION_STORAGE_KEY = "astrothread-demo-session";
const MY_THREAD_STORAGE_PREFIX = "astrothread-my-thread:";
const DEMO_DELAY_MS = 700;
const DEMO_SAVE_DELAY_MS = 400;
const SESSION_CHECK_TIMEOUT_MS = 3000;

const WRONG_CODE_MESSAGE = "This code is incorrect or has expired. Check it, or send a new code.";
const SERVER_DOWN_MESSAGE = "We couldn’t reach AstroThread. Check your connection and try again.";

const builtInAccounts: DemoSession[] = [
  {
    fullName: "AstroThread Admin",
    email: DEMO_ADMIN_EMAIL,
    accountType: "admin",
  },
];

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readSavedAccounts(): DemoSession[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DemoSession[]) : [];
  } catch {
    return [];
  }
}

function writeSavedAccounts(accounts: DemoSession[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
  }
}

function saveAccount(account: DemoSession) {
  const accounts = readSavedAccounts().filter((item) => item.email !== account.email);
  writeSavedAccounts([...accounts, account]);
}

function findAccount(email: string): DemoSession | undefined {
  const normalizedEmail = normalizeEmail(email);
  return [...readSavedAccounts(), ...builtInAccounts].find(
    (account) => account.email === normalizedEmail,
  );
}

export function getAccounts(): DemoSession[] {
  const accounts: DemoSession[] = [];

  [...readSavedAccounts(), ...builtInAccounts].forEach((account) => {
    if (!accounts.some((item) => item.email === account.email)) {
      accounts.push(account);
    }
  });

  return accounts;
}

function saveSession(session: DemoSession) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
  }
}

export function getCurrentSession(): DemoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (
      parsed &&
      typeof parsed === "object" &&
      "email" in parsed &&
      "fullName" in parsed
    ) {
      const session = parsed as DemoSession;
      // A suspended account is signed out, like an expired token.
      return isAccountSuspended(session.email) ? null : session;
    }

    return null;
  } catch {
    return null;
  }
}

export function signOut() {
  const session = getCurrentSession();
  clearSession();

  if (session) {
    forgetMyThread(session.email);
  }

  if (USES_BACKEND) {
    fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", keepalive: true }).catch(() => {
    });
  }
}

function isValidDemoCode(code: string) {
  return new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(code.trim());
}

export const SUSPENDED_MESSAGE =
  "This account is suspended. Contact the AstroThread team for help.";

interface ApiAnswer {
  status: number;
  data: Record<string, unknown>;
}

async function postJson(path: string, body: unknown): Promise<ApiAnswer> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);

  return {
    status: response.status,
    data: data && typeof data === "object" ? (data as Record<string, unknown>) : {},
  };
}

function errorText(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

function toSession(data: Record<string, unknown>): DemoSession | null {
  const { fullName, email, accountType } = data;

  if (typeof fullName !== "string" || typeof email !== "string") {
    return null;
  }

  return { fullName, email, accountType: accountType === "admin" ? "admin" : "user" };
}

async function verifyWithBackend(email: string, code: string): Promise<VerifyResult> {
  try {
    const { status, data } = await postJson("/auth/verify", {
      email: normalizeEmail(email),
      code: code.trim(),
    });
    const session = status === 200 ? toSession(data) : null;

    if (!session) {
      return { ok: false, message: errorText(data, WRONG_CODE_MESSAGE) };
    }

    saveSession(session);
    await syncMyThread(session.email);
    return { ok: true, session };
  } catch {
    return { ok: false, message: SERVER_DOWN_MESSAGE };
  }
}

export async function syncSession(): Promise<void> {
  if (!USES_BACKEND) {
    return;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (response.status === 401) {
      clearSession();
      return;
    }

    if (response.ok) {
      const data: unknown = await response.json();
      const session =
        data && typeof data === "object" ? toSession(data as Record<string, unknown>) : null;

      if (session) {
        saveSession(session);
      }
    }
  } catch {
  } finally {
    window.clearTimeout(timer);
  }
}

export async function requestLoginCode(email: string): Promise<CodeRequestResult> {
  if (USES_BACKEND) {
    try {
      const { status, data } = await postJson("/auth/login", { email: normalizeEmail(email) });

      if (status === 200) {
        return { ok: true };
      }

      if (status === 404) {
        return { ok: false, reason: "no-account" };
      }

      return { ok: false, reason: "error", message: errorText(data, SERVER_DOWN_MESSAGE) };
    } catch {
      return { ok: false, reason: "error", message: SERVER_DOWN_MESSAGE };
    }
  }

  await wait(DEMO_DELAY_MS);

  if (!findAccount(email)) {
    return { ok: false, reason: "no-account" };
  }

  if (isAccountSuspended(email)) {
    return { ok: false, reason: "suspended" };
  }

  return { ok: true };
}

export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  if (USES_BACKEND) {
    return verifyWithBackend(email, code);
  }

  await wait(DEMO_DELAY_MS);

  const account = findAccount(email);

  if (account && isAccountSuspended(account.email)) {
    return { ok: false, message: SUSPENDED_MESSAGE };
  }

  if (!account || !isValidDemoCode(code)) {
    return { ok: false, message: WRONG_CODE_MESSAGE };
  }

  saveSession(account);
  return { ok: true, session: account };
}

export async function requestSignUpCode(
  email: string,
  fullName = "",
): Promise<CodeRequestResult> {
  if (USES_BACKEND) {
    try {
      const { status, data } = await postJson("/auth/signup", {
        fullName: fullName.trim(),
        email: normalizeEmail(email),
        accountType: "user",
      });

      if (status === 201) {
        return { ok: true };
      }

      if (status === 409) {
        return { ok: false, reason: "exists" };
      }

      return { ok: false, reason: "error", message: errorText(data, SERVER_DOWN_MESSAGE) };
    } catch {
      return { ok: false, reason: "error", message: SERVER_DOWN_MESSAGE };
    }
  }

  await wait(DEMO_DELAY_MS);
  return findAccount(email) ? { ok: false, reason: "exists" } : { ok: true };
}

export async function verifySignUpCode(
  fullName: string,
  email: string,
  code: string,
): Promise<VerifyResult> {
  if (USES_BACKEND) {
    return verifyWithBackend(email, code);
  }

  await wait(DEMO_DELAY_MS);

  if (!isValidDemoCode(code)) {
    return { ok: false, message: WRONG_CODE_MESSAGE };
  }

  const account: DemoSession = {
    fullName: fullName.trim(),
    email: normalizeEmail(email),
    accountType: "user",
  };

  saveAccount(account);
  saveSession(account);

  return { ok: true, session: account };
}

export async function updateFullName(email: string, fullName: string): Promise<DemoSession> {
  await wait(DEMO_SAVE_DELAY_MS);

  const current = findAccount(email);
  const account: DemoSession = {
    fullName: fullName.trim(),
    email: normalizeEmail(email),
    accountType: current?.accountType ?? "user",
  };

  saveAccount(account);
  saveSession(account);

  return account;
}

export async function deleteAccount(email: string): Promise<void> {
  await wait(DEMO_DELAY_MS);

  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === DEMO_ADMIN_EMAIL) {
    return;
  }

  writeSavedAccounts(
    readSavedAccounts().filter((account) => account.email !== normalizedEmail),
  );

  try {
    window.localStorage.removeItem(`${MY_THREAD_STORAGE_PREFIX}${normalizedEmail}`);
  } catch {
  }

  signOut();
}