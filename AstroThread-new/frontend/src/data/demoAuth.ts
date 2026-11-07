export type AccountType = "user" | "admin";

export interface DemoSession {
  fullName: string;
  email: string;
  accountType: AccountType;
}

interface DemoAccount extends DemoSession {
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  accountType: AccountType;
  invitationCode?: string;
}

type SignUpErrorField = "email" | "invitationCode";

export type SignInResult =
  | { ok: true; session: DemoSession }
  | { ok: false; message: string };

export type SignUpResult =
  | { ok: true; session: DemoSession }
  | { ok: false; field: SignUpErrorField; message: string };

export const DEMO_ADMIN_INVITATION_CODE = "ASTRO-ADMIN-2026";

export const demoCredentials = [
  {
    accountType: "user",
    email: "user@astrothread.dev",
    password: "Explore2026",
  },
  {
    accountType: "admin",
    email: "admin@astrothread.dev",
    password: "Admin2026",
  },
] as const;

const SESSION_STORAGE_KEY = "astrothread-demo-session";
const DEMO_DELAY_MS = 900;

const demoAccounts: DemoAccount[] = [
  {
    fullName: "Sara Alharbi",
    email: demoCredentials[0].email,
    password: demoCredentials[0].password,
    accountType: "user",
  },
  {
    fullName: "AstroThread Admin",
    email: demoCredentials[1].email,
    password: demoCredentials[1].password,
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

function findAccount(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return demoAccounts.find((account) => account.email === normalizedEmail);
}

function toSession(account: DemoAccount): DemoSession {
  return {
    fullName: account.fullName,
    email: account.email,
    accountType: account.accountType,
  };
}

function saveSession(session: DemoSession, rememberMe: boolean) {
  try {
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

    otherStorage.removeItem(SESSION_STORAGE_KEY);
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in private browsing; the demo still continues.
  }
}

export async function demoSignIn({
  email,
  password,
  rememberMe,
}: SignInInput): Promise<SignInResult> {
  await wait(DEMO_DELAY_MS);

  const account = findAccount(email);

  if (!account || account.password !== password) {
    return {
      ok: false,
      message: "The email or password is incorrect. Check them and try again.",
    };
  }

  const session = toSession(account);
  saveSession(session, rememberMe);

  return { ok: true, session };
}

export async function demoSignUp({
  fullName,
  email,
  password,
  accountType,
  invitationCode = "",
}: SignUpInput): Promise<SignUpResult> {
  await wait(DEMO_DELAY_MS);

  if (findAccount(email)) {
    return {
      ok: false,
      field: "email",
      message: "An account with this email already exists. Sign in instead.",
    };
  }

  if (
    accountType === "admin" &&
    invitationCode.trim().toUpperCase() !== DEMO_ADMIN_INVITATION_CODE
  ) {
    return {
      ok: false,
      field: "invitationCode",
      message: "This invitation code isn’t valid. Check it and try again.",
    };
  }

  const account: DemoAccount = {
    fullName: fullName.trim(),
    email: normalizeEmail(email),
    password,
    accountType,
  };

  demoAccounts.push(account);

  return { ok: true, session: toSession(account) };
}

export function getAccountTypeLabel(accountType: AccountType) {
  return accountType === "admin" ? "Admin" : "User";
}

export function parseAccountType(value: string | null): AccountType {
  return value === "admin" ? "admin" : "user";
}