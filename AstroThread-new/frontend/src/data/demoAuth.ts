export type AccountType = "user" | "admin";

export interface DemoSession {
  fullName: string;
  email: string;
  accountType: AccountType;
}

export type CodeRequestResult =
  | { ok: true }
  | { ok: false; reason: "no-account" | "exists" };

export type VerifyResult =
  | { ok: true; session: DemoSession }
  | { ok: false; message: string };

export const DEMO_ADMIN_EMAIL = "admin@astrothread.demo";
export const LOGIN_CODE_LENGTH = 6;

const ACCOUNTS_STORAGE_KEY = "astrothread-demo-accounts";
const SESSION_STORAGE_KEY = "astrothread-demo-session";
const DEMO_DELAY_MS = 700;

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

function saveAccount(account: DemoSession) {
  try {
    const accounts = readSavedAccounts().filter((item) => item.email !== account.email);
    window.localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify([...accounts, account]),
    );
  } catch {
  }
}

function findAccount(email: string): DemoSession | undefined {
  const normalizedEmail = normalizeEmail(email);
  return [...builtInAccounts, ...readSavedAccounts()].find(
    (account) => account.email === normalizedEmail,
  );
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
      return parsed as DemoSession;
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

export async function requestLoginCode(email: string): Promise<CodeRequestResult> {
  await wait(DEMO_DELAY_MS);
  return findAccount(email) ? { ok: true } : { ok: false, reason: "no-account" };
}

export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  await wait(DEMO_DELAY_MS);

  const account = findAccount(email);

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