import { isAccountSuspended } from "./demoAdmin";

export type AccountType = "user" | "admin";

export interface DemoSession {
  fullName: string;
  email: string;
  accountType: AccountType;
}

export type CodeRequestResult =
  | { ok: true }
  | { ok: false; reason: "no-account" | "exists" | "suspended" };

export type VerifyResult =
  | { ok: true; session: DemoSession }
  | { ok: false; message: string };

export const DEMO_ADMIN_EMAIL = "admin@astrothread.demo";
export const LOGIN_CODE_LENGTH = 6;

const ACCOUNTS_STORAGE_KEY = "astrothread-demo-accounts";
const SESSION_STORAGE_KEY = "astrothread-demo-session";
// Same prefix as data/myThread.ts: each account's My Thread is stored under it.
const MY_THREAD_STORAGE_PREFIX = "astrothread-my-thread:";
const DEMO_DELAY_MS = 700;
const DEMO_SAVE_DELAY_MS = 400;

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
  // Saved accounts come first so an edited name replaces the built-in one.
  return [...readSavedAccounts(), ...builtInAccounts].find(
    (account) => account.email === normalizedEmail,
  );
}

// Every account in this browser, each email once. Used by the Admin dashboard.
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
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
  }
}

function isValidDemoCode(code: string) {
  return new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(code.trim());
}

const WRONG_CODE_MESSAGE = "This code is incorrect or has expired. Check it, or send a new code.";
export const SUSPENDED_MESSAGE =
  "This account is suspended. Contact the AstroThread team for help.";

export async function requestLoginCode(email: string): Promise<CodeRequestResult> {
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

export async function requestSignUpCode(email: string): Promise<CodeRequestResult> {
  await wait(DEMO_DELAY_MS);
  return findAccount(email) ? { ok: false, reason: "exists" } : { ok: true };
}

export async function verifySignUpCode(
  fullName: string,
  email: string,
  code: string,
): Promise<VerifyResult> {
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